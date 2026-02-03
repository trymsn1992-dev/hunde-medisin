"use server"

import { createAdminClient } from "@/lib/supabase/admin"

export async function getGlobalStats() {
    const supabase = createAdminClient()

    try {
        // 1. Total Users
        // Note: 'profiles' is the public table for users. 'auth.users' is private/admin only usually, 
        // but row count on profiles is a good proxy if every user has a profile.
        const { count: userCount, error: userError } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })

        // 2. Total Dogs
        const { count: dogCount, error: dogError } = await supabase
            .from('dogs')
            .select('*', { count: 'exact', head: true })

        // 3. Total Medicines
        const { count: medCount, error: medError } = await supabase
            .from('medicines')
            .select('*', { count: 'exact', head: true })

        // 4. Total Doses Logged
        const { count: logCount, error: logError } = await supabase
            .from('dose_logs')
            .select('*', { count: 'exact', head: true })

        if (userError || dogError || medError || logError) {
            console.error("Analytics Stats Error:", { userError, dogError, medError, logError })
        }

        return {
            users: userCount || 0,
            dogs: dogCount || 0,
            medicines: medCount || 0,
            doses: logCount || 0
        }

    } catch (e) {
        console.error("Analytics Error:", e)
        return { users: 0, dogs: 0, medicines: 0, doses: 0 }
    }
}

export async function getLast30DaysActivity() {
    const supabase = createAdminClient()

    // Calculate date 30 days ago
    const date = new Date()
    date.setDate(date.getDate() - 30)
    const thirtyDaysAgo = date.toISOString()

    try {
        const { data, error } = await supabase
            .from('dose_logs')
            .select('taken_at')
            .gte('taken_at', thirtyDaysAgo)
            .order('taken_at', { ascending: true })

        if (error) throw error

        // Aggregation in JS for simplicity (Supabase/Postgrest simple counts typically require aggregation functions or RPC)
        const dailyCounts: Record<string, number> = {}

        // Initialize last 30 days with 0
        for (let i = 0; i < 30; i++) {
            const d = new Date()
            d.setDate(d.getDate() - i)
            const dateStr = d.toISOString().split('T')[0]
            dailyCounts[dateStr] = 0
        }

        data?.forEach(log => {
            if (log.taken_at) {
                const day = log.taken_at.split('T')[0]
                if (dailyCounts[day] !== undefined) {
                    dailyCounts[day]++
                } else if (day >= thirtyDaysAgo.split('T')[0]) {
                    // Ensure newer days (today) are caught if loop logic missed a timezone edge case
                    if (!dailyCounts[day]) dailyCounts[day] = 0
                    dailyCounts[day]++
                }
            }
        })

        // Format for chart: array of { date, count } sorted by date
        const chartData = Object.entries(dailyCounts)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date))

        return chartData

    } catch (e) {
        console.error("Activity Analytics Error:", e)
        return []
    }
}
