import { getGlobalStats, getLast30DaysActivity } from "@/app/actions/analytics"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Dog, Pill, Activity } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export const dynamic = 'force-dynamic'

export default async function AnalyticsPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user || user.email !== 'trymsn1992@gmail.com') {
        redirect('/dashboard')
    }

    const stats = await getGlobalStats()
    const activityData = await getLast30DaysActivity()

    // Find max value for chart scaling
    const maxCount = Math.max(...activityData.map(d => d.count), 1)

    return (
        <div className="container mx-auto p-6 space-y-8 max-w-5xl">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
                <p className="text-muted-foreground">Oversikt over bruk og aktivitet.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Totalt Brukere</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.users}</div>
                        <p className="text-xs text-muted-foreground">registrerte profiler</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Totalt Hunder</CardTitle>
                        <Dog className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.dogs}</div>
                        <p className="text-xs text-muted-foreground">aktive hundeprofiler</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Medisiner</CardTitle>
                        <Pill className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.medicines}</div>
                        <p className="text-xs text-muted-foreground">opprettede medisiner</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Loggførte Doser</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.doses}</div>
                        <p className="text-xs text-muted-foreground">totalt antall doser gitt</p>
                    </CardContent>
                </Card>
            </div>

            {/* Activity Chart Section */}
            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Aktivitet Siste 30 Dager</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                    <div className="h-[200px] w-full flex items-end gap-1 overflow-x-auto pb-2">
                        {activityData.map((day, i) => {
                            const heightPercentage = (day.count / maxCount) * 100
                            return (
                                <div key={day.date} className="flex-1 min-w-[10px] flex flex-col items-center gap-1 group relative">
                                    <div
                                        className="w-full bg-primary/20 hover:bg-primary transition-all rounded-t-sm relative group-hover:scale-y-105 origin-bottom"
                                        style={{ height: `${Math.max(heightPercentage, 2)}%` }} // Min 2% height for visibility
                                    >
                                    </div>
                                    <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center bg-popover text-popover-foreground text-xs rounded p-2 shadow-md z-10 w-max">
                                        <span className="font-bold">{day.count} doser</span>
                                        <span className="opacity-70">{day.date}</span>
                                    </div>
                                    {/* Show Day Label sparsely */}
                                    {/* (i % 5 === 0 || i === activityData.length - 1) && (
                                        <span className="text-[10px] text-muted-foreground absolute top-full mt-1 whitespace-nowrap">
                                            {day.date.slice(8)}
                                        </span>
                                    )*/}
                                </div>
                            )
                        })}
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-2 px-1">
                        <span>30 dager siden</span>
                        <span>I dag</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
