"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calendar as CalendarIcon, List as ListIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
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

// Assign colors to medicines dynamically or via hash
const MED_COLORS = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-red-500",
    "bg-teal-500",
    "bg-pink-500",
    "bg-indigo-500",
]

export default function HistoryPage() {
    const params = useParams()
    const dogId = params.id as string
    const searchParams = useSearchParams()

    // State
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [allLogs, setAllLogs] = useState<any[]>([])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [medicines, setMedicines] = useState<any[]>([])
    const [selectedMedicine, setSelectedMedicine] = useState<string>("all")
    const [loading, setLoading] = useState(true)
    const [view, setView] = useState<'list' | 'calendar'>('list')

    // Custom Calendar State
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)

    const supabase = createClient()

    // Load initial data
    useEffect(() => {
        const load = async () => {
            // 1. Medicines
            const { data: medData } = await supabase
                .from('medicines')
                .select('id, name')
                .eq('dog_id', dogId)
                .order('name')
            setMedicines(medData || [])

            // 2. Logs 
            // Note: For a full calendar we might need more data or pagination logic. 
            // Currently limiting to 1000 to cover a good range.
            const { data: logData } = await supabase
                .from('dose_logs')
                .select(`
                    id,
                    taken_at,
                    notes,
                    status,
                    medicine:medicines(id, name),
                    taker:taken_by(full_name)
                `)
                .eq('dog_id', dogId)
                .order('taken_at', { ascending: false })
                .limit(1000)

            setAllLogs(logData || [])
            setLoading(false)
        }
        load()
    }, [dogId, supabase])

    // Handling URL params
    useEffect(() => {
        const medId = searchParams.get("medicineId")
        if (medId) setSelectedMedicine(medId)
    }, [searchParams])

    // Filter Logs
    const filteredLogs = useMemo(() => {
        return selectedMedicine === "all"
            ? allLogs
            : allLogs.filter(l => l.medicine?.id === selectedMedicine)
    }, [selectedMedicine, allLogs])

    // --- Stats Logic ---
    const summaryStats = useMemo(() => {
        if (selectedMedicine === 'all' || filteredLogs.length === 0) return null
        const takenLogs = filteredLogs.filter(l => l.status === 'taken')
        if (takenLogs.length === 0) return null
        const sorted = [...takenLogs].sort((a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime())
        const firstDate = new Date(sorted[0].taken_at)
        const daysDiff = differenceInCalendarDays(new Date(), firstDate) || 1
        const count = takenLogs.length
        const perDay = count / daysDiff

        let freqText = `ca. ${perDay.toFixed(1)} ganger daglig`
        if (Math.abs(perDay - 1) < 0.2) freqText = "én gang daglig"
        else if (Math.abs(perDay - 2) < 0.2) freqText = "to ganger daglig"
        else if (perDay < 0.5) freqText = "sjeldnere enn daglig"

        return {
            text: `Gitt ${freqText} siden ${firstDate.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' })}`,
            count
        }
    }, [filteredLogs, selectedMedicine])

    // --- List View Grouping ---
    const groupedLogs = useMemo(() => {
        const groups: Record<string, typeof allLogs> = {}
        filteredLogs.forEach(log => {
            const date = new Date(log.taken_at)
            const today = new Date()
            const yesterday = new Date()
            yesterday.setDate(yesterday.getDate() - 1)
            let key = date.toLocaleDateString('nb-NO')
            if (date.toDateString() === today.toDateString()) key = "I dag"
            else if (date.toDateString() === yesterday.toDateString()) key = "I går"
            if (!groups[key]) groups[key] = []
            groups[key].push(log)
        })
        return groups
    }, [filteredLogs])
    const sortedGroups = Object.keys(groupedLogs).sort((a, b) => {
        if (a === "I dag") return -1; if (b === "I dag") return 1
        if (a === "I går") return -1; if (b === "I går") return 1
        const [d1, m1, y1] = a.split('.').map(Number); const [d2, m2, y2] = b.split('.').map(Number)
        if (!y1) return 0
        return new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()
    })

    // --- Calendar Helper Logic ---
    const getMedColor = (medId: string) => {
        const index = medicines.findIndex(m => m.id === medId)
        if (index === -1) return "bg-gray-400"
        return MED_COLORS[index % MED_COLORS.length]
    }

    const calendarDaysMap = useMemo(() => {
        const days: Record<string, any[]> = {}
        filteredLogs.forEach(log => {
            const dayKey = format(new Date(log.taken_at), 'yyyy-MM-dd')
            if (!days[dayKey]) days[dayKey] = []
            days[dayKey].push(log)
        })
        return days
    }, [filteredLogs])

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
        <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={`/dog/${dogId}`}><ArrowLeft className="h-5 w-5" /></Link>
                    </Button>
                    <h1 className="text-2xl font-bold">Historikk</h1>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <select
                        className="flex-1 sm:w-[200px] h-10 px-3 rounded-md border border-input bg-background text-sm"
                        value={selectedMedicine}
                        onChange={(e) => setSelectedMedicine(e.target.value)}
                    >
                        <option value="all">Vis alt</option>
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
                        <div className="bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-green-900 dark:text-green-100 mb-6 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-green-200 dark:bg-green-700 flex items-center justify-center shrink-0">
                                    <CalendarIcon className="h-5 w-5 text-green-700 dark:text-white" />
                                </div>
                                <div>
                                    <p className="font-semibold text-lg">{medicines.find(m => m.id === selectedMedicine)?.name}</p>
                                    <p className="opacity-90">{summaryStats.text}</p>
                                </div>
                            </div>
                            <div className="hidden sm:block text-2xl font-bold opacity-50 px-4">
                                {summaryStats.count} doser
                            </div>
                        </div>
                    )}

                    {loading ? <div className="text-center py-10">Laster...</div> : (
                        <div className="space-y-8 pb-10">
                            {filteredLogs.length === 0 ? (
                                <p className="text-muted-foreground text-center py-10">Ingen loggføringer funnet.</p>
                            ) : (
                                sortedGroups.map(groupKey => (
                                    <section key={groupKey} className="space-y-3">
                                        <h3 className="font-semibold text-lg text-muted-foreground border-b pb-2 mb-2 sticky top-0 bg-background z-10">
                                            {groupKey}
                                        </h3>
                                        {groupedLogs[groupKey].map(log => (
                                            <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-bold text-lg">
                                                            {new Date(log.taken_at).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        <span className="font-medium truncate">{log.medicine?.name || "Ukjent medisin"}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <span>{log.taker?.full_name?.split(' ')[0]}</span>
                                                        {log.notes && <span className="italic truncate">- &quot;{log.notes}&quot;</span>}
                                                    </div>
                                                </div>
                                                <div className={cn("w-3 h-3 rounded-full flex-shrink-0", getMedColor(log.medicine?.id))} />
                                            </div>
                                        ))}
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
                    <div className="grid grid-cols-7 auto-rows-fr bg-muted/20 gap-px border-b flex-1 overflow-y-auto min-h-0">
                        {calendarGrid.map((date, idx) => {
                            const isCurrentMonth = isSameMonth(date, currentMonth)
                            const dateKey = format(date, 'yyyy-MM-dd')
                            const logs = calendarDaysMap[dateKey] || []
                            const isSelected = selectedDate && isSameDay(date, selectedDate)

                            return (
                                <div
                                    key={dateKey}
                                    onClick={() => setSelectedDate(date)}
                                    className={cn(
                                        "bg-background p-1 flex flex-col relative transition-colors cursor-pointer hover:bg-muted/50 overflow-hidden",
                                        !isCurrentMonth && "bg-muted/5 text-muted-foreground/50",
                                        isSelected && "ring-2 ring-primary inset-0 z-10"
                                    )}
                                >
                                    <div className={cn("text-xs font-semibold p-1 mb-1 ml-auto w-6 h-6 flex items-center justify-center rounded-full shrink-0",
                                        isToday(date) && "bg-primary text-primary-foreground"
                                    )}>
                                        {format(date, 'd')}
                                    </div>

                                    {/* Events List */}
                                    <div className="flex-1 flex flex-col gap-1 overflow-y-auto w-full">
                                        {logs.map(log => {
                                            const bgClass = getMedColor(log.medicine?.id)
                                            // Extract base color name to handle text contrast roughly (imperfect but better than nothing)
                                            // actually our colors are 500. So white text is good.
                                            // We will use the `bgClass` directly on the div, and text-white.
                                            return (
                                                <div
                                                    key={log.id}
                                                    className={cn(
                                                        "flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] sm:text-xs border border-transparent transition-opacity w-full text-white shadow-sm",
                                                        bgClass,
                                                        "bg-opacity-90 hover:bg-opacity-100" // Tailwind v3/v4 might need specific opacity utils or just bg-blue-500
                                                    )}
                                                    title={`${log.medicine?.name} - ${format(new Date(log.taken_at), 'HH:mm')}`}
                                                >
                                                    {/* Remove dot, since whole bar is colored */}
                                                    <span className="truncate font-medium flex-1 text-left drop-shadow-sm">
                                                        {log.medicine?.name}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Selected Date Details (Footer) */}
                    {selectedDate && (
                        <div className="p-3 bg-muted/10 border-t shrink-0">
                            <h3 className="font-semibold mb-2 text-sm flex items-center justify-between">
                                <span>Detaljer {format(selectedDate, 'd. MMMM', { locale: nb })}</span>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSelectedDate(null)}>✕</Button>
                            </h3>
                            {(() => {
                                const dayKey = format(selectedDate, 'yyyy-MM-dd')
                                const logs = calendarDaysMap[dayKey]
                                if (!logs || logs.length === 0) return <p className="text-xs text-muted-foreground">Ingen hendelser.</p>
                                return (
                                    <div className="flex flex-col gap-2 max-h-[150px] overflow-auto">
                                        {logs.map(log => (
                                            <div key={log.id} className="flex items-center gap-2 px-3 py-2 bg-background border rounded-md shadow-sm text-sm">
                                                <div className={cn("w-2 h-2 rounded-full", getMedColor(log.medicine?.id))} />
                                                <span className="font-medium flex-1">{log.medicine?.name}</span>
                                                <span className="text-muted-foreground text-xs">{format(new Date(log.taken_at), 'HH:mm')}</span>
                                                {log.taker?.full_name && (
                                                    <span className="text-muted-foreground text-xs border-l pl-2 ml-2">
                                                        {log.taker.full_name.split(' ')[0]}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )
                            })()}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
