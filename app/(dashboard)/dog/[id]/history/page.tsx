"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Calendar as CalendarIcon, List as ListIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { DayPicker } from "react-day-picker"
import { nb } from "date-fns/locale"
import { differenceInCalendarDays, format, isSameDay, startOfDay } from "date-fns"
import "react-day-picker/style.css"

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
    const [calendarDate, setCalendarDate] = useState<Date | undefined>(new Date())

    const supabase = createClient()

    // Load initial data
    useEffect(() => {
        const load = async () => {
            // 1. Medicines for filter
            const { data: medData } = await supabase
                .from('medicines')
                .select('id, name')
                .eq('dog_id', dogId)
                .order('name')
            setMedicines(medData || [])

            // 2. All logs (limit 500 for calendar population)
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
                .limit(500)

            setAllLogs(logData || [])
            setLoading(false)
        }
        load()
    }, [dogId, supabase])

    // Handle URL param for initial filter
    useEffect(() => {
        const medId = searchParams.get("medicineId")
        if (medId) {
            setSelectedMedicine(medId)
        }
    }, [searchParams])

    // Derived state: Filtered Logs for List/Stats
    const filteredLogs = useMemo(() => {
        return selectedMedicine === "all"
            ? allLogs
            : allLogs.filter(l => l.medicine?.id === selectedMedicine)
    }, [selectedMedicine, allLogs])

    // Stats Calculation
    const summaryStats = useMemo(() => {
        if (selectedMedicine === 'all' || filteredLogs.length === 0) return null

        // Count only taken
        const takenLogs = filteredLogs.filter(l => l.status === 'taken')
        if (takenLogs.length === 0) return null

        // Sort asc for date calc
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

    // Group by Date for List View
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

    // Sort keys for List View
    const sortedGroups = Object.keys(groupedLogs).sort((a, b) => {
        if (a === "I dag") return -1
        if (b === "I dag") return 1
        if (a === "I går") return -1
        if (b === "I går") return 1
        const [d1, m1, y1] = a.split('.').map(Number)
        const [d2, m2, y2] = b.split('.').map(Number)
        // Parse manually or fallback logic
        if (!y1) return 0 // safety
        return new Date(y2, m2 - 1, d2).getTime() - new Date(y1, m1 - 1, d1).getTime()
    })

    // Calendar Helpers
    const getMedColor = (medId: string) => {
        const index = medicines.findIndex(m => m.id === medId)
        if (index === -1) return "bg-gray-400"
        return MED_COLORS[index % MED_COLORS.length]
    }

    // Filter logs for Calendar: Always show ALL logs in calendar, but dim non-selected?
    // Actually, usually calendar shows everything, but if filter is active, maybe only show those dots.
    // Let's use `filteredLogs` for the calendar dots as well to match user expectation.
    const calendarDays = useMemo(() => {
        const days: Record<string, any[]> = {} // YYYY-MM-DD -> logs
        filteredLogs.forEach(log => {
            const dayKey = format(new Date(log.taken_at), 'yyyy-MM-dd')
            if (!days[dayKey]) days[dayKey] = []
            days[dayKey].push(log)
        })
        return days
    }, [filteredLogs])

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

                    <div className="flex border rounded-md overflow-hidden">
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

            {/* SMART SUMMARY HEADER */}
            {summaryStats && (
                <div className="bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-green-900 dark:text-green-100 animate-in fade-in slide-in-from-top-2">
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

            {loading ? (
                <div className="text-center py-10 text-muted-foreground">Laster historikk...</div>
            ) : view === 'list' ? (
                <div className="space-y-8">
                    {filteredLogs.length === 0 ? (
                        <p className="text-muted-foreground text-center py-10">Ingen historikk funnet for dette valget.</p>
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
                                                <span>av {log.taker?.full_name?.split(' ')[0] || "Ukjent"}</span>
                                                {log.notes && (
                                                    <span className="italic truncate max-w-[150px]">- &quot;{log.notes}&quot;</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="ml-4 flex-shrink-0 flex items-center gap-2">
                                            <div className={cn("w-3 h-3 rounded-full", getMedColor(log.medicine?.id))} />
                                            <span className={cn(
                                                "text-xs font-medium px-2 py-1 rounded",
                                                log.status === 'taken' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700"
                                            )}>
                                                {log.status === 'taken' ? 'Gitt' : log.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </section>
                        ))
                    )}
                </div>
            ) : (
                <div className="flex justify-center border rounded-xl p-4 bg-card shadow-sm">
                    <DayPicker
                        mode="single"
                        locale={nb}
                        selected={calendarDate}
                        onSelect={setCalendarDate}
                        components={{
                            // @ts-expect-error - DayContent is valid at runtime in v9 despite strict types in some versions
                            DayContent: (props: any) => {
                                const dayKey = format(props.date, 'yyyy-MM-dd')
                                const logs = calendarDays[dayKey]
                                return (
                                    <div className="relative w-full h-full flex items-center justify-center">
                                        <span>{props.date.getDate()}</span>
                                        {logs && logs.length > 0 && (
                                            <div className="absolute bottom-1 flex gap-0.5">
                                                {logs.slice(0, 3).map((l: any, i: number) => (
                                                    <div
                                                        key={i}
                                                        className={cn("w-1.5 h-1.5 rounded-full", getMedColor(l.medicine?.id))}
                                                    />
                                                ))}
                                                {logs.length > 3 && <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />}
                                            </div>
                                        )}
                                    </div>
                                )
                            }
                        }}
                        modifiersClassNames={{
                            selected: "bg-primary text-primary-foreground font-bold rounded-md"
                        }}
                        className="p-3"
                    />

                    {/* Selected Day Details Panel could go here */}
                </div>
            )}

            {/* Calendar Legend / Info when in calendar view could be added here */}
            {view === 'calendar' && calendarDate && (
                <div className="border rounded-xl p-4 bg-card/50">
                    <h3 className="font-semibold mb-3">
                        Hendelser {calendarDate.toLocaleDateString('nb-NO')}
                    </h3>
                    {(() => {
                        const dayKey = format(calendarDate, 'yyyy-MM-dd')
                        const logs = calendarDays[dayKey]
                        if (!logs || logs.length === 0) return <p className="text-muted-foreground">Ingen registreringer denne dagen.</p>
                        return (
                            <div className="space-y-2">
                                {logs.map(log => (
                                    <div key={log.id} className="flex items-center gap-3 p-2 rounded-md border bg-background">
                                        <div className={cn("w-3 h-3 rounded-full shrink-0", getMedColor(log.medicine?.id))} />
                                        <div className="flex-1">
                                            <div className="flex justify-between">
                                                <span className="font-medium">{log.medicine?.name}</span>
                                                <span className="text-sm text-muted-foreground">{new Date(log.taken_at).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            {log.notes && <p className="text-xs text-muted-foreground italic">{log.notes}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    })()}
                </div>
            )}
        </div>
    )
}
