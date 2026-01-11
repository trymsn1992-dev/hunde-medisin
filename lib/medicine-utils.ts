export const MED_COLORS = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-red-500",
    "bg-teal-500",
    "bg-pink-500",
    "bg-indigo-500",
]

/**
 * Returns a consistent Taildwind background color class based on the medicine ID,
 * or returns the saved color if provided.
 */
export function getMedicineColor(id?: string, savedColor?: string | null): string {
    if (savedColor) return savedColor
    if (!id) return "bg-gray-400"

    // Simple hash function to get consistent index
    let hash = 0
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash)
    }

    const index = Math.abs(hash) % MED_COLORS.length
    return MED_COLORS[index]
}

export function getSoftColor(baseColor: string): string {
    const map: Record<string, string> = {
        "bg-blue-500": "bg-blue-50 text-blue-700 border border-blue-200",
        "bg-green-500": "bg-green-50 text-green-700 border border-green-200",
        "bg-purple-500": "bg-purple-50 text-purple-700 border border-purple-200",
        "bg-orange-500": "bg-orange-50 text-orange-700 border border-orange-200",
        "bg-red-500": "bg-red-50 text-red-700 border border-red-200",
        "bg-teal-500": "bg-teal-50 text-teal-700 border border-teal-200",
        "bg-pink-500": "bg-pink-50 text-pink-700 border border-pink-200",
        "bg-indigo-500": "bg-indigo-50 text-indigo-700 border border-indigo-200",
        "bg-gray-400": "bg-gray-100 text-gray-700 border border-gray-200",
    }
    return map[baseColor] || "bg-gray-100 text-gray-700 border border-gray-200"
}
