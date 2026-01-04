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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [logs, setLogs] = useState<any[]>([])
    const supabase = createClient()

    useEffect(() => {
        const fetchLogs = async () => {
            const { data } = await supabase
                .from('dose_logs')
                .select(`
            *,
            medicine:medicines(name),
            taker:taken_by(full_name)
         `)
                .eq('dog_id', dogId)
                .order('taken_at', { ascending: false })
                .limit(50)

            setLogs(data || [])
        }
        fetchLogs()
    }, [dogId, supabase])

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={`/dog/${dogId}`}><ArrowLeft className="h-5 w-5" /></Link>
                </Button>
                <h1 className="text-2xl font-bold">History</h1>
            </div>

            <div className="space-y-4">
                {logs.length === 0 ? (
                    <p className="text-muted-foreground text-center py-10">No history yet.</p>
                ) : (
                    logs.map(log => (
                        <Card key={log.id}>
                            <CardContent className="p-4 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold">{log.medicine?.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {new Date(log.taken_at).toLocaleString()}
                                    </p>
                                    {log.notes && <p className="text-sm italic">&quot;{log.notes}&quot;</p>}
                                </div>
                                <div className="text-right">
                                    <span className="text-sm font-medium px-2 py-1 rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100">
                                        {log.status}
                                    </span>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        By {log.taker?.full_name || "Unknown"}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
