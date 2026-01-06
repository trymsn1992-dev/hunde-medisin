"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createMedicine(data: {
    dogId: string
    name: string
    strength: string
    notes: string
    startDate: string
    duration: string // "7" or empty
    doseText: string
    times: string[]
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    try {
        // 1. Create Medicine
        const { data: med, error: medError } = await supabase
            .from('medicines')
            .insert({
                dog_id: data.dogId,
                name: data.name,
                strength: data.strength,
                notes: data.notes
            })
            .select()
            .single()

        if (medError) throw medError

        // Calculate dates
        const start = new Date(data.startDate)
        let endDate = null

        if (data.duration) {
            const days = parseInt(data.duration)
            if (!isNaN(days) && days > 0) {
                const end = new Date(start)
                end.setDate(end.getDate() + days)
                endDate = end.toISOString()
            }
        }

        // 2. Create Plan
        const { data: plan, error: planError } = await supabase
            .from('medication_plans')
            .insert({
                medicine_id: med.id,
                start_date: start.toISOString(),
                end_date: endDate,
                frequency_type: 'daily_times',
                schedule_times: data.times,
                dose_text: data.doseText,
                active: true
            })
            .select()
            .single()

        if (planError) throw planError

        // 3. Backfill logs if start date is in the past
        const now = new Date()
        const todayStart = new Date(now)
        todayStart.setHours(0, 0, 0, 0)
        // Reset "now" to compare strictly by time (or keep it real time)
        // Logic: Iterate from start date up to NOW.

        // Clone start date to iterate
        const current = new Date(start)
        current.setHours(0, 0, 0, 0) // Start of the start day

        const logsToInsert = []

        // While current day <= today (ignoring time for the loop condition, checking time inside)
        while (current < todayStart) {
            // const dateStr = current.toISOString().split('T')[0] // Unused

            for (const time of data.times) {
                const [hours, minutes] = time.split(':').map(Number)

                // Construct the specific dose timestamp
                const doseTime = new Date(current)
                doseTime.setHours(hours, minutes, 0, 0)

                // Only log if this specific time is in the past and >= start date proper
                // (start date might have been "today" but earlier? No, input is just YYYY-MM-DD)
                // If input start date is YYYY-MM-DD, we assume it starts from beginning of that day effectively?
                // Or should we assume if I verify "Started today" and it's 12:00, and I have an 08:00 dose, it should be marked taken? Yes.

                if (doseTime < now && doseTime >= start) {
                    logsToInsert.push({
                        plan_id: plan.id,
                        medicine_id: med.id,
                        dog_id: data.dogId,
                        taken_at: doseTime.toISOString(),
                        taken_by: user.id,
                        status: 'taken',
                        notes: 'Auto-logged from past start date'
                    })
                }
            }

            // Next day
            current.setDate(current.getDate() + 1)
        }

        if (logsToInsert.length > 0) {
            const { error: logError } = await supabase
                .from('dose_logs')
                .insert(logsToInsert)

            if (logError) console.error("Backfill Error:", logError)
        }

        revalidatePath('/', 'layout')
        return { success: true, id: med.id }

    } catch (error: unknown) {
        console.error("Create Medicine Error:", error)
        const message = error instanceof Error ? error.message : "Failed to create medicine"
        return { success: false, error: message }
    }
}

export async function deleteMedicine(id: string) {
    const supabase = await createClient()

    // Verify auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        throw new Error("Unauthorized")
    }

    try {
        // 1. Delete associated logs explicitly (since schema is ON DELETE SET NULL)
        const { error: logsError } = await supabase
            .from('dose_logs')
            .delete()
            .eq('medicine_id', id)

        if (logsError) {
            console.error("Error deleting logs:", logsError)
            throw logsError
        }

        // 2. Delete the medicine (cascades to plans)
        const { error } = await supabase
            .from('medicines')
            .delete()
            .eq('id', id)

        if (error) {
            console.error("Supabase Delete Error:", error)
            return { success: false, error: error.message || error.details || "Database error" }
        }

        revalidatePath('/', 'layout')
        return { success: true }
    } catch (error: unknown) {
        console.error("Delete Action Error:", error)
        const message = error instanceof Error ? error.message : "Failed to delete medicine"
        return { success: false, error: message }
    }
}

