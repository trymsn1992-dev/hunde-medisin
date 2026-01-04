"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createMedicine } from "@/app/actions/medicines"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowLeft, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

export default function ManualEntryPage() {
    const params = useParams()
    const searchParams = useSearchParams()
    const dogId = params.id as string
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    // Form States
    const [name, setName] = useState("")
    const [strength, setStrength] = useState("")
    const [doseText, setDoseText] = useState("") // e.g. "1 pill"
    const [duration, setDuration] = useState("") // e.g. "7"
    const [notes, setNotes] = useState("")
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]) // YYYY-MM-DD

    // Schedule States
    // Simplified: Checkboxes for standard times
    const [times, setTimes] = useState<string[]>([]) // Start empty, will be populated by URL or default

    // Effect to populate from URL
    useEffect(() => {
        const pName = searchParams.get("name")
        const pStrength = searchParams.get("strength")
        const pDose = searchParams.get("dose")
        const pDuration = searchParams.get("duration")
        const pTimes = searchParams.getAll("times")

        if (pName) setName(pName)
        if (pStrength) setStrength(pStrength)
        if (pDose) setDoseText(pDose)
        if (pDuration) setDuration(pDuration)

        // If times are in URL, use them. Otherwise default to 08:00 and 20:00 (or leave empty if user prefers)
        // User requested: if simply "daily", default to one time. Our OCR defaults to 08:00 for daily.
        if (pTimes.length > 0) {
            setTimes(pTimes)
        } else {
            // Fallback default if nothing from OCR (e.g. manual nav)
            setTimes(["08:00"])
        }
    }, [searchParams])

    const toggleTime = (t: string) => {
        if (times.includes(t)) {
            setTimes(times.filter(x => x !== t))
        } else {
            setTimes([...times, t].sort())
        }
    }

    const setToday = () => {
        setStartDate(new Date().toISOString().split('T')[0])
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const result = await createMedicine({
                dogId,
                name,
                strength,
                notes,
                startDate,
                duration,
                doseText,
                times
            })

            if (!result.success) {
                throw new Error(result.error)
            }

            router.push(`/dog/${dogId}/`) // Go to dashboard to see it
            router.refresh()

        } catch (err: any) {
            console.error(err)
            alert("Error: " + err.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-lg mx-auto space-y-6">
            <Button variant="ghost" size="sm" asChild>
                <Link href={`/dog/${dogId}/medicines/new`}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Tilbake
                </Link>
            </Button>

            <Card>
                <CardHeader>
                    <CardTitle>Legg til medisin manuelt</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Medisinnavn</label>
                                <Input placeholder="f.eks. Rimadyl" value={name} onChange={e => setName(e.target.value)} required />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Styrke (valgfritt)</label>
                                    <Input placeholder="f.eks. 50mg" value={strength} onChange={e => setStrength(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Dosering</label>
                                    <Input placeholder="f.eks. 1 tablett" value={doseText} onChange={e => setDoseText(e.target.value)} required />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Startdato</label>
                                <div className="flex gap-2">
                                    <Input
                                        type="date"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                        required
                                        className="flex-1"
                                    />
                                    <Button type="button" variant="outline" onClick={setToday}>
                                        I dag
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Varighet (Dager)</label>
                                <Input
                                    type="number"
                                    placeholder="f.eks. 7"
                                    value={duration}
                                    onChange={e => setDuration(e.target.value)}
                                    min="1"
                                />
                                <p className="text-xs text-muted-foreground">La stå tom for løpende behandling (uavbrutt)</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Notater</label>
                                <Input placeholder="f.eks. Gi med mat" value={notes} onChange={e => setNotes(e.target.value)} />
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t">
                            <h3 className="font-medium flex items-center"><Clock className="mr-2 h-4 w-4" /> Tidspunkter</h3>
                            <p className="text-xs text-muted-foreground">Velg når medisinen skal gis daglig.</p>

                            <div className="flex flex-wrap gap-2">
                                {["07:00", "08:00", "09:00", "12:00", "17:00", "18:00", "20:00", "22:00"].map(t => (
                                    <div
                                        key={t}
                                        onClick={() => toggleTime(t)}
                                        className={cn(
                                            "px-3 py-2 rounded-md border cursor-pointer transition-colors text-sm font-medium",
                                            times.includes(t) ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"
                                        )}
                                    >
                                        {t}
                                    </div>
                                ))}
                            </div>
                            {times.length === 0 && <p className="text-destructive text-sm">Velg minst ett tidspunkt.</p>}
                        </div>

                        <Button type="submit" className="w-full" disabled={loading || times.length === 0}>
                            {loading ? "Lagrer..." : "Lagre medisin"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
