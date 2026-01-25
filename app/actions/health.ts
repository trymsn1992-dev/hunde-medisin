"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createHealthLog(data: {
    dogId: string
    date: string
    isPlayful: boolean
    wantsWalk: boolean
    hungryLevel: string
    isThirsty: boolean
    stressedLevel: string
    sleepLevel: string
    stool: string | null
    coneUsage: string
    bootUsage: string
    cageUsage: string
    itchLocations: string[]
    notes: string
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: "Unauthorized" }
    }

    try {
        // Upsert based on dog_id + date to prevent duplicate daily logs?
        // For now, let's just insert. User might log morning and evening.
        // Actually, simple insert is safer for multiple logs.

        const { error } = await supabase
            .from('health_logs')
            .insert({
                dog_id: data.dogId,
                date: data.date,
                is_playful: data.isPlayful,
                wants_walk: data.wantsWalk,
                hungry_level: data.hungryLevel,
                is_thirsty: data.isThirsty,
                stressed_level: data.stressedLevel,
                sleep_level: data.sleepLevel,
                stool: data.stool,
                cone_usage: data.coneUsage,
                boot_usage: data.bootUsage,
                cage_usage: data.cageUsage,
                itch_locations: data.itchLocations,
                notes: data.notes
            })

        if (error) throw error

        revalidatePath(`/dog/${data.dogId}`)
        return { success: true }

    } catch (error: any) {
        console.error("Create Health Log Error:", error)
        // Check if it's a Supabase error (has message/details) or standard Error
        const msg = error?.message || error?.details || (typeof error === 'string' ? error : "Failed to save log")
        return { success: false, error: msg }
    }
}

export async function getHealthLogs(dogId: string, startDate?: string, endDate?: string) {
    const supabase = await createClient()

    let query = supabase
        .from('health_logs')
        .select('*')
        .eq('dog_id', dogId)
        .order('created_at', { ascending: false })

    if (startDate) {
        query = query.gte('date', startDate)
    }
    if (endDate) {
        query = query.lte('date', endDate)
    }

    const { data, error } = await query

    if (error) {
        console.error("Get Health Logs Error:", error)
        return []
    }

    return data
}
export async function deleteHealthLog(logId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: "Unauthorized" }
    }

    try {
        const { error } = await supabase
            .from('health_logs')
            .delete()
            .eq('id', logId)

        if (error) throw error

        return { success: true }
    } catch (error: unknown) {
        console.error("Delete Health Log Error:", error)
        return { success: false, error: error instanceof Error ? error.message : "Failed to delete log" }
    }
}
