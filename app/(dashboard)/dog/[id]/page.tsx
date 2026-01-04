"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Clock, CheckCircle, Pill, CalendarDays, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Trash2 } from "lucide-react"
import { deleteDog } from "@/app/actions/dogs"

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
        const { data: dog } = await supabase.from("dogs").select("name").eq("id", dogId).single()
        if (dog) setDogName(dog.name)

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
        if (confirm("Er du sikker på at du vil slette denne hundeprofilen? Dette kan ikke angres.")) {
            // Loading state?
            const res = await deleteDog(dogId)
            if (res?.message) {
                alert(res.message)
            }
        }
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{dogName}</h1>
                    <p className="text-muted-foreground">Medication Tracker</p>
                </div>
                <div className="flex gap-2">
                    <Button asChild variant="outline">
                        <Link href={`/dog/${dogId}/history`}>History</Link>
                    </Button>
                    <Button asChild>
                        <Link href={`/dog/${dogId}/medicines`}>
                            <Pill className="mr-2 h-4 w-4" /> Medicines
                        </Link>
                    </Button>
                </div>
            </div>

            <section className="space-y-4">
                <div className="flex items-center gap-2 text-xl font-semibold">
                    <Clock className="h-5 w-5 text-primary" /> Schedule for Today
                </div>

                {loading ? (
                    <div className="text-muted-foreground">Loading schedule...</div>
                ) : todayDoses.length === 0 ? (
                    <Card className="bg-muted/30 border-dashed">
                        <CardContent className="pt-6 text-center text-muted-foreground">
                            Nothing scheduled for today.
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
                                            <h3 className={cn("font-semibold text-lg leading-none", dose.status === 'taken' && "decoration-line-through text-muted-foreground")}>
                                                {dose.medicineName}
                                            </h3>
                                            <p className="text-sm text-muted-foreground mt-1">{dose.doseText}</p>
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
                                                        <CheckCircle className="mr-2 h-4 w-4" /> Given
                                                    </>
                                                ) : (
                                                    "Mark Given"
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
                    <CalendarDays className="h-5 w-5" /> Tomorrow
                </div>
                {tomorrowDoses.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No medicines scheduled.</p>
                ) : (
                    <div className="grid gap-3">
                        {tomorrowDoses.map((dose, i) => (
                            <Card key={i} className="bg-muted/10 border-dashed">
                                <div className="flex items-center p-4">
                                    <div className="w-16 text-center font-bold text-lg text-muted-foreground">
                                        {dose.scheduledTime}
                                    </div>
                                    <div className="flex-1 px-4">
                                        <h3 className="font-semibold text-lg text-muted-foreground">
                                            {dose.medicineName}
                                        </h3>
                                        <p className="text-sm text-muted-foreground mt-1">{dose.doseText}</p>
                                    </div>
                                </div>
                            </Card>
                    </div>
                )}
            </section>

            <div className="pt-8 border-t">
                <Button variant="outline" className="w-full sm:w-auto text-destructive hover:bg-destructive/10 border-destructive/50" onClick={handleDeleteDog}>
                    <Trash2 className="mr-2 h-4 w-4" /> Slett Hundeprofil
                </Button>
            </div>
        </div>
    )
}
