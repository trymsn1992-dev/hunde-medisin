import { cn } from "@/lib/utils"
import { getMedicineColor, getSoftColor } from "@/lib/medicine-utils"

interface MedicineBadgeProps {
    medicine?: {
        id?: string
        name: string
        color?: string | null
    } | null
    className?: string
    size?: 'sm' | 'md' | 'lg'
}

export function MedicineBadge({ medicine, className, size = 'sm' }: MedicineBadgeProps) {
    if (!medicine) return <span className="text-muted-foreground italic">Ukjent medisin</span>

    const baseColor = getMedicineColor(medicine?.id, medicine?.color)
    const softStyle = getSoftColor(baseColor)

    return (
        <span
            className={cn(
                "inline-flex items-center rounded-md font-medium shadow-sm px-2.5 py-1 whitespace-normal break-words transition-all",
                softStyle,
                size === 'sm' && "text-xs",
                size === 'md' && "text-sm",
                size === 'lg' && "text-base px-3 py-1",
                className
            )}
            title={medicine.name}
        >
            {medicine.name}
        </span>
    )
}
