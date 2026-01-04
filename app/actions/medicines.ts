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
            // We continue to try deleting the medicine even if logs fail? 
            // Ideally we should probably throw/return error, but maybe user just wants it gone.
            // Let's be safe and stop if logs fail to ensure consistency? 
            // actually if logs fail, we shouldn't delete the medicine ideally.
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
