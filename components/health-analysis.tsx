"use client"

import { getWeeklyHealthSummary, getMonthlyHealthSummary } from "@/app/actions/ai"
import { AlertCircle, FileText, Calendar, Loader2 } from "lucide-react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useEffect, useState } from "react"

// Dedicated Markdown Component for consistency
const MarkdownContent = ({ content }: { content: string }) => (
    <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
            h2: ({ node, ...props }) => <h2 className="text-sm font-bold uppercase text-muted-foreground mt-6 mb-3 tracking-wider" {...props} />,
            p: ({ node, ...props }) => <p className="text-sm text-foreground/80 leading-relaxed mb-4" {...props} />,
            ul: ({ node, ...props }) => <ul className="space-y-2 my-2" {...props} />,
            li: ({ node, ...props }) => (
                <li className="flex items-start gap-2 text-sm text-foreground/90 leading-relaxed">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                    <span>{props.children}</span>
                </li>
            ),
            strong: ({ node, ...props }) => <span className="font-semibold text-foreground" {...props} />
        }}
    >
        {content}
    </ReactMarkdown>
)

export function WeeklyAnalysis({ dogId }: { dogId: string }) {
    const [data, setData] = useState<{ text?: string | null, error?: string } | null>(null)

    useEffect(() => {
        getWeeklyHealthSummary(dogId).then((res) => {
            setData({ text: res.text, error: res.error })
        })
    }, [dogId])

    if (!data) {
        return (
            <div className="bg-card border rounded-xl p-6 shadow-sm min-h-[200px] flex flex-col">
                <div className="flex items-center gap-2 mb-4 text-muted-foreground uppercase tracking-wider text-xs font-bold border-b pb-2">
                    <FileText className="h-4 w-4" />
                    Ukentlig Status
                </div>
                <div className="flex-1 flex flex-col gap-3 animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-4 bg-muted rounded w-5/6"></div>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-card border rounded-xl p-6 shadow-sm min-h-[200px] animate-in fade-in duration-500">
            <div className="flex items-center gap-2 mb-4 text-muted-foreground uppercase tracking-wider text-xs font-bold border-b pb-2">
                <FileText className="h-4 w-4" />
                Ukentlig Status
            </div>

            {data.error ? (
                <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    <p>{data.error}</p>
                </div>
            ) : (
                <div className="text-foreground/90 font-medium leading-relaxed">
                    <MarkdownContent content={data.text || ""} />
                </div>
            )}
            <div className="mt-6 pt-4 border-t text-xs text-muted-foreground flex justify-between items-center">
                <span>Genereres automatisk hver uke basert på loggføring.</span>
                <span className="opacity-50">AI-Veterinær Assistent</span>
            </div>
        </div>
    )
}

export function MonthlyAnalysis({ dogId }: { dogId: string }) {
    const [data, setData] = useState<{ text?: string | null, error?: string } | null>(null)

    useEffect(() => {
        getMonthlyHealthSummary(dogId).then((res) => {
            setData({ text: res.text, error: res.error })
        })
    }, [dogId])

    if (!data) {
        return (
            <div className="bg-card border rounded-xl p-6 shadow-sm min-h-[200px] flex flex-col">
                <div className="flex items-center gap-2 mb-4 text-muted-foreground uppercase tracking-wider text-xs font-bold border-b pb-2">
                    <Calendar className="h-4 w-4" />
                    Siste 30 Dager Analyse
                </div>
                <div className="flex-1 flex flex-col gap-3 animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-full"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                    <div className="h-4 bg-muted rounded w-5/6"></div>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-card border rounded-xl p-6 shadow-sm min-h-[200px] animate-in fade-in duration-500">
            <div className="flex items-center gap-2 mb-4 text-muted-foreground uppercase tracking-wider text-xs font-bold border-b pb-2">
                <Calendar className="h-4 w-4" />
                Siste 30 Dager Analyse
            </div>

            {data.error ? (
                <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    <p>{data.error}</p>
                </div>
            ) : (
                <div className="text-foreground/90 font-medium leading-relaxed">
                    <MarkdownContent content={data.text || ""} />
                </div>
            )}

            <div className="mt-6 pt-4 border-t text-xs text-muted-foreground flex justify-between items-center">
                <span>Trendanalyse basert på siste 30 dagers data.</span>
                <span className="opacity-50">AI-Veterinær Assistent</span>
            </div>
        </div>
    )
}
