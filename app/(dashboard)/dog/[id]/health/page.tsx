import { getWeeklyHealthSummary } from "@/app/actions/ai"
import { AlertCircle, FileText, Activity } from "lucide-react"

export default async function HealthPage({ params }: { params: Promise<{ id: string }> }) {
    // Await params for Next.js 15+
    const resolvedParams = await params
    const dogId = resolvedParams.id

    // Fetch summary (Generating if not exists)
    const { text, error } = await getWeeklyHealthSummary(dogId)

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
                <Activity className="h-6 w-6 text-primary" />
                Helserapport
            </h1>

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
                    <div className="prose dark:prose-invert max-w-none">
                        <div className="whitespace-pre-wrap leading-relaxed text-foreground/90 font-medium">
                            {text}
                        </div>
                    </div>
                )}

                <div className="mt-6 pt-4 border-t text-xs text-muted-foreground flex justify-between items-center">
                    <span>Genereres automatisk hver uke basert på loggføring.</span>
                    <span className="opacity-50">AI-Veterinær Assistent</span>
                </div>
            </div>
        </div>
    )
}
