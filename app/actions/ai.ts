"use server"

import { createClient } from "@/lib/supabase/server"
import { OpenAI } from "openai"
import { startOfWeek, format } from "date-fns"

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export async function getWeeklyHealthSummary(dogId: string) {
    const supabase = await createClient()

    // Calculate start of current week (Monday)
    const today = new Date()
    const weekStart = startOfWeek(today, { weekStartsOn: 1 }) // Monday start
    const weekStartStr = format(weekStart, 'yyyy-MM-dd')

    // 1. Check Cache
    const { data: cached } = await supabase
        .from('health_summaries')
        .select('summary_text')
        .eq('dog_id', dogId)
        .eq('week_start_date', weekStartStr)
        .single()

    if (cached) {
        return { success: true, text: cached.summary_text, cached: true }
    }

    // 2. Fetch Data if no cache
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 7)

    // Fetch Logs
    const { data: doseLogs } = await supabase
        .from('dose_logs')
        .select(`taken_at, status, medicine:medicines(name)`)
        .eq('dog_id', dogId)
        .gte('taken_at', startDate.toISOString())
        .lte('taken_at', endDate.toISOString())

    const { data: healthLogs } = await supabase
        .from('health_logs')
        .select('*')
        .eq('dog_id', dogId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])

    // Format Data
    const totalDoses = doseLogs?.length || 0
    const missedDoses = doseLogs?.filter(d => d.status === 'missed').length || 0

    const healthIssues = healthLogs?.flatMap(h => {
        const issues = []
        if (h.stool && h.stool !== 'Normal') issues.push(`Avføring: ${h.stool} (${h.date})`)
        if (h.itch_locations && h.itch_locations.length > 0) issues.push(`Kløe: ${h.itch_locations.join(', ')} (${h.date})`)
        if (!h.is_playful) issues.push(`Nedsatt energinivå (${h.date})`)
        if (!h.wants_walk) issues.push(`Ville ikke gå tur (${h.date})`)
        if (!h.is_hungry) issues.push(`Nedsatt matlyst (${h.date})`)
        if (h.notes) issues.push(`Notat (${h.date}): ${h.notes}`)
        return issues
    }) || []

    // Direct Prompt
    const prompt = `
    Analyze the last 7 days of health data for the dog.
    
    Data:
    - Total doses: ${totalDoses}
    - Missed doses: ${missedDoses}
    - Logs Report: ${healthIssues.length > 0 ? healthIssues.join('; ') : "Ingen registrerte avvik"}
    
    Task:
    Provide a clinical, concise weekly summary in Norwegian (Bokmål).
    - Style: Direct, objective, bullet points permitted but keep it coherent. No "Hei der" or "Voff". No emojis.
    - Structure:
      1. Overall Status (1 sentence: Stabil/Improving/Needs Attention)
      2. Observations (List key issues or "None")
      3. Action Plan (If issues exist, briefly allow suggestion, otherwise "Continue current regimen")
    - Keep it short.
  `

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are a veterinary logging assistant. Be direct, concise, and clinical." },
                { role: "user", content: prompt }
            ],
            max_tokens: 200,
        })

        const text = response.choices[0].message.content

        if (text) {
            // Save to Cache
            // We use upsert to be safe against race conditions, though unique constraint handles it
            await supabase.from('health_summaries').upsert({
                dog_id: dogId,
                week_start_date: weekStartStr,
                summary_text: text
            }, { onConflict: 'dog_id, week_start_date' })
        }

        return { success: true, text, cached: false }
    } catch (error) {
        console.error("OpenAI Error:", error)
        return { success: false, error: "Kunne ikke generere rapport." }
    }
}
