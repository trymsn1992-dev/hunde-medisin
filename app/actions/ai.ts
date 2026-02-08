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

    if (cached && cached.summary_text.includes('##')) {
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
    - Style: Direct, objective. No emojis.
    - Structure:
      
      ## Status
      (Stabil / I bedring / Trenger tilsyn)

      ## Observasjoner
      - (Bullet points of key issues or "Ingen anmerkninger")

      ## Tiltak
      (Short action plan or "Fortsett dagens regime")
    - Keep it short.
    `

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are a veterinary logging assistant. Use Markdown headers (##) for sections." },
                { role: "user", content: prompt }
            ],
            max_tokens: 300,
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

export async function getMonthlyHealthSummary(dogId: string) {
    const supabase = await createClient()

    // 1. Define range (Last 30 days)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)

    // 2. Fetch Data
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

    // 3. Format Data for Analysis
    const totalDoses = doseLogs?.length || 0
    const missedDoses = doseLogs?.filter(d => d.status === 'missed').length || 0

    // Group health issues by type to see trends
    const stoolIssues = healthLogs?.filter(h => h.stool && h.stool !== 'Normal').length || 0
    const itchDays = healthLogs?.filter(h => h.itch_locations && h.itch_locations.length > 0).length || 0
    const lowEnergyDays = healthLogs?.filter(h => !h.is_playful).length || 0
    const lowAppetiteDays = healthLogs?.filter(h => !h.is_hungry).length || 0

    // Extract key notes (limit to avoid token overflow)
    const keyNotes = healthLogs?.filter(h => h.notes).map(h => `${h.date}: ${h.notes}`).slice(0, 10) || []

    const prompt = `
    Analyze the last 30 days of health data for the dog.
    
    Data:
    - Period: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}
    - Total doses scheduled: ${totalDoses}
    - Missed doses: ${missedDoses}
    - Abnormal Stool Days: ${stoolIssues}
    - Itchiness Reported Days: ${itchDays}
    - Low Energy Days: ${lowEnergyDays}
    - Low Appetite Days: ${lowAppetiteDays}
    - Recent Notes Sample: ${keyNotes.join('; ')}
    
    Task:
    Provide a monthly trend analysis in Norwegian (Bokmål).
    - Focus on PATTERNS and TRENDS over the month rather than specific daily events.
    - Structure:
    
      ## Trendvurdering
      (Overall trend - Stable, Improving, Declining?)

      ## Høydepunkter
      (Positive observations or persistent issues)

      ## Anbefaling
      (Longer term recommendation based on the month)
      
    - Tone: Professional, analytical, veterinary assistant style.
    `

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are a veterinary data analyst. Use Markdown headers (##) for sections." },
                { role: "user", content: prompt }
            ],
            max_tokens: 400,
        })

        const text = response.choices[0].message.content
        return { success: true, text }

    } catch (error) {
        console.error("OpenAI Error (Monthly):", error)
        return { success: false, error: "Kunne ikke generere månedlig analyse." }
    }
}
