"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { deleteMedicine, pauseMedicine, resumeMedicine } from "@/app/actions/medicines"
import { Plus, ArrowLeft, Trash2, Pause, Play } from "lucide-react"
import { MedicineBadge } from "@/components/medicine-badge"

export default function MedicinesPage() {
    const params = useParams()
    const dogId = params.id as string
    const router = useRouter()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [medicines, setMedicines] = useState<any[]>([])
    const supabase = createClient()
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [confirmId, setConfirmId] = useState<string | null>(null)

    // Pause/Resume State
    const [pausingId, setPausingId] = useState<string | null>(null)
    const [resumingId, setResumingId] = useState<string | null>(null)
    const [pauseDate, setPauseDate] = useState<string>(new Date().toISOString().slice(0, 16)) // YYYY-MM-DDTHH:mm
    const [actionLoading, setActionLoading] = useState(false)

    const fetchMeds = async () => {
        // Fetch medicines AND their latest plan to know active/paused status
        const { data } = await supabase
            .from('medicines')
            .select(`
                *,
                plans:medication_plans(id, active, paused_at, end_date, dose_text, frequency_type, schedule_times, created_at)
            `)
            .eq('dog_id', dogId)

        // Transform to attach "currentPlan" convenience
        const mapped = data?.map(m => {
            // Find latest created plan
            const latestPlan = m.plans?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
            return { ...m, currentPlan: latestPlan }
        }) || []

        setMedicines(mapped)
        router.refresh()
    }

    useEffect(() => {
        fetchMeds()
    }, [dogId, supabase])

    const handleDeleteClick = (id: string) => {
        if (confirmId === id) {
            performDelete(id)
        } else {
            setConfirmId(id)
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
            fetchMeds()
        } catch (_) {
            alert("Unexpected error occurred")
        } finally {
            setDeletingId(null)
            setConfirmId(null)
        }
    }

    // --- PAUSE LOGIC ---
    const openPauseDialog = (id: string) => {
        const now = new Date()
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset()) // Adjust for local input
        setPauseDate(now.toISOString().slice(0, 16))
        setPausingId(id)
    }

    const handlePauseConfirm = async () => {
        if (!pausingId) return
        setActionLoading(true)
        try {
            const dateObj = new Date(pauseDate)
            const isoString = dateObj.toISOString()

            const result = await pauseMedicine(pausingId, isoString)

            if (!result.success) alert("Kunne ikke sette på pause: " + result.error)
            else {
                await fetchMeds()
            }
        } catch (e: any) { // Explicitly cast error
            console.error(e)
            alert("Feil ved pause: " + (e.message || e))
        } finally {
            setActionLoading(false)
            setPausingId(null)
        }
    }

    // --- RESUME LOGIC ---
    const openResumeDialog = (id: string) => {
        setResumingId(id)
    }

    const handleResume = async (mode: 'remaining' | 'new') => {
        if (!resumingId) return

        if (mode === 'new') {
            // Redirect to edit page logic? Or just simple restart
            // User requested option to "start with another plan". 
            // Since we don't have a full Edit UI here, let's assume "New Plan" means resetting the schedule.
            // Actually, for "Begynne med en annen plan", redirecting to a sophisticated edit/create page is best.
            // But we don't have a dedicated edit page yet? We have `/medicines/new` but that's new.
            // Maybe just Reactivate with cleared dates?
            // Let's call the server action with 'new' which clears End Date (infinite).
            // OR simply redirect: window.location.href = ...
            // Let's use the server action for now as implemented.
        }

        setActionLoading(true)
        try {
            const result = await resumeMedicine(resumingId, mode)
            if (!result.success) alert("Kunne ikke starte igjen: " + result.error)
            else await fetchMeds()
        } finally {
            setActionLoading(false)
            setResumingId(null)
        }
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
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
                {medicines.map((med) => {
                    const plan = med.currentPlan
                    const isPaused = plan?.active === false && !!plan?.paused_at

                    // Calculate Display Info
                    let infoString = ""
                    if (plan) {
                        const parts = []

                        // 1. Duration / Days Left
                        if (plan.end_date) {
                            const end = new Date(plan.end_date)
                            const now = new Date()
                            // If paused, we calculate remaining from paused_at
                            const compareDate = isPaused && plan.paused_at ? new Date(plan.paused_at) : now

                            const diffTime = end.getTime() - compareDate.getTime()
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

                            if (diffDays < 0) parts.push("Ferdig")
                            else parts.push(`${diffDays} dager igjen`)
                        } else {
                            parts.push("Løpende")
                        }

                        // 2. Frequency
                        if (plan.frequency_type === 'daily_times') {
                            const count = plan.schedule_times?.length || 0
                            parts.push(count === 1 ? "Daglig" : `${count}x daglig`)
                        } else if (plan.frequency_type === 'as_needed') {
                            parts.push("Ved behov")
                        } else {
                            parts.push("Fast intervall")
                        }

                        // 3. Dose
                        if (plan.dose_text) parts.push(plan.dose_text)

                        infoString = parts.join(" - ")
                    }

                    return (
                        <Card key={med.id} className={isPaused ? "opacity-75 border-dashed" : ""}>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <div className="flex-1 min-w-0 pr-2">
                                    <div className="flex items-center gap-2">
                                        {/* Use MedicineBadge instead of plain text */}
                                        <Link href={`/dog/${dogId}/history?medicineId=${med.id}`} className="hover:opacity-80 transition-opacity block mb-1 truncate max-w-full">
                                            <MedicineBadge medicine={med} className="text-base max-w-full" />
                                        </Link>

                                        {isPaused && (
                                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-medium shrink-0">
                                                Pauset
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-sm text-muted-foreground truncate">
                                        {med.strength}
                                        {infoString && (
                                            <span className="block mt-1 text-primary/80 font-medium truncate">
                                                {infoString}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    {/* PAUSE / RESUME BUTTON */}
                                    {isPaused ? (
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                            onClick={() => openResumeDialog(med.id)}
                                            title="Fortsett behandling"
                                        >
                                            <Play className="h-4 w-4" />
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                                            onClick={() => openPauseDialog(med.id)}
                                            title="Sett på pause"
                                        >
                                            <Pause className="h-4 w-4" />
                                        </Button>
                                    )}

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
                                            "Slett"
                                        ) : (
                                            <Trash2 className="h-5 w-5" />
                                        )}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">{med.notes}</p>
                            </CardContent>
                        </Card>
                    )
                })}
                {medicines.length === 0 && (
                    <p className="col-span-2 text-center text-muted-foreground py-8">
                        Ingen medisiner lagt til enda.
                    </p>
                )}
            </div>

            {/* PAUSE DIALOG OVERLAY */}
            {pausingId && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-sm">
                        <CardHeader>
                            <CardTitle>Sett medisin på pause ⏸️</CardTitle>
                            <CardDescription>Når skal pausen starte?</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <input
                                type="datetime-local"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                value={pauseDate}
                                onChange={(e) => setPauseDate(e.target.value)}
                            />
                            <div className="flex gap-2 justify-end pt-2">
                                <Button variant="outline" onClick={() => setPausingId(null)}>Avbryt</Button>
                                <Button onClick={handlePauseConfirm} disabled={actionLoading}>
                                    {actionLoading ? "Lagrer..." : "Bekreft Pause"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* RESUME DIALOG OVERLAY */}
            {resumingId && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle>Start behandling igjen ▶️</CardTitle>
                            <CardDescription>Hvordan vil du fortsette?</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Button
                                className="w-full justify-start h-auto py-3 px-4"
                                variant="outline"
                                onClick={() => handleResume('remaining')}
                                disabled={actionLoading}
                            >
                                <div className="text-left">
                                    <div className="font-semibold">Fortsett der vi slapp</div>
                                    <div className="text-xs text-muted-foreground font-normal">
                                        Forskyver sluttdato basert på pausen.
                                    </div>
                                </div>
                            </Button>

                            <Button
                                className="w-full justify-start h-auto py-3 px-4"
                                variant="outline"
                                onClick={() => handleResume('new')}
                                disabled={actionLoading}
                            >
                                <div className="text-left">
                                    <div className="font-semibold">Start ny plan (kontinuerlig)</div>
                                    <div className="text-xs text-muted-foreground font-normal">
                                        Starter på nytt fra i dag uten sluttdato.
                                    </div>
                                </div>
                            </Button>

                            <Button
                                variant="ghost"
                                className="w-full mt-2"
                                onClick={() => setResumingId(null)}
                            >
                                Avbryt
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}