export async function pauseMedicine(medicineId: string, pauseDate: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    try {
        // Find the active plan for this medicine
        // We assume 1 active plan per medicine for V1
        const { data: plan, error: findError } = await supabase
            .from('medication_plans')
            .select('*')
            .eq('medicine_id', medicineId)
            .eq('active', true)
            .single()

        if (findError || !plan) {
            // Already paused or no plan?
            // If no active plan, check if there is a plan that is effectively "active" but we need to pause it?
            // "Active" flag is the primary indicator.
            return { success: false, error: "No active plan found to pause" }
        }

        const { error: updateError } = await supabase
            .from('medication_plans')
            .update({
                active: false,
                paused_at: pauseDate
            })
            .eq('id', plan.id)

        if (updateError) throw updateError

        revalidatePath('/', 'layout')
        return { success: true }
    } catch (error: unknown) {
        console.error("Pause Error:", error)
        return { success: false, error: "Failed to pause medicine" }
    }
}

export async function resumeMedicine(medicineId: string, mode: 'remaining' | 'new') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    try {
        // Find the paused plan (active=false, paused_at not null)
        // We'll sort by created_at desc to get the latest one just in case
        const { data: plan, error: findError } = await supabase
            .from('medication_plans')
            .select('*')
            .eq('medicine_id', medicineId)
            .eq('active', false)
            .not('paused_at', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

        if (findError || !plan) {
            return { success: false, error: "No paused plan found to resume" }
        }

        if (mode === 'new') {
            // "New Plan" - User might likely be redirected to edit page on client side.
            // But if they just want to "Unpause" and clear the schedule/reset dates efficiently?
            // Actually, based on requirements, "New Plan" implies changing params.
            // For this action, if called with 'new', we might just reactivate it starting NOW, keeping same frequency?
            // Or maybe 'new' implies "Start fresh track from today, ignore past duration".

            // Let's implement: Active=True, Start=Now, End=Null (Continuous) OR user edits it.
            // Requirement: "begynne med en annen plan" -> This sounds like "Edit".
            // So this action might not even be called for 'new', instead client redirects to /edit.
            // However, providing a basic "Restart" logic here:

            const now = new Date()
            const { error: updateError } = await supabase
                .from('medication_plans')
                .update({
                    active: true,
                    paused_at: null,
                    start_date: now.toISOString(),
                    // If we resume as "new", do we keep the old end date? Probably invalid.
                    // Let's clear end date to make it continuous unless user edits it.
                    end_date: null
                })
                .eq('id', plan.id)

            if (updateError) throw updateError

        } else if (mode === 'remaining') {
            // Calculate remaining duration
            if (!plan.end_date || !plan.paused_at) {
                // Should not happen for 'remaining' logic if no end date existed.
                // If it was infinite, we just resume infinite.
                const now = new Date()
                const { error: updateError } = await supabase
                    .from('medication_plans')
                    .update({
                        active: true,
                        paused_at: null,
                        start_date: now.toISOString()
                    })
                    .eq('id', plan.id)
                if (updateError) throw updateError
            } else {
                const endDate = new Date(plan.end_date)
                const pausedAt = new Date(plan.paused_at)

                // Diff in milliseconds
                const remainingMs = endDate.getTime() - pausedAt.getTime()

                // If negative (expired while paused?), treat as 0 or just extend? 
                // Usually logic implies shifting the remaining block.
                const safeRemaining = Math.max(0, remainingMs)

                const newStart = new Date()
                const newEnd = new Date(newStart.getTime() + safeRemaining)

                const { error: updateError } = await supabase
                    .from('medication_plans')
                    .update({
                        active: true,
                        paused_at: null,
                        start_date: newStart.toISOString(),
                        end_date: newEnd.toISOString()
                    })
                    .eq('id', plan.id)

                if (updateError) throw updateError
            }
        }

        revalidatePath('/', 'layout')
        return { success: true }
    } catch (error: unknown) {
        console.error("Resume Error:", error)
        return { success: false, error: "Failed to resume medicine" }
    }
}
