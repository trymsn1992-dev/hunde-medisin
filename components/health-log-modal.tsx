"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createHealthLog } from "@/app/actions/health"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Activity, Footprints, Utensils, Droplets, Dog, Save, Heart, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const STOOL_TYPES = ["Normal", "Ingen", "Hard", "Bløt", "Rød", "Mørk"]
const ITCH_ZONES = [
    "Rumpe", "VB Pote", "HB Pote", "VF Pote", "HF Pote", "V Øre", "H Øre", "Skritt", "Hale"
]

interface HealthLogModalProps {
    dogId: string
    trigger?: React.ReactNode
    onComplete?: () => void
}

export function HealthLogModal({ dogId, trigger, onComplete }: HealthLogModalProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    // Default to today
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])

    // States
    const [isPlayful, setIsPlayful] = useState<boolean>(true)
    const [wantsWalk, setWantsWalk] = useState<boolean>(true)
    const [isHungry, setIsHungry] = useState<boolean>(true)
    const [isThirsty, setIsThirsty] = useState<boolean>(true)

    const [stool, setStool] = useState<string | null>(null)
    const [coneUsage, setConeUsage] = useState<string>("Ingen")
    const [itchSeverity, setItchSeverity] = useState<Record<string, number>>({})
    const [notes, setNotes] = useState("")

    const toggleItch = (zone: string) => {
        setItchSeverity(prev => {
            const current = prev[zone] || 0
            const next = current + 1
            if (next > 3) {
                // Remove if clicking past 3
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { [zone]: _, ...rest } = prev
                return rest
            }
            return { ...prev, [zone]: next }
        })
    }

    const getSeverityLabel = (level: number) => {
        switch (level) {
            case 1: return "Litt"
            case 2: return "Mye"
            case 3: return "Ekstremt"
            default: return ""
        }
    }

    const getSeverityColor = (level: number) => {
        switch (level) {
            case 1: return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700"
            case 2: return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700"
            case 3: return "bg-red-500 text-white border-red-600 shadow-md"
            default: return "bg-background hover:bg-muted text-foreground border-input"
        }
    }

    const handleSubmit = async () => {
        setLoading(true)
        try {
            const itchLocations = Object.entries(itchSeverity).map(([zone, level]) => {
                if (level === 1) return `${zone} (Litt)`
                if (level === 2) return `${zone} (Mye)`
                if (level === 3) return `${zone} (Ekstremt)`
                return zone
            })

            const res = await createHealthLog({
                dogId,
                date,
                isPlayful,
                wantsWalk,
                isHungry,
                isThirsty,
                stool,
                coneUsage, // Added
                itchLocations,
                notes
            })

            if (!res.success) throw new Error(res.error)

            // Haptic feedback
            if (navigator.vibrate) navigator.vibrate(200)

            setOpen(false)
            router.refresh()
            onComplete?.()

            // Reset form optionally, or keep it? Resetting is safer.
            setStool(null)
            setItchSeverity({})
            setNotes("")

        } catch (err) {
            alert("Feil ved lagring")
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" className="gap-2">
                        <Heart className="h-4 w-4 text-primary" />
                        Logg helse
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Hvordan har hunden det i dag?</DialogTitle>
                    <DialogDescription>
                        Registrer dagsform, matlyst og eventuelle symptomer.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Date */}
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium">Dato</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full p-2 rounded-md border bg-background"
                        />
                    </div>

                    {/* General Mood/Appetite Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <ToggleCard
                            label="Leken?"
                            active={isPlayful}
                            onClick={() => setIsPlayful(!isPlayful)}
                            icon={<Activity className="h-6 w-6" />}
                            color="text-pink-500"
                            bgColor="bg-pink-500/10"
                            activeBg="bg-pink-500"
                        />
                        <ToggleCard
                            label="Vil gå tur?"
                            active={wantsWalk}
                            onClick={() => setWantsWalk(!wantsWalk)}
                            icon={<Footprints className="h-6 w-6" />}
                            color="text-green-500"
                            bgColor="bg-green-500/10"
                            activeBg="bg-green-500"
                        />
                        <ToggleCard
                            label="Sulten?"
                            active={isHungry}
                            onClick={() => setIsHungry(!isHungry)}
                            icon={<Utensils className="h-6 w-6" />}
                            color="text-orange-500"
                            bgColor="bg-orange-500/10"
                            activeBg="bg-orange-500"
                        />
                        <ToggleCard
                            label="Tørst?"
                            active={isThirsty}
                            onClick={() => setIsThirsty(!isThirsty)}
                            icon={<Droplets className="h-6 w-6" />}
                            color="text-blue-500"
                            bgColor="bg-blue-500/10"
                            activeBg="bg-blue-500"
                        />
                    </div>

                    {/* Cone Usage (Skjerm) */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium flex items-center gap-2">
                            🛡️ Skjerm / Krage
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {["Ingen", "Litt", "Mye"].map(level => (
                                <button
                                    key={level}
                                    onClick={() => setConeUsage(level)}
                                    className={cn(
                                        "px-4 py-2 rounded-full text-sm font-medium transition-all border",
                                        coneUsage === level
                                            ? "bg-blue-600 text-white border-blue-600 shadow-md transform scale-105"
                                            : "bg-background hover:bg-muted text-foreground border-input"
                                    )}
                                >
                                    {level}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Stool */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium flex items-center gap-2">
                            <span className="text-lg">💩</span> Avføring
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {STOOL_TYPES.map(type => (
                                <button
                                    key={type}
                                    onClick={() => setStool(stool === type ? null : type)}
                                    className={cn(
                                        "px-4 py-2 rounded-full text-sm font-medium transition-all border",
                                        stool === type
                                            ? "bg-amber-700 text-white border-amber-700 shadow-md transform scale-105"
                                            : "bg-background hover:bg-muted text-foreground border-input"
                                    )}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Itchiness */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium flex items-center gap-2">
                            <Dog className="h-4 w-4 text-red-500" /> Kløe / Irritasjon
                        </h3>
                        <p className="text-xs text-muted-foreground">Trykk flere ganger for å øke nivå</p>
                        <div className="flex flex-wrap gap-2">
                            {ITCH_ZONES.map(zone => {
                                const level = itchSeverity[zone] || 0
                                return (
                                    <button
                                        key={zone}
                                        onClick={() => toggleItch(zone)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-md text-sm font-medium transition-all border flex items-center gap-2",
                                            getSeverityColor(level)
                                        )}
                                    >
                                        {zone}
                                        {level > 0 && <span className="p-0.5 px-1.5 bg-white/20 rounded-full text-[10px] uppercase font-bold">{getSeverityLabel(level)}</span>}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Notater</label>
                        <textarea
                            placeholder="Andre observasjoner..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                    </div>

                    <Button className="w-full h-12 text-lg" onClick={handleSubmit} disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                        {loading ? "Lagrer..." : "Lagre Logg"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function ToggleCard({ label, active, onClick, icon, color, bgColor, activeBg }: { label: string, active: boolean, onClick: () => void, icon: React.ReactNode, color: string, bgColor: string, activeBg: string }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all duration-200",
                active ? `border-transparent ${activeBg} text-white shadow-md scale-[1.02]` : `border-transparent ${bgColor} ${color} hover:opacity-80`
            )}
        >
            <div className={cn("mb-2 transition-transform", active && "scale-110")}>
                {icon}
            </div>
            <span className="font-semibold text-sm">{label}</span>
            <span className={cn("text-xs mt-1 font-bold uppercase", active ? "opacity-100" : "opacity-60")}>
                {active ? "JA" : "NEI"}
            </span>
        </button>
    )
}
