import { cn } from "@/lib/utils"
import { getMedicineColor } from "@/lib/medicine-utils"

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

    const colorClass = getMedicineColor(medicine?.id, medicine?.color)

    return (
        <span
            className={cn(
                "inline-flex items-center rounded font-medium text-white shadow-sm bg-opacity-90 px-2 py-0.5 truncate transition-all hover:bg-opacity-100",
                colorClass,
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
