"use server"

import * as cheerio from "cheerio"

export type FelleskatalogenResult = {
    name: string
    strength?: string
    url: string
    company?: string
    description?: string // Indikasjoner / Bruksområde
}

export async function searchFelleskatalogen(query: string): Promise<FelleskatalogenResult[]> {
    if (!query || query.length < 2) return []

    try {
        const searchUrl = `https://www.felleskatalogen.no/medisin/sok?q=${encodeURIComponent(query)}`
        const response = await fetch(searchUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; DogTracker/1.0; +http://localhost)"
            }
        })
        const html = await response.text()
        const $ = cheerio.load(html)
        const results: FelleskatalogenResult[] = []

        // Parse search results - adapt selector based on actual site structure
        // Inspecting Felleskatalogen structure (approximate)
        // Usually results are in a list. 
        // Let's assume generic structure for now and refine if needed.
        // Actually, Felleskatalogen often redirects to the product page if exact match, or shows list.

        // Let's check for list items. The site typically uses `ul.search-results` or similar.
        // Based on typical structure:
        // .search-result-item or similar?

        // Quick fallback: Look for links containing "medisin/" that are not navigation.

        // Limit to fewer concurrent details fetches to be polite
        const topResults = []
        let count = 0

        const listItems = $('#search-results li, .result-item, .reference-list li')

        for (let i = 0; i < listItems.length; i++) {
            if (count >= 5) break
            const el = listItems[i]

            const anchor = $(el).find('a').first()
            const nameFull = anchor.text().trim()
            const href = anchor.attr('href')

            if (nameFull && href && href.includes('/medisin/')) {
                const strengthMatch = nameFull.match(/(\d+([.,]\d+)?\s*(mg|ml|g|mikrog(\/ml)?))/)
                const strength = strengthMatch ? strengthMatch[0] : undefined

                const fullUrl = href.startsWith('http') ? href : `https://www.felleskatalogen.no${href}`

                // 2. Fetch Details for this item (Description)
                // We do this inside the loop but maybe only for the first few?
                // Let's do a quick fetch
                let description = ""
                try {
                    const detailRes = await fetch(fullUrl, {
                        headers: { "User-Agent": "Mozilla/5.0 (compatible; DogTracker/1.0)" }
                    })
                    const detailHtml = await detailRes.text()
                    const $d = cheerio.load(detailHtml)

                    // Try to find "Indikasjoner" section
                    // Felleskatalogen often has headers like <h2>Indikasjoner</h2> followed by <p>
                    // Or .varsel-box inside

                    // Strategy: Find h2 containter "Indikasjoner", get next p
                    let indications = ""
                    $('h2, h3').each((j, h) => {
                        if ($(h).text().toLowerCase().includes('indikasjoner') || $(h).text().toLowerCase().includes('bruksområde')) {
                            // Get content after
                            // often it's in a div or p following
                            let next = $(h).next()
                            while (next.length && next[0].tagName !== 'h2' && next[0].tagName !== 'h3') {
                                if (next.is('p') || next.is('div')) {
                                    const text = next.text().trim()
                                    if (text) {
                                        indications += text + " "
                                        if (indications.length > 150) break // Limit length
                                    }
                                }
                                next = next.next()
                            }
                        }
                    })

                    if (indications) {
                        // Clean up
                        description = indications.replace(/\s+/g, ' ').trim().slice(0, 150)
                        if (description.length >= 150) description += "..."
                    }

                } catch (e) {
                    console.log("Failed to fetch details for", nameFull)
                }

                topResults.push({
                    name: nameFull,
                    strength: strength,
                    url: fullUrl,
                    description: description
                })
                count++
            }
        }

        return topResults

    } catch (error) {
        console.error("Felleskatalogen API error:", error)
        return []
    }
}
