"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronLeft, ChevronRight, Clock, CheckCircle, Pill, CalendarDays, Loader2, Sparkles, PartyPopper, Trash2, UserPlus, Copy, Heart, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import { deleteDog } from "@/app/actions/dogs"
import { MedicineBadge } from "@/components/medicine-badge"
import { HealthLogModal } from "@/components/health-log-modal"

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
    takenAt?: string
    takenBy?: {
        name: string
        avatarUrl: string
    }
}

export default function DogDashboardPage() {
    const params = useParams()
    const searchParams = useSearchParams()
    const dogId = params.id as string

    // Date State Management
    const dateParam = searchParams.get("date")
    const [currentDate, setCurrentDate] = useState(new Date())

    // Update currentDate when URL param changes
    useEffect(() => {
        if (dateParam) {
            setCurrentDate(new Date(dateParam))
        } else {
            setCurrentDate(new Date())
        }
    }, [dateParam])

    const [loading, setLoading] = useState(true)
    const [dogName, setDogName] = useState("")
    const [inviteCode, setInviteCode] = useState("")
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [doses, setDoses] = useState<DoseEvent[]>([])

    // Key to track which dose is currently processing (planId-time)
    const [processingDoseKey, setProcessingDoseKey] = useState<string | null>(null)

    const supabase = createClient()
    const router = useRouter()

    const fetchData = useCallback(async () => {
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

            // Fetch Logs for SELECTED DATE
            const startOfDay = new Date(currentDate)
            startOfDay.setHours(0, 0, 0, 0)

            const endOfDay = new Date(currentDate)
            endOfDay.setHours(23, 59, 59, 999)

            const { data: logs } = await supabase
                .from("dose_logs")
                .select(`
                    id, 
                    plan_id, 
                    taken_at,
                    taken_by (
                        full_name,
                        avatar_url
                    )
                `)
                .in("medicine_id", medicineIds)
                .gte("taken_at", startOfDay.toISOString())
                .lte("taken_at", endOfDay.toISOString())

            if (plans) {
                const buildEvents = () => {
                    const events: DoseEvent[] = []
                    const now = new Date()
                    const isToday = now.toDateString() === currentDate.toDateString()
                    const isFutute = currentDate > now && !isToday
                    const isPast = currentDate < now && !isToday

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
                            events.push(createEvent(p, t, index, sortedLogs, currentTotalMins, isToday, isFutute, isPast))
                        })
                    })
                    return events.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
                }

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const createEvent = (p: any, t: string, index: number, sortedLogs: any[], currentMins: number, isToday: boolean, isFuture: boolean, isPast: boolean): DoseEvent => {
                    const [h, m] = t.split(':').map(Number)
                    const scheduledMins = h * 60 + m

                    let status: DoseEvent['status'] = 'upcoming'
                    let logId: string | undefined
                    let takenAt: string | undefined
                    let takenBy: { name: string, avatarUrl: string } | undefined

                    // Check if Taken
                    if (index < sortedLogs.length) {
                        status = 'taken'
                        const log = sortedLogs[index]
                        logId = log.id
                        takenAt = log.taken_at
                        if (log.taken_by) {
                            const profile = log.taken_by
                            takenBy = {
                                name: profile.full_name,
                                avatarUrl: profile.avatar_url
                            }
                        }
                    } else if (isPast) {
                        // Past date and not taken -> Overdue
                        status = 'overdue'
                    } else if (isFuture) {
                        // Future date -> Upcoming
                        status = 'upcoming'
                    } else if (isToday) {
                        // Today logic: All active doses for today show as "Due" (Green), never "Overdue" (Red)
                        status = 'due'
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
                        isToday: isToday, // Keep for UI styling
                        takenAt,
                        takenBy
                    }
                }

                setDoses(buildEvents())
            }
        }
        setLoading(false)
    }, [dogId, supabase, currentDate])

    useEffect(() => {
        fetchData()
    }, [fetchData])


    const toggleDose = async (dose: DoseEvent) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Restriction: Can only give doses for today
        if (!dose.isToday && dose.status !== 'taken') {
            alert("Du kan bare registrere doser for nåværende dato.")
            return
        }

        const doseKey = `${dose.planId}-${dose.scheduledTime}`

        // Optimistic Haptic Feedback (Android/Mobile)
        // Note: iOS Safari does NOT support navigator.vibrate at all.
        if (dose.status !== 'taken' && typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(200); } catch { /* ignore */ }
        }

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

    const changeDate = (days: number) => {
        const newDate = new Date(currentDate)
        newDate.setDate(newDate.getDate() + days)
        const dateString = newDate.toISOString().split('T')[0]
        router.push(`?date=${dateString}`)
    }

    // Helper to format date header
    const formatDateHeader = (date: Date) => {
        const now = new Date()
        const isToday = date.toDateString() === now.toDateString()
        const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === date.toDateString()
        const isTomorrow = new Date(new Date().setDate(new Date().getDate() + 1)).toDateString() === date.toDateString()

        if (isToday) return "I dag"
        if (isYesterday) return "I går"
        if (isTomorrow) return "I morgen"

        // Norweigan locale format
        return date.toLocaleDateString("nb-NO", { weekday: 'long', day: 'numeric', month: 'long' })
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">

            {/* Date Navigation Header */}
            <div className="flex flex-col gap-4 sticky top-16 z-40 md:static mt-4 md:mt-0 animate-in fade-in slide-in-from-top-4">

                {/* Top Actions Row */}
                <div className="flex items-center justify-between gap-2">
                    <HealthLogModal dogId={dogId} />

                    <div className="flex-1" /> {/* Spacer */}

                    {inviteCode && (
                        <Button variant="ghost" size="sm" onClick={handleInvite} className="bg-background/80 backdrop-blur border shadow-sm">
                            <UserPlus className="mr-2 h-4 w-4" /> Del tilgang
                        </Button>
                    )}
                </div>

                <div className="flex items-center justify-between bg-card/50 backdrop-blur-sm p-4 rounded-xl border shadow-sm w-full">
                    <Button variant="ghost" size="icon" onClick={() => changeDate(-1)} className="shrink-0">
                        <ChevronLeft className="h-6 w-6" />
                    </Button>

                    <div className="text-center flex-1 min-w-0 px-2">
                        <h2 className="text-lg font-bold capitalize flex items-center gap-2 justify-center truncate">
                            <Calendar className="h-4 w-4 text-primary shrink-0" />
                            <span className="truncate">{formatDateHeader(currentDate)}</span>
                        </h2>
                        <p className="text-xs text-muted-foreground truncate">
                            {currentDate.toLocaleDateString("nb-NO", { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    </div>

                    <Button variant="ghost" size="icon" onClick={() => changeDate(1)} className="shrink-0">
                        <ChevronRight className="h-6 w-6" />
                    </Button>
                </div>
            </div>

            {/* Doses List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center p-8 text-muted-foreground flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        Laster medisiner...
                    </div>
                ) : doses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-center bg-muted/20 rounded-lg border border-dashed">
                        <PartyPopper className="h-12 w-12 text-muted-foreground/30 mb-4" />
                        <p className="text-muted-foreground font-medium">Ingen medisiner planlagt denne dagen.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {doses.map((dose, i) => {
                            const doseKey = `${dose.planId}-${dose.scheduledTime}`
                            const isProcessing = processingDoseKey === doseKey
                            const isTaken = dose.status === 'taken'

                            return (
                                <div key={i} className="mb-2">
                                    <div className="ml-1 mb-1.5 text-sm font-bold flex items-center gap-2">
                                        <Clock className="w-3.5 h-3.5" />
                                        {dose.scheduledTime === "08:00" ? "Morgen (08:00)" : dose.scheduledTime === "20:00" ? "Kveld (20:00)" : dose.scheduledTime}
                                    </div>
                                    <Card className={cn(
                                        "transition-all border-l-4 w-full max-w-[368px] md:max-w-none",
                                        isTaken && "opacity-75 border-l-muted-foreground/30 bg-muted/30",
                                        !isTaken && dose.status === 'due' && "border-l-emerald-500 border-emerald-500/20 shadow-md shadow-emerald-500/5",
                                        !isTaken && dose.status === 'overdue' && "border-l-red-500 border-red-500/20 bg-red-500/5",
                                        !isTaken && dose.status === 'upcoming' && "border-l-blue-400/50"
                                    )}>
                                        <div className="flex items-center p-4 gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="mb-1.5">
                                                    <MedicineBadge
                                                        medicine={{ id: dose.medicineId, name: dose.medicineName }}
                                                        className={cn("text-base font-semibold max-w-full whitespace-normal break-words h-auto py-1", isTaken && "opacity-80")}
                                                    />
                                                </div>
                                                <p className="text-sm text-muted-foreground truncate">{dose.doseText}</p>
                                            </div>

                                            <div className="shrink-0">
                                                {isTaken ? (
                                                    <div className="flex flex-col items-end gap-1">
                                                        <Button
                                                            onClick={() => toggleDose(dose)}
                                                            disabled={isProcessing}
                                                            size="sm"
                                                            variant="outline"
                                                            className="min-w-[40px] px-3 font-semibold transition-all shadow-sm bg-emerald-100/10 text-emerald-500 border-emerald-500/20 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30"
                                                        >
                                                            {isProcessing ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <CheckCircle className="h-5 w-5" />
                                                            )}
                                                        </Button>

                                                        {dose.takenBy && dose.takenAt && (
                                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground animate-in fade-in slide-in-from-right-2">
                                                                {dose.takenBy.avatarUrl ? (
                                                                    <img
                                                                        src={dose.takenBy.avatarUrl}
                                                                        alt={dose.takenBy.name}
                                                                        className="w-4 h-4 rounded-full border shadow-sm"
                                                                        title={`Gitt av ${dose.takenBy.name}`}
                                                                    />
                                                                ) : (
                                                                    <div
                                                                        className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center text-[8px] font-bold border"
                                                                        title={`Gitt av ${dose.takenBy.name}`}
                                                                    >
                                                                        {dose.takenBy.name?.[0]?.toUpperCase() || "?"}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <Button
                                                        onClick={() => toggleDose(dose)}
                                                        disabled={isProcessing || !dose.isToday}
                                                        size="sm"
                                                        className={cn(
                                                            "font-semibold transition-all shadow-sm px-4",
                                                            dose.status === 'due' && "bg-emerald-600 hover:bg-emerald-700 text-white",
                                                            dose.status === 'overdue' && "bg-red-600 hover:bg-red-700 text-white",
                                                            dose.status === 'upcoming' && "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                                                            !dose.isToday && "opacity-50 cursor-not-allowed bg-muted text-muted-foreground hover:bg-muted"
                                                        )}
                                                    >
                                                        {isProcessing ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            "Gi dose"
                                                        )}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </Card>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            <div className="pt-8 border-t flex flex-col items-center gap-4">
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
