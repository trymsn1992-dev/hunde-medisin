"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, CheckCircle, Pill, CalendarDays, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Trash2, UserPlus, Copy, Heart, Sparkles, PartyPopper } from "lucide-react"
import { deleteDog } from "@/app/actions/dogs"
import { MedicineBadge } from "@/components/medicine-badge"

type DoseEvent = {
    logId?: string
    planId: string
    medicineId: string
    dogId: string
    medicineName: string
    doseText: string
    scheduledTime: string // HH:MM
    status: 'due' | 'upcoming' | 'overdue' | 'taken'
    isToday: boolean
}

export default function DogDashboardPage() {
    const params = useParams()
    const dogId = params.id as string
    const [loading, setLoading] = useState(true)
    const [dogName, setDogName] = useState("")
    const [inviteCode, setInviteCode] = useState("")
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [todayDoses, setTodayDoses] = useState<DoseEvent[]>([])
    const [tomorrowDoses, setTomorrowDoses] = useState<DoseEvent[]>([])

    // Key to track which dose is currently processing (planId-time)
    const [processingDoseKey, setProcessingDoseKey] = useState<string | null>(null)

    const supabase = createClient()
    const router = useRouter()

    const fetchData = useCallback(async () => {
        // Only set global loading on first load to avoid screen flicker
        // But here we rely on button loading state for updates

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // 1. Fetch Dog Info
        const { data: dog } = await supabase.from("dogs").select("name, invite_code").eq("id", dogId).single()
        if (dog) {
            setDogName(dog.name)
            setInviteCode(dog.invite_code)
        }

        // 2. Fetch Medicines for this dog
        const { data: medicines } = await supabase.from('medicines').select('id').eq('dog_id', dogId)
        const medicineIds = medicines?.map(m => m.id) || []

        if (medicineIds.length > 0) {
            // Fetch Active Plans
            const { data: plans } = await supabase
                .from("medication_plans")
                .select(`
             id,
             medicine_id,
             dose_text,
             schedule_times,
             medicine:medicines (name, strength)
           `)
                .in('medicine_id', medicineIds)
                .eq('active', true)

            // Fetch Logs (Today)
            const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
            const { data: logs } = await supabase
                .from("dose_logs")
                .select("id, plan_id, taken_at")
                .in("medicine_id", medicineIds)
                .gte("taken_at", startOfDay.toISOString())

            if (plans) {
                const buildEvents = (isToday: boolean) => {
                    const events: DoseEvent[] = []
                    const now = new Date()
                    const currentTotalMins = now.getHours() * 60 + now.getMinutes()

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    plans.forEach((p: any) => {
                        const times = (p.schedule_times as string[] || []).sort()
                        // Find logs for this plan
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const planLogs = logs?.filter((l: any) => l.plan_id === p.id) || []
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const sortedLogs = planLogs.sort((a: any, b: any) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime())

                        times.forEach((t, index) => {
                            events.push(createEvent(p, t, index, sortedLogs, currentTotalMins, isToday))
                        })
                    })
                    return events.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
                }

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const createEvent = (p: any, t: string, index: number, sortedLogs: any[], currentMins: number, isToday: boolean): DoseEvent => {
                    const [h, m] = t.split(':').map(Number)
                    const scheduledMins = h * 60 + m

                    let status: DoseEvent['status'] = 'upcoming'
                    let logId: string | undefined

                    if (isToday) {
                        if (index < sortedLogs.length) {
                            status = 'taken'
                            logId = sortedLogs[index].id
                        } else {
                            if (scheduledMins < currentMins) {
                                status = 'overdue'
                            } else {
                                status = 'due'
                            }
                        }
                    } else {
                        status = 'upcoming'
                    }

                    return {
                        logId,
                        planId: p.id,
                        medicineId: p.medicine_id,
                        dogId: dogId,
                        medicineName: p.medicine.name,
                        doseText: p.dose_text,
                        scheduledTime: t,
                        status,
                        isToday
                    }
                }

                setTodayDoses(buildEvents(true))
                setTomorrowDoses(buildEvents(false))
            }
        }
        setLoading(false)
    }, [dogId, supabase])

    useEffect(() => {
        fetchData()
    }, [fetchData])


    const toggleDose = async (dose: DoseEvent) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const doseKey = `${dose.planId}-${dose.scheduledTime}`
        setProcessingDoseKey(doseKey) // Start loading on this button

        try {
            if (dose.status === 'taken') {
                // DELETE (Undo)
                if (dose.logId) {
                    const { error } = await supabase.from("dose_logs").delete().eq('id', dose.logId)
                    if (error) throw error
                }
            } else {
                // INSERT (Mark Given)
                const takenAt = new Date().toISOString()
                const { error } = await supabase.from("dose_logs").insert({
                    plan_id: dose.planId,
                    medicine_id: dose.medicineId,
                    dog_id: dose.dogId,
                    taken_by: user.id,
                    taken_at: takenAt,
                    status: 'taken',
                    notes: 'Marked from dashboard'
                })
                if (error) throw error
            }
            // If successful, refresh data to update UI
            await fetchData()
        } catch (error: unknown) {
            console.error("Toggle failed:", error)
            const message = error instanceof Error ? error.message : "Ukjent feil"
            alert("Handling feilet: " + message)
        } finally {
            setProcessingDoseKey(null) // Stop loading
        }
    }

    const handleDeleteDog = async () => {
        // Loading state?
        const res = await deleteDog(dogId)
        if (res?.message) {
            alert(res.message)
        }
    }

    const handleInvite = () => {
        const url = `${window.location.origin}/join/${inviteCode}`
        navigator.clipboard.writeText(url)
        alert("Invitasjonslenke kopiert til utklippstavlen! Send den til andre.")
    }

    return (
        <div className="pb-24 sm:pb-8 space-y-8 max-w-2xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{dogName}</h1>
                    <p className="text-muted-foreground">Medisinsporing</p>
                </div>
                {/* Desktop/Tablet Navigation */}
                <div className="hidden md:flex gap-2">
                    <Button asChild variant="outline" size="sm">
                        <Link href={`/dog/${dogId}/history`}>Historikk</Link>
                    </Button>
                    <Button asChild size="sm">
                        <Link href={`/dog/${dogId}/medicines`}>
                            <Pill className="mr-2 h-4 w-4" /> Medisiner
                        </Link>
                    </Button>
                    <Button asChild variant="secondary" size="sm" className="bg-pink-100 text-pink-700 hover:bg-pink-200 dark:bg-pink-900/30 dark:text-pink-300">
                        <Link href={`/dog/${dogId}/health/log`}>
                            <Heart className="mr-2 h-4 w-4" /> Logg Helse
                        </Link>
                    </Button>
                </div>
            </div>

            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xl font-semibold">
                        <Clock className="h-5 w-5 text-primary" /> Dagens plan
                    </div>
                    {!loading && todayDoses.length > 0 && !todayDoses.some(d => d.status === 'overdue') && (
                        <div className={cn(
                            "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold animate-in fade-in slide-in-from-right-2 duration-500",
                            todayDoses.every(d => d.status === 'taken')
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                                : "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border border-blue-100 dark:border-blue-800/50"
                        )}>
                            {todayDoses.every(d => d.status === 'taken') ? (
                                <><PartyPopper className="h-3.5 w-3.5" /> Full pot! Alt er gitt i dag.</>
                            ) : (
                                <><Sparkles className="h-3.5 w-3.5" /> Alt er i rute!</>
                            )}
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="text-muted-foreground">Laster plan...</div>
                ) : todayDoses.length === 0 ? (
                    <Card className="bg-muted/30 border-dashed">
                        <CardContent className="pt-6 text-center text-muted-foreground">
                            Ingenting på planen i dag.
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-3">
                        {todayDoses.map((dose, i) => {
                            const doseKey = `${dose.planId}-${dose.scheduledTime}`
                            const isProcessing = processingDoseKey === doseKey

                            return (
                                <Card key={i} className={cn(
                                    "transition-all border-l-4",
                                    dose.status === 'due' && "border-l-emerald-500 border-emerald-500/20 shadow-md shadow-emerald-500/5",
                                    dose.status === 'overdue' && "border-l-red-500 border-red-500/20 bg-red-500/5",
                                    dose.status === 'taken' && "border-l-muted-foreground/30 opacity-70 bg-muted/30"
                                )}>
                                    <div className="flex items-center p-4">
                                        <div className={cn(
                                            "w-16 text-center font-bold text-lg",
                                            dose.status === 'overdue' ? "text-red-500" : "text-foreground",
                                            dose.status === 'taken' && "text-muted-foreground decoration-line-through"
                                        )}>
                                            {dose.scheduledTime}
                                        </div>

                                        <div className="flex-1 px-4">
                                            {/* Using new MedicineBadge instead of plain text */}
                                            <div className="mb-1">
                                                <MedicineBadge
                                                    medicine={{ id: dose.medicineId, name: dose.medicineName }}
                                                    className={cn("text-base font-semibold", dose.status === 'taken' && "opacity-80")}
                                                />
                                            </div>
                                            <p className="text-sm text-muted-foreground">{dose.doseText}</p>
                                        </div>

                                        <div>
                                            <Button
                                                onClick={() => toggleDose(dose)}
                                                disabled={isProcessing}
                                                className={cn(
                                                    "min-w-[110px] font-semibold transition-all shadow-sm",
                                                    // Taken State
                                                    dose.status === 'taken' && "bg-emerald-100/10 text-emerald-500 border border-emerald-500/20 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30",
                                                    // Due State
                                                    dose.status === 'due' && "bg-emerald-600 hover:bg-emerald-700 text-white",
                                                    // Overdue State
                                                    dose.status === 'overdue' && "bg-red-600 hover:bg-red-700 text-white"
                                                )}
                                            >
                                                {isProcessing ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : dose.status === 'taken' ? (
                                                    <>
                                                        <CheckCircle className="mr-2 h-4 w-4" /> Gitt
                                                    </>
                                                ) : (
                                                    "Gi dose"
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </section>

            <section className="space-y-4 opacity-60">
                <div className="flex items-center gap-2 text-xl font-semibold text-muted-foreground">
                    <CalendarDays className="h-5 w-5" /> I morgen
                </div>
                {tomorrowDoses.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Ingen medisiner planlagt.</p>
                ) : (
                    <div className="grid gap-3">
                        {tomorrowDoses.map((dose, i) => (
                            <Card key={i} className="bg-muted/10 border-dashed">
                                <div className="flex items-center p-4">
                                    <div className="w-16 text-center font-bold text-lg text-muted-foreground">
                                        {dose.scheduledTime}
                                    </div>
                                    <div className="flex-1 px-4">
                                        <div className="mb-1">
                                            <MedicineBadge
                                                medicine={{ id: dose.medicineId, name: dose.medicineName }}
                                                className="opacity-90"
                                            />
                                        </div>
                                        <p className="text-sm text-muted-foreground">{dose.doseText}</p>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </section>

            {/* Mobile Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t z-50 md:hidden">
                <div className="max-w-2xl mx-auto flex gap-2">
                    <Button asChild variant="outline" className="flex-1 shadow-sm h-12">
                        <Link href={`/dog/${dogId}/history`}>Historikk</Link>
                    </Button>
                    <Button asChild className="flex-1 shadow-md h-12 bg-emerald-600 hover:bg-emerald-700">
                        <Link href={`/dog/${dogId}/medicines`}>
                            <Pill className="mr-2 h-4 w-4" /> Medisiner
                        </Link>
                    </Button>
                    <Button asChild variant="secondary" className="flex-1 shadow-sm h-12 bg-pink-100 text-pink-700 hover:bg-pink-200 dark:bg-pink-900/30 dark:text-pink-300">
                        <Link href={`/dog/${dogId}/health/log`}>
                            <Heart className="mr-2 h-4 w-4" /> Helse
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="pt-8 border-t flex flex-col items-center gap-4">
                {inviteCode && (
                    <Button variant="ghost" size="sm" onClick={handleInvite} className="text-muted-foreground">
                        <UserPlus className="mr-2 h-4 w-4" /> Del tilgang
                    </Button>
                )}
                {!showDeleteConfirm ? (
                    <Button variant="link" className="text-destructive/50 hover:text-destructive text-xs" onClick={() => setShowDeleteConfirm(true)}>
                        Slett hundeprofil
                    </Button>
                ) : (
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-100 dark:border-red-900/20 w-full">
                        <div className="text-center sm:text-left flex-1">
                            <p className="font-semibold text-destructive">Slette {dogName}?</p>
                            <p className="text-xs text-muted-foreground">All historikk vil bli borte for alltid.</p>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <Button variant="destructive" size="sm" onClick={handleDeleteDog}>Slett</Button>
                            <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>Avbryt</Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
