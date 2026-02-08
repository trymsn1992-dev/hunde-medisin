"use server"

import * as cheerio from "cheerio"

export type FelleskatalogenResult = {
    name: string
    strength?: string
    url: string
    company?: string
    description?: string // Keeping type compatible, but might be empty or snippet
}

export async function searchFelleskatalogen(query: string): Promise<FelleskatalogenResult[]> {
    if (!query || query.length < 2) return []

    try {
        // Use 'sokord' instead of 'q'
        const searchUrl = `https://www.felleskatalogen.no/medisin/sok?sokord=${encodeURIComponent(query)}`

        const response = await fetch(searchUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; DogTracker/1.0; +http://localhost)"
            },
            next: { revalidate: 3600 } // Cache for 1 hour
        })

        const html = await response.text()
        const $ = cheerio.load(html)
        const topResults: FelleskatalogenResult[] = []

        // Selectors based on Felleskatalogen structure
        // .result-list contains .toggle-action-wrapper which contains a.toggle-action
        const resultLinks = $('.result-list .toggle-action-wrapper a.toggle-action')

        resultLinks.each((i, el) => {
            if (topResults.length >= 10) return false // Limit to 10 results

            const anchor = $(el)
            const href = anchor.attr('href')

            // Extract text. The structure is often:
            // <span class="text">
            //   <span>
            //     <span><strong>Name</strong> info...</span>
            //   </span>
            // </span>
            // We can just get the text of the anchor and clean it up.
            let fullText = anchor.find('.text').text().trim()

            // Fallback if .text is empty
            if (!fullText) fullText = anchor.text().trim()

            // Remove "Komplett Felleskatalogtekst", "Felleskatalogtekst" etc if present
            fullText = fullText.replace(/Komplett Felleskatalogtekst/i, '').trim()
            fullText = fullText.replace(/Felleskatalogtekst/i, '').trim()
            // Remove trailing "K" which often appears in the text
            fullText = fullText.replace(/\s+K$/, '').trim()

            if (fullText && href) {
                const fullUrl = href.startsWith('http') ? href : `https://www.felleskatalogen.no${href}`

                // Attempt to parse strength/form from text
                // Example: "Paracet «Karo Pharma» brusetabl., mikst., smeltetabl., supp., tabl. (paracetamol)"
                // Example: "paracetamol tab 500 mg"

                let strength = undefined
                // Regex for strength like "500 mg", "1 g", "10 mg/ml"
                const strengthMatch = fullText.match(/(\d+([.,]\d+)?\s*(mg|ml|g|mikrog(\/ml)?))/i)
                if (strengthMatch) {
                    strength = strengthMatch[0]
                }

                topResults.push({
                    name: fullText,
                    strength: strength,
                    url: fullUrl,
                    company: "Felleskatalogen",
                    description: "" // Skipped for performance
                })
            }
        })

        return topResults

    } catch (error) {
        console.error("Felleskatalogen API error:", error)
        return []
    }
}
