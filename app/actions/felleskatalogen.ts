"use server"

import * as cheerio from "cheerio"

export type FelleskatalogenResult = {
    name: string
    strength?: string
    url: string
    company?: string
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
        
        // Trying generic selector for the main content area
        $('#search-results li, .result-item, .reference-list li').each((i, el) => {
            if (results.length >= 10) return

            const anchor = $(el).find('a').first()
            const nameFull = anchor.text().trim()
            const href = anchor.attr('href')

            if (nameFull && href && href.includes('/medisin/')) {
                // Name often includes strength: "Rimadyl Zoetis 50 mg tabletter"
                // Let's try to extract strength.
                // Regex for strength: \d+(\.|,)?\d*\s*(mg|ml|g|mikrog)
                
                const strengthMatch = nameFull.match(/(\d+([.,]\d+)?\s*(mg|ml|g|mikrog(\/ml)?))/)
                const strength = strengthMatch ? strengthMatch[0] : undefined

                // Clean name: remove company if possible?
                // Often format: "Name Company Formulation Strength"
                // Simple approach: Use full name.
                
                results.push({
                    name: nameFull,
                    strength: strength,
                    url: href.startsWith('http') ? href : `https://www.felleskatalogen.no${href}`
                })
            }
        })

        // Uniquify
        const unique = results.filter((v, i, a) => a.findIndex(t => t.name === v.name) === i)
        
        return unique

    } catch (error) {
        console.error("Felleskatalogen API error:", error)
        return []
    }
}
