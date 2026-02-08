"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createMedicine, createSingleDoseMedicine } from "@/app/actions/medicines"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Clock, Palette, Check, ChevronsUpDown, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
// Import colors
import { MED_COLORS } from "@/lib/medicine-utils"
import { searchCommonMedicines } from "@/app/actions/medicines"
import { searchFelleskatalogen, FelleskatalogenResult } from "@/app/actions/felleskatalogen"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

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
    const [selectedColor, setSelectedColor] = useState<string>("")

    // Combobox State
    const [openCombobox, setOpenCombobox] = useState(false)
    const [suggestions, setSuggestions] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState("")

    useEffect(() => {
        const delayDebounceFn = setTimeout(async () => {
            if (searchTerm.length > 1) {
                setSuggestions([]) // Clear previous
                // Parallel search
                // 1. Local common DB
                const localPromise = searchCommonMedicines(searchTerm)
                // 2. Felleskatalogen
                const fkPromise = searchFelleskatalogen(searchTerm)

                const [local, fk] = await Promise.all([localPromise, fkPromise])

                // Merge: prioritize local, avoid exact dupes?
                // Just map FK results to match structure
                const fkMapped = fk.map(f => ({
                    id: f.url, // Use URL as ID for key
                    name: f.name,
                    default_strength: f.strength,
                    source: "Felleskatalogen",
                    description: f.description
                }))

                // Combine
                const combined = [...(local || []), ...fkMapped]
                setSuggestions(combined)
            } else {
                setSuggestions([])
            }
        }, 300)

        return () => clearTimeout(delayDebounceFn)
    }, [searchTerm])



    // Schedule States
    // Simplified: Checkboxes for standard times
    const [times, setTimes] = useState<string[]>([]) // Start empty, will be populated by URL or default

    // Effect to populate from URL
    useEffect(() => {
        const pName = searchParams.get("name")
        const pStrength = searchParams.get("strength")
        const pDose = searchParams.get("dose")
        const pDuration = searchParams.get("duration")
        const pColor = searchParams.get("color")
        const pTimes = searchParams.getAll("times")

        if (pName) setName(pName)
        if (pStrength) setStrength(pStrength)
        if (pDose) setDoseText(pDose)
        if (pDuration) setDuration(pDuration)
        if (pColor && MED_COLORS.includes(pColor)) setSelectedColor(pColor)

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
                times,
                color: selectedColor || undefined
            })

            if (!result.success) {
                throw new Error(result.error)
            }

            router.push(`/dog/${dogId}/`) // Go to dashboard to see it
            router.refresh()

        } catch (err: unknown) {
            console.error(err)
            const message = err instanceof Error ? err.message : "Unknown error"
            alert("Error: " + message)
        } finally {
            setLoading(false)
        }
    }

    const handleSingleDose = async () => {
        // Validate minimal fields
        if (!name || !doseText) {
            alert("Må ha navn og dosering for å gi enkeltdose.")
            return
        }

        setLoading(true)
        try {
            const now = new Date()
            const todayStr = now.toISOString().split('T')[0]

            let dateTimeStr = ""

            if (startDate === todayStr) {
                dateTimeStr = now.toISOString()
            } else {
                // Construct date at 12:00 local time
                const d = new Date(startDate + 'T12:00:00')
                dateTimeStr = d.toISOString()
            }

            const result = await createSingleDoseMedicine({
                dogId,
                name,
                strength,
                notes,
                doseText,
                date: dateTimeStr,
                color: selectedColor || undefined
            })

            if (!result.success) {
                throw new Error(result.error)
            }

            router.push(`/dog/${dogId}/history?medicineId=${result.id}`)
            router.refresh()
        } catch (e: any) {
            console.error(e)
            alert("Feil: " + e.message)
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
                            <div className="space-y-2 flex flex-col">
                                <label className="text-sm font-medium">Medisinnavn</label>
                                <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openCombobox}
                                            className="justify-between w-full"
                                        >
                                            {name || "Søk etter medisin..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-full p-0" align="start">
                                        <Command shouldFilter={false}>
                                            <CommandInput placeholder="Søk i felleskatalog..." onValueChange={(val) => {
                                                setSearchTerm(val)
                                                setName(val) // Allow manual override typing
                                            }} />
                                            <CommandList>
                                                <CommandEmpty>Ingen treff. Du kan skrive navn manuelt.</CommandEmpty>
                                                {suggestions.length > 0 && (
                                                    <CommandGroup>
                                                        {suggestions.map((med) => (
                                                            <CommandItem
                                                                key={med.id}
                                                                value={med.name}
                                                                onSelect={() => {
                                                                    setName(med.name)
                                                                    if (med.default_strength) setStrength(med.default_strength)
                                                                    if (med.description) setNotes(med.description)
                                                                    setOpenCombobox(false)
                                                                }}
                                                                onMouseDown={(e) => {
                                                                    // Fix for "Click not working": prevent default focus loss
                                                                    e.preventDefault()
                                                                    e.stopPropagation()
                                                                }}
                                                                onClick={() => {
                                                                    // Manual trigger to be safe
                                                                    setName(med.name)
                                                                    if (med.default_strength) setStrength(med.default_strength)
                                                                    if (med.description) setNotes(med.description)
                                                                    setOpenCombobox(false)
                                                                }}
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        name === med.name ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                                <div className="flex flex-col">
                                                                    <span>{med.name}</span>
                                                                    <div className="flex gap-2 text-xs text-muted-foreground">
                                                                        {med.default_strength && <span>{med.default_strength}</span>}
                                                                        {med.source === "Felleskatalogen" && <span className="text-secondary-foreground/50 border rounded px-1">Nett</span>}
                                                                    </div>
                                                                </div>
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                )}
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                {/* Fallback Input if they just want to type manually without popover interaction (handled by Combobox typing above, but cleaner to have this logic) */}
                            </div>

                            {/* Color Picker */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                    <Palette className="h-4 w-4" /> Fargekode
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {MED_COLORS.map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => setSelectedColor(c === selectedColor ? "" : c)}
                                            className={cn(
                                                "h-8 w-8 rounded-full transition-all ring-offset-2 focus:outline-none focus:ring-2",
                                                c,
                                                selectedColor === c ? "ring-2 ring-foreground scale-110 shadow-lg" : "ring-transparent hover:scale-105 opacity-70 hover:opacity-100"
                                            )}
                                            title={c}
                                        />
                                    ))}
                                </div>
                                <p className="text-xs text-muted-foreground">Velg en farge for å identifisere medisinen raskere.</p>
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
                                <label className="text-sm font-medium">Beskrivelse</label>
                                <Input placeholder="f.eks. Gi med mat" value={notes} onChange={e => setNotes(e.target.value)} />
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t">
                            <h3 className="font-medium flex items-center"><Clock className="mr-2 h-4 w-4" /> Tidspunkter</h3>
                            <p className="text-xs text-muted-foreground">Velg når medisinen skal gis daglig.</p>

                            <div className="flex flex-wrap gap-2">
                                {["07:00", "08:00", "09:00", "12:00", "17:00", "18:00", "20:00", "22:00"].map(t => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => toggleTime(t)}
                                        aria-pressed={times.includes(t)}
                                        className={cn(
                                            "px-3 py-2 rounded-md border cursor-pointer transition-colors text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                            times.includes(t) ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent bg-background"
                                        )}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                            {times.length === 0 && <p className="text-destructive text-sm">Velg minst ett tidspunkt.</p>}
                        </div>

                        <div className="flex gap-4">
                            <Button type="button" variant="secondary" className="flex-1" onClick={handleSingleDose} disabled={loading || !name || !doseText}>
                                <Zap className="mr-2 h-4 w-4" /> Gi enkelt dose
                            </Button>
                            <Button type="submit" className="flex-1" disabled={loading || times.length === 0}>
                                {loading ? "Lagrer..." : "Lagre medisin"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
