"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createHealthLog } from "@/app/actions/health"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Activity, Footprints, Utensils, Droplets, Dog, Save, Heart, Loader2, HeartPulse, Plus, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

const STOOL_TYPES = ["Normal", "Ingen", "Hard", "Bløt", "Rød", "Mørk"]
const ITCH_ZONES = [
    "Rumpe", "VB Pote", "HB Pote", "VF Pote", "HF Pote", "V Øre", "H Øre", "Skritt", "Hale"
]

interface HealthLogModalProps {
    dogId: string
    dogName?: string
    trigger?: React.ReactNode
    onComplete?: () => void
}

export function HealthLogModal({ dogId, dogName, trigger, onComplete }: HealthLogModalProps) {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    // Default to today
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])

    // States
    const [isPlayful, setIsPlayful] = useState<boolean>(true)
    const [wantsWalk, setWantsWalk] = useState<boolean>(true)
    const [hungryLevel, setHungryLevel] = useState<string>("Litt")
    const [isThirsty, setIsThirsty] = useState<boolean>(true)
    const [stressLevel, setStressLevel] = useState<string>("Nei")
    const [sleepLevel, setSleepLevel] = useState<string>("Normal")

    const [stool, setStool] = useState<string | null>(null)
    const [coneUsage, setConeUsage] = useState<string>("Ingen")
    const [bootUsage, setBootUsage] = useState<string>("Ingen")
    const [cageUsage, setCageUsage] = useState<string>("Ingen")
    const [itchSeverity, setItchSeverity] = useState<Record<string, number>>({})
    const [notes, setNotes] = useState("")
    const [showNotes, setShowNotes] = useState(false)

    const cycleLevel = (current: string) => {
        if (current === "Ingen") return "Litt"
        if (current === "Litt") return "Mye"
        return "Ingen"
    }

    const cycleStress = (current: string) => {
        if (current === "Nei") return "Litt"
        if (current === "Litt") return "Veldig"
        return "Nei"
    }

    const cycleSleep = (current: string) => {
        if (current === "Normal") return "Lite"
        if (current === "Lite") return "Mye"
        return "Normal"
    }

    const cycleHungry = (current: string) => {
        if (current === "Nei") return "Litt"
        if (current === "Litt") return "Veldig"
        return "Nei"
    }

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
                hungryLevel,
                isThirsty,
                stressedLevel: stressLevel,
                sleepLevel,
                stool,
                coneUsage,
                bootUsage,
                cageUsage,
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

        } catch (err: any) {
            console.error(err)
            alert("Feil ved lagring: " + (err.message || "Ukjent feil"))
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
            <DialogContent className="max-w-2xl p-0 flex flex-col h-[90vh] md:h-auto md:max-h-[85vh]">
                <DialogHeader className="p-6 border-b pb-4">
                    <DialogTitle>Hvordan har {dogName || "Leo"} det i dag?</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Date - Minimalistic */}
                    <div className="flex items-center justify-between bg-muted/30 p-3 rounded-xl border border-muted-foreground/10">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-semibold">
                                {date === new Date().toISOString().split('T')[0] ? "I dag" : date}
                            </span>
                        </div>
                        <div className="relative">
                            <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-primary hover:bg-primary/10 transition-colors">
                                Endre
                            </Button>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* Category 1: Helse */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Helse</h3>
                        <div className="grid grid-cols-3 gap-2">
                            <SmallToggleCard
                                label="Leken"
                                active={isPlayful}
                                onClick={() => setIsPlayful(!isPlayful)}
                                icon={<Activity className="h-4 w-4" />}
                                activeColor="bg-pink-500"
                            />
                            <SmallToggleCard
                                label="Gå tur"
                                active={wantsWalk}
                                onClick={() => setWantsWalk(!wantsWalk)}
                                icon={<Footprints className="h-4 w-4" />}
                                activeColor="bg-green-500"
                            />
                            <SmallCycleCard
                                label="Sulten"
                                value={hungryLevel === "Litt" ? "Ja" : hungryLevel}
                                onClick={() => setHungryLevel(cycleHungry(hungryLevel))}
                                icon={<Utensils className="h-4 w-4" />}
                                activeColor={hungryLevel === "Litt" ? "bg-orange-500" : "bg-orange-600"}
                                inactiveValue="Nei"
                            />
                            <SmallToggleCard
                                label="Tørst"
                                active={isThirsty}
                                onClick={() => setIsThirsty(!isThirsty)}
                                icon={<Droplets className="h-4 w-4" />}
                                activeColor="bg-blue-500"
                            />
                            <SmallCycleCard
                                label="Stresset"
                                value={stressLevel}
                                onClick={() => setStressLevel(cycleStress(stressLevel))}
                                icon={<HeartPulse className="h-4 w-4" />}
                                activeColor={stressLevel === "Litt" ? "bg-orange-400" : "bg-red-600"}
                                inactiveValue="Nei"
                            />
                            <SmallCycleCard
                                label="Søvn"
                                value={sleepLevel}
                                onClick={() => setSleepLevel(cycleSleep(sleepLevel))}
                                icon="💤"
                                activeColor={sleepLevel === "Lite" ? "bg-indigo-400" : "bg-indigo-600"}
                                inactiveValue="Normal"
                            />
                        </div>
                    </div>

                    {/* Category 2: Hjelpemiddel */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Hjelpemiddel</h3>
                        <div className="grid grid-cols-3 gap-2">
                            <SmallCycleCard
                                label="Skjerm"
                                value={coneUsage}
                                onClick={() => setConeUsage(cycleLevel(coneUsage))}
                                icon="🛡️"
                            />
                            <SmallCycleCard
                                label="Sokker"
                                value={bootUsage}
                                onClick={() => setBootUsage(cycleLevel(bootUsage))}
                                icon="🧦"
                            />
                            <SmallCycleCard
                                label="Bur"
                                value={cageUsage}
                                onClick={() => setCageUsage(cycleLevel(cageUsage))}
                                icon="🏠"
                            />
                        </div>

                        {/* 'Annet' trigger */}
                        {!showNotes ? (
                            <button
                                onClick={() => setShowNotes(true)}
                                className="w-full py-2 border-2 border-dashed border-muted rounded-xl text-xs font-bold text-muted-foreground hover:border-primary/30 hover:text-primary transition-all flex items-center justify-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                ANNET / NOTATER
                            </button>
                        ) : (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold uppercase text-muted-foreground">Notater</label>
                                    <button
                                        onClick={() => {
                                            setShowNotes(false)
                                            if (!notes) setNotes("")
                                        }}
                                        className="text-[10px] font-bold text-red-500 hover:underline"
                                    >
                                        Skjul
                                    </button>
                                </div>
                                <textarea
                                    placeholder="Andre observasjoner..."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    autoFocus
                                    className="flex min-h-[80px] w-full rounded-xl border-2 border-primary/20 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                                />
                            </div>
                        )}
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
                </div>

                <div className="p-6 border-t bg-muted/20">
                    <Button className="w-full h-12 text-lg shadow-lg active:scale-95 transition-all" onClick={handleSubmit} disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                        {loading ? "Lagrer..." : "Lagre Logg"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function SmallToggleCard({ label, active, onClick, icon, activeColor }: { label: string, active: boolean, onClick: () => void, icon: React.ReactNode, activeColor: string }) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "flex flex-col items-center justify-center py-2 px-1 rounded-lg border-2 transition-all duration-200 text-center min-h-[64px]",
                active ? `border-transparent ${activeColor} text-white shadow-sm` : "border-muted bg-background text-muted-foreground hover:border-primary/30"
            )}
        >
            <div className="mb-1">{icon}</div>
            <span className="text-[10px] font-bold leading-tight uppercase">{label}</span>
            <span className="text-[8px] opacity-70 mt-0.5">{active ? "JA" : "NEI"}</span>
        </button>
    )
}

function SmallCycleCard({ label, value, onClick, icon, activeColor, inactiveValue = "Ingen" }: { label: string, value: string, onClick: () => void, icon: string | React.ReactNode, activeColor?: string, inactiveValue?: string }) {
    const isActive = value !== inactiveValue
    const resolvedColor = activeColor || (value === "Litt" ? "bg-blue-400" : "bg-blue-600")

    return (
        <button
            onClick={onClick}
            className={cn(
                "flex flex-col items-center justify-center py-2 px-1 rounded-lg border-2 transition-all duration-200 text-center min-h-[64px]",
                isActive ? `border-transparent ${resolvedColor} text-white shadow-sm` : "border-muted bg-background text-muted-foreground hover:border-primary/30"
            )}
        >
            <div className="text-sm mb-1">{icon}</div>
            <span className="text-[10px] font-bold leading-tight uppercase">{label}</span>
            <span className="text-[8px] opacity-70 mt-0.5 font-bold uppercase">{value}</span>
        </button>
    )
}
