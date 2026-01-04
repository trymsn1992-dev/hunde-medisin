"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { deleteMedicine } from "@/app/actions/medicines"
import { Plus, ArrowLeft, Trash2 } from "lucide-react"

export default function MedicinesPage() {
    const params = useParams()
    const dogId = params.id as string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [medicines, setMedicines] = useState<any[]>([])
    const supabase = createClient()
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [confirmId, setConfirmId] = useState<string | null>(null)

    useEffect(() => {
        const fetchMeds = async () => {
            const { data } = await supabase.from('medicines').select('*').eq('dog_id', dogId)
            setMedicines(data || [])
        }
        fetchMeds()
    }, [dogId, supabase])

    const handleDeleteClick = (id: string) => {
        if (confirmId === id) {
            // User confirmed, proceed to delete
            performDelete(id)
        } else {
            // First click, show confirmation
            setConfirmId(id)
            // Auto-reset confirmation after 3 seconds if not clicked
            setTimeout(() => setConfirmId(prev => prev === id ? null : prev), 3000)
        }
    }

    const performDelete = async (id: string) => {
        setDeletingId(id)
        try {
            const result = await deleteMedicine(id)
            if (!result.success) {
                alert(`Error: ${result.error}`)
                return
            }
            // Optimistic update
            setMedicines(medicines.filter(m => m.id !== id))
        } catch (_) {
            alert("Unexpected error occurred")
        } finally {
            setDeletingId(null)
            setConfirmId(null)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={`/dog/${dogId}`}><ArrowLeft className="h-5 w-5" /></Link>
                    </Button>
                    <h1 className="text-2xl font-bold">Medisiner</h1>
                </div>
                <Button asChild>
                    <Link href={`/dog/${dogId}/medicines/new`}>
                        <Plus className="mr-2 h-4 w-4" /> Legg til medisin
                    </Link>
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {medicines.map((med) => (
                    <Card key={med.id}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div>
                                <CardTitle className="text-lg hover:underline cursor-pointer">
                                    <Link href={`/dog/${dogId}/history?medicineId=${med.id}`}>
                                        {med.name}
                                    </Link>
                                </CardTitle>
                                <CardDescription>{med.strength}</CardDescription>
                            </div>
                            <Button
                                variant={confirmId === med.id ? "destructive" : "ghost"}
                                size={confirmId === med.id ? "default" : "icon"}
                                className={confirmId === med.id ? "w-auto px-3" : "text-destructive hover:text-destructive hover:bg-destructive/10"}
                                onClick={() => handleDeleteClick(med.id)}
                                disabled={deletingId === med.id}
                            >
                                {deletingId === med.id ? (
                                    <span className="animate-spin">⏳</span>
                                ) : confirmId === med.id ? (
                                    "Bekreft sletting"
                                ) : (
                                    <Trash2 className="h-5 w-5" />
                                )}
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">{med.notes}</p>
                        </CardContent>
                    </Card>
                ))}
                {medicines.length === 0 && (
                    <p className="col-span-2 text-center text-muted-foreground py-8">
                        Ingen medisiner lagt til enda.
                    </p>
                )}
            </div>
        </div>
    )
}
