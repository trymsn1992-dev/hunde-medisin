"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calendar as CalendarIcon, List as ListIcon, ChevronLeft, ChevronRight, Activity, Heart, AlertCircle, Trash2, Sparkles, Bot, Loader2, Pill } from "lucide-react"
import { cn } from "@/lib/utils"
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
// date-fns
import { nb } from "date-fns/locale"
import {
    differenceInCalendarDays,
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    addMonths,
    subMonths,
    isSameMonth,
    isSameDay,
    isToday
} from "date-fns"
import { getMedicineColor } from "@/lib/medicine-utils"
import { MedicineBadge } from "@/components/medicine-badge"
import { getHealthLogs, deleteHealthLog } from "@/app/actions/health"


export default function HistoryPage() {
    const params = useParams()
    const dogId = params.id as string
    const searchParams = useSearchParams()

    // State
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [doseLogs, setDoseLogs] = useState<any[]>([])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [healthLogs, setHealthLogs] = useState<any[]>([])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [medicines, setMedicines] = useState<any[]>([])
    const [selectedMedicine, setSelectedMedicine] = useState<string>("all")
    const [loading, setLoading] = useState(true)
    const [view, setView] = useState<'list' | 'calendar'>('list')

    // Custom Calendar State
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())
    const [entryToDelete, setEntryToDelete] = useState<string | null>(null)



    const toggleExpand = (id: string) => {
        setExpandedLogs(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const supabase = createClient()

    // Load initial data
    useEffect(() => {
        const load = async () => {
            // 1. Medicines
            const { data: medData } = await supabase
                .from('medicines')
                .select(`
                    id, 
                    name,
                    plans:medication_plans(
                        start_date,
                        end_date,
                        active,
                        created_at
                    )
                `)
                .eq('dog_id', dogId)
                .order('name')
            setMedicines(medData || [])

            // 2. Dose Logs 
            const { data: logData } = await supabase
                .from('dose_logs')
                .select(`
                    id,
                    taken_at,
                    notes,
                    status,
                    medicine:medicines(id, name, color),
                    taker:taken_by(full_name)
                `)
                .eq('dog_id', dogId)
                .order('taken_at', { ascending: false })
                .limit(500)
            setDoseLogs(logData || [])

            // 3. Health Logs
            const hLogs = await getHealthLogs(dogId)
            setHealthLogs(hLogs || [])

            setLoading(false)
        }
        load()
    }, [dogId, supabase])

    // Handling URL params
    useEffect(() => {
        const medId = searchParams.get("medicineId")
        if (medId) setSelectedMedicine(medId)
    }, [searchParams])
    const handleDeleteClick = (logId: string) => {
        setEntryToDelete(logId)
    }

    const executeDelete = async () => {
        if (!entryToDelete) return

        try {
            console.log("Attempting to delete log:", entryToDelete)
            const res = await deleteHealthLog(entryToDelete)
            if (res.success) {
                setHealthLogs(prev => prev.filter(h => h.id !== entryToDelete))
                setEntryToDelete(null)
            } else {
                console.error("Delete failed:", res.error)
                alert("Kunne ikke slette logg: " + res.error)
            }
        } catch (err) {
            console.error("Delete exception:", err)
            alert("En feil oppstod under sletting.")
        }
    }



    // Filter Logs (Doses only, health logs are fundamentally different but could be filtered if we want "Health Only")
    // For now, let's keep Health Logs always visible in "All" or "Calendar" view, but maybe hide in specific medicine filter?
    // User probably wants to see context. Let's show everything if "All", otherwise filter doses.
    const filteredDoseLogs = useMemo(() => {
        if (selectedMedicine === "all") return doseLogs
        if (selectedMedicine === "health_only") return []
        return doseLogs.filter(l => l.medicine?.id === selectedMedicine)
    }, [selectedMedicine, doseLogs])

    // --- Stats Logic (Dose Only) ---
    const summaryStats = useMemo(() => {
        if (selectedMedicine === 'all' || filteredDoseLogs.length === 0) return null

        // Existing Frequency Logic
        const takenLogs = filteredDoseLogs.filter(l => l.status === 'taken')
        const count = takenLogs.length

        let freqText = ""
        if (count > 0) {
            const sorted = [...takenLogs].sort((a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime())
            const firstDate = new Date(sorted[0].taken_at)
            const daysDiff = differenceInCalendarDays(new Date(), firstDate) || 1
            const perDay = count / daysDiff

            let freqLabel = `ca. ${perDay.toFixed(1)} / dag`
            if (Math.abs(perDay - 1) < 0.2) freqLabel = "1 gang daglig"
            else if (Math.abs(perDay - 2) < 0.2) freqLabel = "2 ganger daglig"

            freqText = `${freqLabel} (Totalt ${count})`
        }

        // Plan Details
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const med = medicines.find((m: any) => m.id === selectedMedicine)
        let planInfo = null
        if (med && med.plans && med.plans.length > 0) {
            // Find earliest start and latest end
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const sortedPlans = [...med.plans].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            const firstPlan = sortedPlans[0]
            const lastPlan = sortedPlans[sortedPlans.length - 1]

            const startDate = new Date(firstPlan.start_date).toLocaleDateString('nb-NO')
            const endDate = lastPlan.end_date ? new Date(lastPlan.end_date).toLocaleDateString('nb-NO') : "Løpende"

            planInfo = { startDate, endDate, isActive: lastPlan.active }
        }

        return {
            freqText,
            count,
            planInfo
        }
    }, [filteredDoseLogs, selectedMedicine, medicines])

    // --- List View Grouping (Mix Doses and Health) ---
    const combinedListLogs = useMemo(() => {
        // Transform health logs to match a unified shape for sorting
        const healthAsLogs = healthLogs.map(h => ({
            id: h.id,
            type: 'health',
            timestamp: h.created_at, // Use created_at for sorting time, or date? Date is just YYYY-MM-DD. Let's use created_at if available or date + noon
            data: h
        }))

        const dosesAsLogs = filteredDoseLogs.map(d => ({
            id: d.id,
            type: 'dose',
            timestamp: d.taken_at,
            data: d
        }))

        // If filtering by specific medicine, maybe we exclude health logs? 
        // Or keep them for context? Let's exclude them if specific medicine selected to reduce noise, unless user asks.
        let all;
        if (selectedMedicine === 'all') {
            all = [...dosesAsLogs, ...healthAsLogs]
        } else if (selectedMedicine === 'health_only') {
            all = [...healthAsLogs]
        } else {
            all = [...dosesAsLogs]
        }

        return all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    }, [filteredDoseLogs, healthLogs, selectedMedicine])

    const groupedListLogs = useMemo(() => {
        const groups: Record<string, typeof combinedListLogs> = {}
        combinedListLogs.forEach(log => {
            const date = new Date(log.timestamp)
            const today = new Date()
            const yesterday = new Date()
            yesterday.setDate(yesterday.getDate() - 1)
            let key = date.toLocaleDateString('nb-NO')
            if (date.toDateString() === today.toDateString()) key = "I dag"
            else if (date.toDateString() === yesterday.toDateString()) key = "I går"
            if (!groups[key]) groups[key] = []
            groups[key].push(log)
        })

        // Sort items WITHIN each day
        Object.keys(groups).forEach(key => {
            groups[key].sort((a, b) => {
                // 1. Health logs always first
                if (a.type === 'health' && b.type !== 'health') return -1
                if (a.type !== 'health' && b.type === 'health') return 1

                // 2. Then sort by time (Early -> Late)
                return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            })
        })

        return groups
    }, [combinedListLogs])

    const sortedGroups = Object.keys(groupedListLogs).sort((a, b) => {
        if (a === "I dag") return -1; if (b === "I dag") return 1
        if (a === "I går") return -1; if (b === "I går") return 1
        const [d1, m1, y1] = a.split('.').map(Number); const [d2, m2, y2] = b.split('.').map(Number)
        if (!y1) return 0
        return new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()
    })

    // Calendar Data Map
    const calendarDaysMap = useMemo(() => {
        const days: Record<string, { doses: any[], health: any[] }> = {}

        // Map Doses
        filteredDoseLogs.forEach(log => {
            const dayKey = format(new Date(log.taken_at), 'yyyy-MM-dd')
            if (!days[dayKey]) days[dayKey] = { doses: [], health: [] }
            days[dayKey].doses.push(log)
        })

        // Map Health (Only if viewing all or health only)
        if (selectedMedicine === 'all' || selectedMedicine === 'health_only') {
            healthLogs.forEach(log => {
                const dayKey = log.date // YYYY-MM-DD
                if (!days[dayKey]) days[dayKey] = { doses: [], health: [] }
                days[dayKey].health.push(log)
            })
        }
        return days
    }, [filteredDoseLogs, healthLogs, selectedMedicine])

    // Generate Grid Days
    const calendarGrid = useMemo(() => {
        const monthStart = startOfMonth(currentMonth)
        const monthEnd = endOfMonth(monthStart)
        const startDate = startOfWeek(monthStart, { locale: nb })
        const endDate = endOfWeek(monthEnd, { locale: nb })
        return eachDayOfInterval({ start: startDate, end: endDate })
    }, [currentMonth])

    const weekDays = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"]

    return (
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col max-w-5xl mx-auto">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={`/dog/${dogId}`}><ArrowLeft className="h-5 w-5" /></Link>
                    </Button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select
                        className="flex-1 sm:w-[200px] h-10 px-3 rounded-md border border-input bg-background text-sm"
                        value={selectedMedicine}
                        onChange={(e) => setSelectedMedicine(e.target.value)}
                    >
                        <option value="all">Vis alt</option>
                        <option value="health_only">Helselogg</option>
                        {medicines.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>

                    <div className="flex border rounded-md overflow-hidden bg-background">
                        <Button
                            variant={view === 'list' ? 'secondary' : 'ghost'}
                            size="icon"
                            onClick={() => setView('list')}
                            className="rounded-none h-10 w-10"
                        >
                            <ListIcon className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={view === 'calendar' ? 'secondary' : 'ghost'}
                            size="icon"
                            onClick={() => setView('calendar')}
                            className="rounded-none h-10 w-10"
                        >
                            <CalendarIcon className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            {view === 'list' ? (
                <div className="flex-1 overflow-auto">



                    {/* Headers for List View */}
                    {summaryStats && (
                        <div className="bg-green-50/50 border border-green-200 dark:bg-green-900/10 dark:border-green-800 rounded-xl p-5 flex flex-col md:flex-row gap-6 text-foreground mb-6 shrink-0 shadow-sm">

                            {/* Left: Med Info */}
                            <div className="flex items-start gap-4 flex-1">
                                <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0 border border-green-200 dark:border-green-700">
                                    <Pill className="h-6 w-6 text-green-700 dark:text-green-300" />
                                </div>
                                <div className="space-y-1">
                                    <h2 className="font-bold text-xl">{medicines.find(m => m.id === selectedMedicine)?.name}</h2>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium">
                                        {summaryStats.planInfo && (
                                            <>
                                                <span className="text-muted-foreground">Startet: <span className="text-foreground">{summaryStats.planInfo.startDate}</span></span>
                                                <span className="text-muted-foreground">Slutt: <span className="text-foreground">{summaryStats.planInfo.endDate}</span></span>
                                            </>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        {summaryStats.planInfo?.isActive ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800">
                                                Aktiv
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-800">
                                                Avsluttet/Pauset
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right: Stats */}
                            <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-green-200 dark:border-green-800/50 pt-4 md:pt-0 md:pl-6">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-0.5">Totalt gitt</p>
                                    <p className="text-2xl font-bold">{summaryStats.count} doser</p>
                                    <p className="text-xs text-muted-foreground font-medium">{summaryStats.freqText.split('(')[0]}</p>
                                </div>
                            </div>

                        </div>
                    )}

                    {loading ? <div className="text-center py-10">Laster...</div> : (
                        <div className="space-y-8 pb-10">
                            {combinedListLogs.length === 0 ? (
                                <p className="text-muted-foreground text-center py-10">Ingen loggføringer funnet.</p>
                            ) : (
                                sortedGroups.map(groupKey => (
                                    <section key={groupKey} className="space-y-3">
                                        <h3 className="font-semibold text-lg text-muted-foreground border-b pb-2 mb-2 sticky top-0 bg-background z-10">
                                            {groupKey}
                                        </h3>
                                        {groupedListLogs[groupKey].map(item => {
                                            if (item.type === 'dose') {
                                                const log = item.data
                                                return (
                                                    <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="font-bold text-lg">
                                                                    {new Date(log.taken_at).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                                <MedicineBadge medicine={log.medicine} size="sm" className="ml-2" />
                                                            </div>
                                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                                <span>{log.taker?.full_name?.split(' ')[0]}</span>
                                                                {log.notes && <span className="italic truncate">- &quot;{log.notes}&quot;</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            } else {
                                                const log = item.data
                                                const isExpanded = expandedLogs.has(log.id)
                                                // Simplified Health Card in List
                                                return (
                                                    <div
                                                        key={log.id}
                                                        onClick={() => toggleExpand(log.id)}
                                                        className={cn(
                                                            "flex items-start gap-4 p-3 rounded-lg border transition-all cursor-pointer",
                                                            isExpanded ? "bg-pink-50 dark:bg-pink-900/20 border-pink-200" : "bg-pink-50/50 dark:bg-pink-900/10 border-pink-100 dark:border-pink-900/20"
                                                        )}
                                                    >
                                                        <div className="h-8 w-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center shrink-0">
                                                            <Heart className="h-4 w-4" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold">Helselogg</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            handleDeleteClick(log.id)
                                                                        }}
                                                                        className="p-1 hover:bg-red-100 rounded text-red-400 hover:text-red-600 transition-colors"
                                                                    >
                                                                        <Trash2 className="h-3 w-3" />
                                                                    </button>
                                                                </div>
                                                                <span className="text-xs text-muted-foreground">Logget {new Date(log.created_at).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}</span>
                                                            </div>
                                                            <div className="flex flex-wrap gap-2 text-xs">
                                                                {isExpanded ? (
                                                                    <>
                                                                        <span className={cn("px-2 py-0.5 rounded-full", log.is_playful ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                                                                            Leken: {log.is_playful ? "Ja" : "Nei"}
                                                                        </span>
                                                                        <span className={cn("px-2 py-0.5 rounded-full", log.wants_walk ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                                                                            Turlyst: {log.wants_walk ? "Ja" : "Nei"}
                                                                        </span>
                                                                        <span className={cn("px-2 py-0.5 rounded-full", log.is_hungry ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                                                                            Matlyst: {log.is_hungry ? "Ja" : "Nei"}
                                                                        </span>
                                                                        <span className={cn("px-2 py-0.5 rounded-full", log.is_thirsty ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                                                                            Tørst: {log.is_thirsty ? "Ja" : "Nei"}
                                                                        </span>
                                                                        <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                                                                            Avføring: {log.stool || "Ikke registrert"}
                                                                        </span>
                                                                        {log.itch_locations && log.itch_locations.length > 0 && (
                                                                            <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                                                                                Kløe: {log.itch_locations.join(', ')}
                                                                            </span>
                                                                        )}
                                                                        {log.notes && <div className="w-full mt-2 p-2 bg-white/50 rounded text-xs italic">"{log.notes}"</div>}
                                                                        <div className="w-full text-right text-[10px] text-pink-600 font-semibold mt-1">Klikk for å se mindre</div>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        {!log.is_playful && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Ikke leken</span>}
                                                                        {!log.wants_walk && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Vil ikke gå tur</span>}
                                                                        {!log.is_hungry && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Ingen matlyst</span>}
                                                                        {!log.is_thirsty && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Ikke tørst</span>}

                                                                        {log.stool && log.stool !== 'Normal' && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Avføring: {log.stool}</span>}
                                                                        {log.itch_locations && log.itch_locations.length > 0 && (
                                                                            <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Kløe: {log.itch_locations.join(', ')}</span>
                                                                        )}
                                                                        <div className="w-full text-right text-[10px] text-pink-400 font-semibold mt-1">Klikk for se full logg</div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            }
                                        })}
                                    </section>
                                ))
                            )}
                        </div>
                    )}
                </div>
            ) : (
                /* CALENDAR GRID VIEW */
                <div className="flex flex-col flex-1 bg-card border rounded-xl overflow-hidden shadow-sm min-h-0">
                    {/* Calendar Controls */}
                    <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                        <div className="font-bold text-lg capitalize pl-2">
                            {format(currentMonth, 'MMMM yyyy', { locale: nb })}
                        </div>
                        <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                                <ChevronRight className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 border-b bg-muted/10 divide-x text-center shrink-0">
                        {weekDays.map(day => (
                            <div key={day} className="py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Cells */}
                    <div className="grid grid-cols-7 bg-muted/30 gap-px border-b flex-1 overflow-y-auto min-h-0 shadow-inner">
                        {calendarGrid.map((date, idx) => {
                            const isCurrentMonth = isSameMonth(date, currentMonth)
                            const dateKey = format(date, 'yyyy-MM-dd')
                            const dayData = calendarDaysMap[dateKey] || { doses: [], health: [] }
                            const isSelected = selectedDate && isSameDay(date, selectedDate)

                            const hasHealthIssues = dayData.health.some((h: any) =>
                                (h.stool && h.stool !== 'Normal') ||
                                (h.itch_locations && h.itch_locations.length > 0) ||
                                !h.is_playful || !h.wants_walk || !h.is_hungry || !h.is_thirsty
                            )

                            return (
                                <div
                                    key={dateKey}
                                    onClick={() => setSelectedDate(date)}
                                    className={cn(
                                        "bg-background p-1.5 flex flex-col relative transition-all duration-200 cursor-pointer hover:bg-accent/40 min-h-[120px] sm:min-h-[140px] group",
                                        !isCurrentMonth && "bg-muted/5 opacity-50",
                                        isSelected && "ring-2 ring-primary ring-inset z-10 bg-primary/5 shadow-md"
                                    )}
                                >
                                    <div className="flex justify-between items-center mb-1.5">
                                        {/* Date Number */}
                                        <div className={cn(
                                            "text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-transform group-hover:scale-110",
                                            isToday(date) ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                                        )}>
                                            {format(date, 'd')}
                                        </div>

                                        {/* Health Indicators */}
                                        <div className="flex gap-1">
                                            {hasHealthIssues && (
                                                <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_5px_rgba(239,68,68,0.5)]" title="Helseavvik" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Events List (Doses) */}
                                    <div className="flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar pt-1">
                                        {dayData.doses.slice(0, 6).map(log => {
                                            const bgClass = getMedicineColor(log.medicine?.id, log.medicine?.color)
                                            const isMissed = log.status === 'missed'
                                            return (
                                                <div
                                                    key={log.id}
                                                    className={cn(
                                                        "flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] text-[9px] sm:text-[10px] font-bold border-l-2 shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-all hover:translate-x-0.5",
                                                        bgClass,
                                                        "bg-opacity-10 text-foreground border-opacity-100 dark:bg-opacity-20",
                                                        isMissed && "opacity-60 grayscale-[0.5] border-dashed"
                                                    )}
                                                    style={{ borderLeftColor: 'currentColor' }}
                                                >
                                                    <span className="truncate flex-1">
                                                        {isMissed && "⚠️ "}{log.medicine?.name}
                                                    </span>
                                                    <span className="opacity-60 font-medium shrink-0 tabular-nums">{format(new Date(log.taken_at), 'HH:mm')}</span>
                                                </div>
                                            )
                                        })}
                                        {dayData.doses.length > 6 && (
                                            <div className="text-[9px] font-black text-primary/70 text-center pt-0.5 tracking-tighter uppercase italic">
                                                +{dayData.doses.length - 6} til...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Selected Date Details (Footer) */}
                    {selectedDate && (
                        <div className="p-3 bg-muted/10 border-t shrink-0 max-h-[40vh] overflow-auto">
                            <h3 className="font-semibold mb-2 text-sm flex items-center justify-between sticky top-0 bg-transparent backdrop-blur-sm z-10 pb-2">
                                <span>Detaljer {format(selectedDate, 'd. MMMM', { locale: nb })}</span>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSelectedDate(null)}>✕</Button>
                            </h3>
                            {(() => {
                                const dayKey = format(selectedDate, 'yyyy-MM-dd')
                                const dayData = calendarDaysMap[dayKey]
                                const hasDoses = dayData?.doses.length > 0
                                const hasHealth = dayData?.health.length > 0

                                if (!hasDoses && !hasHealth) return <p className="text-xs text-muted-foreground">Ingen hendelser.</p>

                                return (
                                    <div className="space-y-4">
                                        {/* Health Section */}
                                        {hasHealth && dayData.health.map((h: any) => {
                                            const isExpanded = expandedLogs.has(h.id)
                                            return (
                                                <div
                                                    key={h.id}
                                                    onClick={() => toggleExpand(h.id)}
                                                    className={cn(
                                                        "bg-pink-50/50 dark:bg-pink-900/10 border border-pink-100 dark:border-pink-900/20 rounded-md p-3 text-sm space-y-2 cursor-pointer transition-colors",
                                                        isExpanded && "bg-pink-50 border-pink-200"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between font-medium text-pink-700 dark:text-pink-300">
                                                        <div className="flex items-center gap-2">
                                                            <Heart className="h-4 w-4" /> Helselogg
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleDeleteClick(h.id)
                                                            }}
                                                            className="p-1 hover:bg-black/5 rounded text-muted-foreground hover:text-red-600 transition-colors"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2 text-xs">
                                                        {isExpanded ? (
                                                            <>
                                                                <span className={cn("px-2 py-0.5 rounded", h.is_playful ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                                                                    Leken: {h.is_playful ? "Ja" : "Nei"}
                                                                </span>
                                                                <span className={cn("px-2 py-0.5 rounded", h.wants_walk ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                                                                    Turlyst: {h.wants_walk ? "Ja" : "Nei"}
                                                                </span>
                                                                <span className={cn("px-2 py-0.5 rounded", h.is_hungry ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                                                                    Matlyst: {h.is_hungry ? "Ja" : "Nei"}
                                                                </span>
                                                                <span className={cn("px-2 py-0.5 rounded", h.is_thirsty ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>
                                                                    Tørst: {h.is_thirsty ? "Ja" : "Nei"}
                                                                </span>
                                                                <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                                                                    Avføring: {h.stool || "Ikke registrert"}
                                                                </span>
                                                                {h.cone_usage && h.cone_usage !== "Ingen" && (
                                                                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                                                        Skjerm: {h.cone_usage}
                                                                    </span>
                                                                )}
                                                                {h.itch_locations && h.itch_locations.length > 0 && (
                                                                    <div className="w-full bg-red-100 text-red-700 px-2 py-0.5 rounded mt-1">
                                                                        Kløe: {h.itch_locations.join(", ")}
                                                                    </div>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <>
                                                                {!h.is_playful && <div className="p-1 px-2 rounded bg-red-100 text-red-700">Ikke leken</div>}
                                                                {!h.wants_walk && <div className="p-1 px-2 rounded bg-red-100 text-red-700">Vil ikke gå tur</div>}
                                                                {!h.is_hungry && <div className="p-1 px-2 rounded bg-red-100 text-red-700">Dårlig matlyst</div>}
                                                                {!h.is_thirsty && <div className="p-1 px-2 rounded bg-red-100 text-red-700">Ikke tørst</div>}

                                                                {h.cone_usage && h.cone_usage !== 'Ingen' && (
                                                                    <div className="col-span-2 p-1 px-2 rounded bg-blue-50 text-blue-800 border border-blue-100 w-full">
                                                                        Skjerm: <strong>{h.cone_usage}</strong>
                                                                    </div>
                                                                )}

                                                                {h.stool && h.stool !== 'Normal' && (
                                                                    <div className="col-span-2 p-1 px-2 rounded bg-amber-50 text-amber-800 border border-amber-100 w-full">
                                                                        Avføring: <strong>{h.stool}</strong>
                                                                    </div>
                                                                )}
                                                                {h.itch_locations && h.itch_locations.length > 0 && (
                                                                    <div className="col-span-2 p-1 px-2 rounded bg-red-50 text-red-800 border border-red-100 w-full">
                                                                        Kløe: <strong>{h.itch_locations.join(", ")}</strong>
                                                                    </div>
                                                                )}
                                                                <div className="w-full text-right text-[10px] text-pink-400 font-semibold mt-1 uppercase">Klikk for alt</div>
                                                            </>
                                                        )}
                                                    </div>
                                                    {h.notes && (
                                                        <p className="text-xs italic border-t pt-2 mt-2 text-muted-foreground">"{h.notes}"</p>
                                                    )}
                                                </div>
                                            )
                                        })}

                                        {/* Doses Section */}
                                        {hasDoses && (
                                            <div className="space-y-2">
                                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Medisiner</h4>
                                                {dayData.doses.map((log: any) => (
                                                    <div key={log.id} className="flex items-center gap-2 px-3 py-2 bg-background border rounded-md shadow-sm text-sm">
                                                        <MedicineBadge medicine={log.medicine} className="flex-1" />
                                                        <span className="text-muted-foreground text-xs">{format(new Date(log.taken_at), 'HH:mm')}</span>
                                                        {log.taker?.full_name && (
                                                            <span className="text-muted-foreground text-xs border-l pl-2 ml-2">
                                                                {log.taker.full_name.split(' ')[0]}
                                                            </span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )
                            })()}
                        </div>
                    )}
                </div>
            )}

            <AlertDialog open={!!entryToDelete} onOpenChange={(open) => !open && setEntryToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Slette helselogg?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Denne handlingen kan ikke angres. Loggen vil bli slettet permanent fra historikken.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Avbryt</AlertDialogCancel>
                        <AlertDialogAction onClick={executeDelete} className="bg-destructive hover:bg-destructive/90">
                            Slett
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
