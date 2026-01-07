"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createHealthLog } from "@/app/actions/health"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Dog, Save, Activity, Heart, Footprints, Utensils, Droplets } from "lucide-react"
import { cn } from "@/lib/utils"
const STOOL_TYPES = ["Normal", "Ingen", "Hard", "Bløt", "Rød", "Mørk"]
const ITCH_ZONES = [
    "Rumpe", "VB Pote", "HB Pote", "VF Pote", "HF Pote", "V Øre", "H Øre", "Skritt", "Hale"
]

export default function LogHealthPage() {
    const params = useParams()
    const router = useRouter()
    const dogId = params.id as string

    const [loading, setLoading] = useState(false)
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])

    // States
    const [isPlayful, setIsPlayful] = useState<boolean>(true)
    const [wantsWalk, setWantsWalk] = useState<boolean>(true)
    const [isHungry, setIsHungry] = useState<boolean>(true)
    const [isThirsty, setIsThirsty] = useState<boolean>(true)

    const [stool, setStool] = useState<string | null>(null)
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
            case 1: return "bg-yellow-100 text-yellow-800 border-yellow-200"
            case 2: return "bg-orange-100 text-orange-800 border-orange-200"
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
                itchLocations,
                notes
            })

            if (!res.success) throw new Error(res.error)

            router.push(`/dog/${dogId}/history`)
            router.refresh()

        } catch (err) {
            alert("Feil ved lagring")
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-5xl mx-auto pb-20 space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={`/dog/${dogId}`}>
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                </Button>
                <h1 className="text-2xl font-bold">Logg Helse</h1>
            </div>

            {/* Date */}
            <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-2 rounded-md border bg-background"
            />

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

            {/* Stool */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <span className="text-xl">💩</span> Avføring
                    </CardTitle>
                </CardHeader>
                <CardContent>
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
                </CardContent>
            </Card>

            {/* Itchiness */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Dog className="h-5 w-5 text-red-500" /> Kløe / Irritasjon
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">Trykk flere ganger for å øke nivå (Litt -&gt; Mye -&gt; Ekstremt)</p>
                </CardHeader>
                <CardContent>
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
                </CardContent>
            </Card>

            {/* Notes */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Annet</CardTitle>
                </CardHeader>
                <CardContent>
                    <textarea
                        placeholder="Skriv notater her..."
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </CardContent>
            </Card>

            <div className="h-20" /> {/* Spacer */}

            {/* Fixed Bottom Save Button */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t z-10 max-w-5xl mx-auto">
                <Button className="w-full h-12 text-lg shadow-lg" onClick={handleSubmit} disabled={loading}>
                    <Save className="mr-2 h-5 w-5" />
                    {loading ? "Lagrer..." : "Lagre Logg"}
                </Button>
            </div>
        </div>
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
