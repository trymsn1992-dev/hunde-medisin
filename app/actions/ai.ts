"use server"

import { createClient } from "@/lib/supabase/server"
import { OpenAI } from "openai"

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export async function generateHealthSummary(dogId: string) {
    const supabase = await createClient()

    // 1. Fetch Dog Name
    const { data: dog } = await supabase.from('dogs').select('name').eq('id', dogId).single()
    const dogName = dog?.name || "Hunden"

    // 2. Fetch Last 7 Days of Data
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 7)

    // Fetch Dose Logs
    const { data: doseLogs } = await supabase
        .from('dose_logs')
        .select(`
      taken_at,
      status,
      medicine:medicines(name)
    `)
        .eq('dog_id', dogId)
        .gte('taken_at', startDate.toISOString())
        .lte('taken_at', endDate.toISOString())

    // Fetch Health Logs
    const { data: healthLogs } = await supabase
        .from('health_logs')
        .select('*')
        .eq('dog_id', dogId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])

    // 3. Format Data for Prompt
    const totalDoses = doseLogs?.length || 0
    const missedDoses = doseLogs?.filter(d => d.status === 'missed').length || 0

    const healthIssues = healthLogs?.flatMap(h => {
        const issues = []
        if (h.stool && h.stool !== 'Normal') issues.push(`Stool: ${h.stool} on ${h.date}`)
        if (h.itch_locations && h.itch_locations.length > 0) issues.push(`Itch: ${h.itch_locations.join(', ')} on ${h.date}`)
        if (!h.is_playful) issues.push(`Not playful on ${h.date}`)
        if (!h.wants_walk) issues.push(`No walk desire on ${h.date}`)
        if (!h.is_hungry) issues.push(`No appetite on ${h.date}`)
        if (h.notes) issues.push(`Note on ${h.date}: ${h.notes}`)
        return issues
    }) || []

    const prompt = `
    Analyze the last 7 days of health data for the dog named ${dogName}.
    
    Data:
    - Total doses given: ${totalDoses}
    - Missed doses: ${missedDoses}
    - Health Logs Count: ${healthLogs?.length || 0}
    - Reported Issues: ${healthIssues.length > 0 ? healthIssues.join('; ') : "None reported"}
    
    Task:
    Write a short, friendly, and reassuring summary (max 3-4 sentences) in Norwegian about ${dogName}'s recent health status.
    - If there are no issues, say everything looks great and they are being well taken care of.
    - If there are issues (bad stool, itch, missed meds), briefly mention them in a constructive way ("Vær obs på...").
    - Tone: Veterinary assistant / Caring friend.
    - Output ONLY the text, no markdown formatting.
  `

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are a helpful veterinary assistant app. Speak Norwegian." },
                { role: "user", content: prompt }
            ],
            max_tokens: 150,
        })

        const text = response.choices[0].message.content
        return { success: true, text }
    } catch (error) {
        console.error("OpenAI Error:", error)
        return { success: false, error: "Kunne ikke generere helserapport akkurat nå." }
    }
}
