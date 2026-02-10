"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { updateMedicine } from "@/app/actions/medicines"
import { Pencil, Plus, X } from "lucide-react"
import { MED_COLORS } from "@/lib/medicine-utils"
import { cn } from "@/lib/utils"

type EditMedicineModalProps = {
    medicine: any // Typed lazily to match page structure, ideally MedicineWithPlan
    onSuccess?: () => void
}

export function EditMedicineModal({ medicine, onSuccess }: EditMedicineModalProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    // Initial State from Medicine
    const [name, setName] = useState(medicine.name)
    const [strength, setStrength] = useState(medicine.strength || "")
    const [notes, setNotes] = useState(medicine.notes || "")
    const [color, setColor] = useState(medicine.color || "#3b82f6") // Default blue

    // Initial State from Plan
    const plan = medicine.currentPlan || {}
    const [doseText, setDoseText] = useState(plan.dose_text || "")
    const [startDate, setStartDate] = useState(plan.start_date ? new Date(plan.start_date).toISOString().slice(0, 10) : "")
    const [times, setTimes] = useState<string[]>(plan.schedule_times || ["08:00"])

    const handleAddTime = () => {
        setTimes([...times, "12:00"])
    }

    const handleRemoveTime = (index: number) => {
        setTimes(times.filter((_, i) => i !== index))
    }

    const handleTimeChange = (index: number, value: string) => {
        const newTimes = [...times]
        newTimes[index] = value
        setTimes(newTimes)
    }

    const handleSubmit = async () => {
        setLoading(true)
        try {
            const result = await updateMedicine(medicine.id, {
                name,
                strength,
                notes,
                doseText,
                startDate,
                times,
                color
            })

            if (result.success) {
                setOpen(false)
                if (onSuccess) onSuccess()
            } else {
                alert("Feil ved oppdatering: " + result.error)
            }
        } catch (error) {
            console.error(error)
            alert("En ukjent feil oppstod.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                    <Pencil className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Rediger Medisin</DialogTitle>
                    <DialogDescription>Endre detaljer eller timeplan.</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Basic Info */}
                    <div className="space-y-2">
                        <Label>Navn</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Navn på medisin" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Styrke</Label>
                            <Input value={strength} onChange={e => setStrength(e.target.value)} placeholder="Eks: 20mg" />
                        </div>
                        <div className="space-y-2">
                            <Label>Fargekode</Label>
                            <div className="flex flex-wrap gap-2">
                                {MED_COLORS.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setColor(c)}
                                        className={cn(
                                            "h-8 w-8 rounded-full border-2 transition-all",
                                            c,
                                            color === c ? "border-foreground scale-110 shadow-sm" : "border-transparent opacity-70 hover:opacity-100"
                                        )}
                                        aria-label="Velg farge"
                                    />
                                ))}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center mt-1">
                                Velg farge for ikoner
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Dose (Tekst)</Label>
                        <Input value={doseText} onChange={e => setDoseText(e.target.value)} placeholder="Eks: 1 tablett" />
                    </div>

                    {/* Schedule */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Startdato</Label>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Tidspunkter</Label>
                                <Button variant="ghost" size="sm" onClick={handleAddTime} className="h-6 text-xs">
                                    <Plus className="h-3 w-3 mr-1" /> Legg til tid
                                </Button>
                            </div>
                            <div className="space-y-2 border rounded-md p-3 bg-muted/20">
                                {times.map((time, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <Input
                                            type="time"
                                            value={time}
                                            onChange={(e) => handleTimeChange(index, e.target.value)}
                                            className="flex-1"
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:bg-destructive/10 h-10 w-10 shrink-0"
                                            onClick={() => handleRemoveTime(index)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                {times.length === 0 && (
                                    <p className="text-xs text-muted-foreground text-center py-2">Ingen faste tidspunkter (Ved behov?)</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Beskrivelse</Label>
                        <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Instruksjoner..." />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Avbryt</Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? "Lagrer..." : "Lagre endringer"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
