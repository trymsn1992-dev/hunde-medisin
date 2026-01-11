"use server"

import OpenAI from "openai"

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
})

export type MedicationInfo = {
    name: string | null
    strength: string | null
    dose_text: string | null
    duration_days: number | null
    frequency: string[]
    category: string | null
    color?: string | null
}

export async function scanMedicationImage(imageBase64: string): Promise<MedicationInfo> {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error("Missing OpenAI API Key")
    }

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are an expert pharmacist assistant analyzing NORWEGIAN medication labels.
                    The image is a cropped close-up of a medication package. It might be rotated.
                    Analyze the image and return a JSON object with the following fields:
                    - name: The name of the medication.
                      - FIX TYPOS: If it reads "Rimady!", correct to "Rimadyl". If "Apoque!", correct to "Apoquel".
                      - Look for large bold text.
                    - strength: The strength (e.g., "50mg", "400 mg / 80 mg").
                    - category: The type/category of medicine in NORWEGIAN. infer from name/text.
                      - Examples: "Antibiotika", "Smertestillende", "Allergimedisin", "Betennelsesdempende", "Kosttilskudd", "Øyedråper".
                    - dose_text: The instruction for A SINGLE DOSE. 
                      - If label says "1 tablett morgen og kveld", return "1 tablett".
                      - If label says "1/2 tablett", return "0.5 tablett".
                      - If label says "en gang om dagen" or "1 gang daglig", infer "1 tablett" (or relevant unit).
                      - Look for keywords: "tablett", "kapsel", "ml", "mg".
                    - duration_days: The number of days for the course.
                      - STRICTLY look for explicit text like "i 10 dager", "i 1 uke", "i 5 døgn".
                      - If the label says "10 dager", return 10.
                      - If the label says "1 uke", return 7.
                      - ONLY calculate if NO explicit duration is found.
                      - If not found, return null.
                    - frequency: An array of times strings (e.g. ["08:00", "20:00"]).
                      - Analyze the dosage text for keywords:
                        - "Morgen" or "frokost" -> include "08:00"
                        - "Kveld" or "aften" -> include "20:00"
                        - "Middag" -> include "14:00"
                        - "Natt" -> include "22:00"
                      - If text says "1 gang daglig" or just "daglig" -> default to ["08:00"]
                      - If text says "2 ganger daglig" -> return ["08:00", "20:00"]
                      - If text says "3 ganger daglig" -> return ["08:00", "14:00", "20:00"]
                      - If text says "4 ganger daglig" -> return ["08:00", "12:00", "16:00", "20:00"]
                      - Return sorted unique times.
                    - color: The DOMINANT VISUAL COLOR of the package branding/logo.
                      - Return EXACTLY ONE of these English strings: "red", "orange", "yellow", "green", "blue", "purple", "pink".
                      - If unsure or white/black, return null.

                    Return ONLY raw JSON with no markdown formatting.`
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Extract medication info from this label." },
                        {
                            type: "image_url",
                            image_url: {
                                "url": imageBase64,
                            },
                        },
                    ],
                },
            ],
            response_format: { type: "json_object" },
        })

        const content = response.choices[0].message.content
        if (!content) throw new Error("No content returned from OpenAI")

        const result = JSON.parse(content)

        return {
            name: result.name || null,
            strength: result.strength || null,
            dose_text: result.dose_text || null,
            duration_days: result.duration_days || null,
            frequency: Array.isArray(result.frequency) ? result.frequency : ["08:00"],
            category: result.category || null,
            color: result.color || null
        }

    } catch (error: unknown) {
        console.error("OpenAI Vision Error:", error)
        // Throw the actual error message so the client can see it
        const message = error instanceof Error ? error.message : "Failed to analyze image."
        throw new Error(message)
    }
}
