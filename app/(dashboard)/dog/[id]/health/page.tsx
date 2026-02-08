import { getWeeklyHealthSummary, getMonthlyHealthSummary } from "@/app/actions/ai"
import { AlertCircle, FileText, Activity, Calendar } from "lucide-react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default async function HealthPage({ params }: { params: Promise<{ id: string }> }) {
    // Await params for Next.js 15+
    const resolvedParams = await params
    const dogId = resolvedParams.id

    // Fetch summaries
    const weeklyData = getWeeklyHealthSummary(dogId)
    const monthlyData = getMonthlyHealthSummary(dogId)

    // Parallel fetch
    const [{ text, error }, { text: monthlyText, error: monthlyError }] = await Promise.all([weeklyData, monthlyData])

    return (
        <div className="max-w-2xl mx-auto space-y-6">

            <div className="bg-card border rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-muted-foreground uppercase tracking-wider text-xs font-bold border-b pb-2">
                    <FileText className="h-4 w-4" />
                    Ukentlig Status
                </div>

                {error ? (
                    <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        <p>{error}</p>
                    </div>
                ) : (
                    <div className="prose dark:prose-invert max-w-none text-foreground/90 font-medium leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {text}
                        </ReactMarkdown>
                    </div>
                )}

                <div className="mt-6 pt-4 border-t text-xs text-muted-foreground flex justify-between items-center">
                    <span>Genereres automatisk hver uke basert på loggføring.</span>
                    <span className="opacity-50">AI-Veterinær Assistent</span>
                </div>
            </div>

            <div className="bg-card border rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4 text-muted-foreground uppercase tracking-wider text-xs font-bold border-b pb-2">
                    <Calendar className="h-4 w-4" />
                    Siste 30 Dager Analyse
                </div>

                {monthlyError ? (
                    <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
                        <AlertCircle className="h-5 w-5" />
                        <p>{monthlyError}</p>
                    </div>
                ) : (
                    <div className="prose dark:prose-invert max-w-none text-foreground/90 font-medium leading-relaxed">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {monthlyText}
                        </ReactMarkdown>
                    </div>
                )}

                <div className="mt-6 pt-4 border-t text-xs text-muted-foreground flex justify-between items-center">
                    <span>Trendanalyse basert på siste 30 dagers data.</span>
                    <span className="opacity-50">AI-Veterinær Assistent</span>
                </div>
            </div>
        </div>
    )
}
