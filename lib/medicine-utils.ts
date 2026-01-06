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
