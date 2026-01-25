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
import { getMedicineColor, getSoftColor } from "@/lib/medicine-utils"
import { DoseIcon } from "@/components/dose-icon"
import { HealthLogModal } from "@/components/health-log-modal"
import { motion, AnimatePresence } from "framer-motion"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type DoseEvent = {
    logId?: string
    planId: string
    medicineId: string
    dogId: string
    medicineName: string
    medicineColor?: string
    medicineNotes?: string
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
    const [doses, setDoses] = useState<DoseEvent[]>([])

    // Key to track which dose is currently processing (planId-time)
    const [processingDoseKey, setProcessingDoseKey] = useState<string | null>(null)
    const [pendingDose, setPendingDose] = useState<DoseEvent | null>(null)

    // Swipe State
    const [touchStart, setTouchStart] = useState<number | null>(null)
    const [touchEnd, setTouchEnd] = useState<number | null>(null)
    const [direction, setDirection] = useState(0) // -1 for left (prev), 1 for right (next)

    // Minimum swipe distance (in px) 
    const minSwipeDistance = 50

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null) // Reset
        setTouchStart(e.targetTouches[0].clientX)
    }

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX)
    }

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return
        const distance = touchStart - touchEnd
        const isLeftSwipe = distance > minSwipeDistance
        const isRightSwipe = distance < -minSwipeDistance

        if (isLeftSwipe) {
            changeDate(1) // Next day
        }
        if (isRightSwipe) {
            changeDate(-1) // Prev day
        }
    }

    const supabase = createClient()
    const router = useRouter()

    const fetchData = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // 1. Fetch Dog Info
        const { data: dog } = await supabase.from('dogs').select('name').eq('id', dogId).single()
        if (dog) {
            setDogName(dog.name)
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
             medicine:medicines (name, strength, color, notes)
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
                        medicineColor: p.medicine.color,
                        medicineNotes: p.medicine.notes,
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



    const executeDoseToggle = async (dose: DoseEvent, useScheduledTime = false) => {
        const doseKey = `${dose.planId}-${dose.scheduledTime}`
        setProcessingDoseKey(doseKey)
        setPendingDose(null) // Close dialog if open

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            if (dose.status === 'taken') {
                // DELETE (Undo)
                if (dose.logId) {
                    const { error } = await supabase.from("dose_logs").delete().eq('id', dose.logId)
                    if (error) throw error
                }
            } else {
                // INSERT (Mark Given)
                let takenAt = new Date().toISOString()

                // If historical/scheduled time requested
                if (useScheduledTime) {
                    // Construct timestamp from currentDate + scheduledTime
                    const [hours, minutes] = dose.scheduledTime.split(':').map(Number)
                    const date = new Date(currentDate)
                    date.setHours(hours, minutes, 0, 0)
                    takenAt = date.toISOString()
                }

                const { error } = await supabase.from("dose_logs").insert({
                    plan_id: dose.planId,
                    medicine_id: dose.medicineId,
                    dog_id: dose.dogId,
                    taken_by: user.id,
                    taken_at: takenAt,
                    status: 'taken',
                    notes: useScheduledTime ? 'Logget tilbake i tid' : 'Markert fra dashboard'
                })
                if (error) throw error

                // 2. Trigger notifications for other members
                try {
                    fetch('/api/notifications/notify-taken', {
                        method: 'POST',
                        body: JSON.stringify({
                            dogId: dose.dogId,
                            medicineName: dose.medicineName,
                            status: 'taken'
                        }),
                        headers: { 'Content-Type': 'application/json' }
                    }).catch(err => console.error("Notification trigger failed:", err))
                } catch (e) {
                    console.error("Fetch failed", e)
                }
            }
            // Optimistic Haptic Feedback (Android/Mobile)
            if (dose.status !== 'taken' && typeof navigator !== 'undefined' && navigator.vibrate) {
                try { navigator.vibrate(200); } catch { /* ignore */ }
            }

            // If successful, refresh data to update UI
            await fetchData()
        } catch (error: unknown) {
            console.error("Toggle failed:", error)
            const message = error instanceof Error ? error.message : "Ukjent feil"
            alert("Handling feilet: " + message)
        } finally {
            setProcessingDoseKey(null)
        }
    }

    const toggleDose = async (dose: DoseEvent) => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // 1. If checking off a past date (not today), ask for confirmation
        const todayStr = new Date().toLocaleDateString('nb-NO')
        const currentStr = currentDate.toLocaleDateString('nb-NO')

        // If it's a past date (and not already taken)
        if (currentDate < new Date() && currentStr !== todayStr && dose.status !== 'taken') {
            setPendingDose(dose)
            return
        }

        // 2. Logic for Today or Future (Future blocked usually)
        // Restriction: Can only give doses for today (or past via dialog above)
        if (!dose.isToday && dose.status !== 'taken') {
            // If we are here, it means it is a future date because past is handled above
            alert("Du kan ikke loggføre doser frem i tid.")
            return
        }

        // Execute immediately for today/undo
        executeDoseToggle(dose)
    }



    const changeDate = (days: number) => {
        const dir = days > 0 ? 1 : -1
        setDirection(dir)
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

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 100 : -100, // Increased distance
            opacity: 0,
            scale: 0.95
        }),
        center: {
            x: 0,
            opacity: 1,
            scale: 1,
            transition: { duration: 0.15, ease: "easeOut" as const }
        },
        exit: (direction: number) => ({
            x: direction > 0 ? -100 : 100,
            opacity: 0,
            scale: 0.95,
            transition: { duration: 0.1, ease: "easeIn" as const }
        })
    }

    return (
        <div
            className="max-w-5xl mx-auto min-h-[50vh] pb-32"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >

            {/* Date Navigation Header */}
            <div className="flex flex-col gap-2 sticky top-14 z-40 md:static md:mt-0 animate-in fade-in slide-in-from-top-4 bg-background pb-2">

                <div className="flex items-center justify-between gap-2 py-2">
                    {/* HealthLogModal moved to FAB */}
                </div>

                <div className="flex items-center justify-between bg-background p-4 rounded-xl border shadow-sm w-full">
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
            <div className="space-y-4 overflow-hidden min-h-[300px]">
                <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                        key={currentDate.toISOString()}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        className="grid gap-4"
                    >
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
                            doses.map((dose, i) => {
                                const doseKey = `${dose.planId}-${dose.scheduledTime}`
                                const isProcessing = processingDoseKey === doseKey
                                const isTaken = dose.status === 'taken'
                                const baseColor = getMedicineColor(dose.medicineId, dose.medicineColor)
                                const softStyle = getSoftColor(baseColor)

                                return (
                                    <div key={i} className="ml-4 pl-6 relative border-l-2 border-muted pb-6 last:pb-0 last:border-l-0">
                                        {/* Timeline Dot */}
                                        <div className={cn(
                                            "absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 bg-background transition-colors z-10",
                                            isTaken ? "border-emerald-500 bg-emerald-500" : (dose.status === 'overdue' ? "border-red-500" : "border-primary")
                                        )}>
                                            {isTaken && <CheckCircle className="h-3 w-3 text-white m-[0.5px]" />}
                                        </div>

                                        {/* Time Header (Above Card) */}
                                        <div className="flex items-center gap-2 mb-2 -mt-1">
                                            <span className="text-sm font-bold text-muted-foreground font-mono">{dose.scheduledTime}</span>
                                        </div>

                                        <Card className={cn(
                                            "transition-all overflow-hidden shadow-sm border",
                                            softStyle, // Always apply color
                                            isTaken ? "opacity-60" : "", // Just fade it when taken
                                            !isTaken && dose.status === 'overdue' && "border-red-500 ring-1 ring-red-500/20"
                                        )}>
                                            <div className="flex items-center p-3 gap-3">
                                                {/* Icon Column (Dose Amount) */}
                                                <div className="shrink-0 flex items-center justify-center min-w-[40px]">
                                                    <DoseIcon doseText={dose.doseText} className="text-current opacity-80" itemClassName="h-6 w-6" />
                                                </div>

                                                {/* Middle side: Medicine Info */}
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-base leading-tight break-words">{dose.medicineName}</span>
                                                        <span className="text-xs font-bold uppercase tracking-wider opacity-90 mt-1">{dose.doseText}</span>
                                                    </div>
                                                </div>

                                                {/* Right side: Action */}
                                                <div className="shrink-0">
                                                    {!isTaken ? (
                                                        <Button
                                                            onClick={() => toggleDose(dose)}
                                                            disabled={isProcessing || (!dose.isToday && currentDate > new Date())}
                                                            size="sm"
                                                            className={cn(
                                                                "h-9 px-4 font-bold text-xs transition-all shadow-md active:scale-95",
                                                                dose.status === 'upcoming' ? "bg-background text-foreground border border-input hover:bg-muted" : "bg-primary text-primary-foreground hover:bg-primary/90",
                                                                (!dose.isToday && currentDate > new Date()) && "opacity-50 cursor-not-allowed"
                                                            )}
                                                        >
                                                            {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : "Gi dose"}
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            onClick={() => toggleDose(dose)}
                                                            disabled={isProcessing}
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-9 px-3 text-muted-foreground hover:text-red-500 font-bold text-xs"
                                                        >
                                                            {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : "Angre"}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </Card>
                                    </div>
                                )
                            })
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>


            <AlertDialog open={!!pendingDose} onOpenChange={(open) => !open && setPendingDose(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Loggføre tilbake i tid?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Vil du loggføre <strong>{pendingDose?.medicineName}</strong> som gitt på det planlagte tidspunktet?
                            <br /><br />
                            Tidspunkt: <strong>{pendingDose?.scheduledTime}</strong>
                            <br />
                            Dato: <strong>{currentDate.toLocaleDateString('nb-NO')}</strong>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Avbryt</AlertDialogCancel>
                        <AlertDialogAction onClick={() => pendingDose && executeDoseToggle(pendingDose, true)}>
                            Ja, loggføre
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div>
    )
}
