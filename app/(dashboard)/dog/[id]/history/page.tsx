"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"

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

            // 2. All logs (limit 100 for now)
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
                .limit(100)

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

    // Derived state: Filtered Logs
    const filteredLogs = selectedMedicine === "all"
        ? allLogs
        : allLogs.filter(l => l.medicine?.id === selectedMedicine)

    // Group by Date
    const groupedLogs: Record<string, typeof allLogs> = {}
    filteredLogs.forEach(log => {
        const date = new Date(log.taken_at)
        const today = new Date()
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)

        let key = date.toLocaleDateString('nb-NO') // Default dd.mm.yyyy

        if (date.toDateString() === today.toDateString()) key = "I dag"
        else if (date.toDateString() === yesterday.toDateString()) key = "I går"

        if (!groupedLogs[key]) groupedLogs[key] = []
        groupedLogs[key].push(log)
    })

    const sortedGroups = Object.keys(groupedLogs)
        // Sort keys logic: "I dag" first, "I går" second, then dates descending
        .sort((a, b) => {
            if (a === "I dag") return -1
            if (b === "I dag") return 1
            if (a === "I går") return -1
            if (b === "I går") return 1
            // Parse dd.mm.yyyy
            const [d1, m1, y1] = a.split('.').map(Number)
            const [d2, m2, y2] = b.split('.').map(Number)
            const dateA = new Date(y1, m1 - 1, d1).getTime()
            const dateB = new Date(y2, m2 - 1, d2).getTime()
            return dateB - dateA
        })

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href={`/dog/${dogId}`}><ArrowLeft className="h-5 w-5" /></Link>
                    </Button>
                    <h1 className="text-2xl font-bold">Historikk</h1>
                </div>

                <div className="w-full sm:w-[200px]">
                    <select
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={selectedMedicine}
                        onChange={(e) => setSelectedMedicine(e.target.value)}
                    >
                        <option value="all">Vis alt</option>
                        {medicines.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-10 text-muted-foreground">Laster historikk...</div>
            ) : (
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
                                        <div className="ml-4 flex-shrink-0">
                                            <span className={cn(
                                                "text-xs font-medium px-2 py-1 rounded",
                                                log.status === 'taken' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                                    log.status === 'skipped' ? "bg-yellow-100 text-yellow-700" :
                                                        "bg-red-100 text-red-700"
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
            )}
        </div>
    )
}
