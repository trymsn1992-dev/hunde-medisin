import { WeeklyAnalysis, MonthlyAnalysis } from "@/components/health-analysis"
import { Suspense } from "react"
import { FileText, Calendar } from "lucide-react"

export default async function HealthPage({ params }: { params: Promise<{ id: string }> }) {
    // Await params for Next.js 15+
    const resolvedParams = await params
    const dogId = resolvedParams.id

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <Suspense fallback={<AnalysisSkeleton title="Ukentlig Status" icon={<FileText className="h-4 w-4" />} />}>
                <WeeklyAnalysis dogId={dogId} />
            </Suspense>

            <Suspense fallback={<AnalysisSkeleton title="Siste 30 Dager Analyse" icon={<Calendar className="h-4 w-4" />} />}>
                <MonthlyAnalysis dogId={dogId} />
            </Suspense>
        </div>
    )
}

function AnalysisSkeleton({ title, icon }: { title: string, icon: React.ReactNode }) {
    return (
        <div className="bg-card border rounded-xl p-6 shadow-sm min-h-[200px] flex flex-col">
            <div className="flex items-center gap-2 mb-4 text-muted-foreground uppercase tracking-wider text-xs font-bold border-b pb-2">
                {icon}
                {title}
            </div>
            <div className="flex-1 flex flex-col gap-3 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
                <div className="h-4 bg-muted rounded w-5/6"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
            </div>
        </div>
    )
}
