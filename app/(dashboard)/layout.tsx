"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { LogOut, Dog, LayoutGrid, CalendarDays, Pill, Heart, ChevronLeft, HeartPulse, Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { HealthLogModal } from "@/components/health-log-modal"
import { useRouter, useParams, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const supabase = createClient()
    const params = useParams()
    const pathname = usePathname()
    const dogId = params.id as string

    const [activeDog, setActiveDog] = useState<{ name: string, image_url: string | null } | null>(null)

    useEffect(() => {
        if (!dogId) {
            setActiveDog(null)
            return
        }

        const fetchDog = async () => {
            const { data } = await supabase.from("dogs").select("name, image_url").eq("id", dogId).single()
            if (data) {
                setActiveDog(data)
            }
        }
        fetchDog()
    }, [dogId, supabase])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push("/login")
    }

    const navItems = dogId ? [
        { label: "Oversikt", href: `/dog/${dogId}`, icon: LayoutGrid, exact: true },
        { label: "Historikk", href: `/dog/${dogId}/history`, icon: CalendarDays },
        { label: "Helse", href: `/dog/${dogId}/health`, icon: Heart },
        { label: "Medisiner", href: `/dog/${dogId}/medicines`, icon: Pill },
    ] : []

    const getPageTitle = () => {
        if (pathname === "/dashboard") return "Mine hunder"
        if (pathname === "/new-dog") return "Ny hund"
        if (pathname.includes("/history")) return "Historikk"
        if (pathname.includes("/health")) return "Helse"
        if (pathname.includes("/medicines")) return "Medisiner"
        if (pathname.includes("/profile")) return "Profil"
        if (pathname.match(/\/dog\/[^\/]+$/)) return "Medisin plan"
        return "Medisin plan"
    }

    return (
        <div className="min-h-screen flex bg-background">
            {/* Desktop Sidebar */}
            {dogId && (
                <aside className="hidden md:flex w-64 flex-col border-r bg-card/50 backdrop-blur-md sticky top-0 h-screen shrink-0">
                    <div className="h-16 flex items-center px-6 border-b">
                        {/* No logo per user request */}
                    </div>

                    <div className="p-4 flex-1">
                        {/* Active Dog Profile Summary in Sidebar */}
                        {activeDog && (
                            <div className="mb-6 p-3 rounded-lg bg-muted/30 border flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-muted overflow-hidden border filter shadow-sm">
                                    {activeDog.image_url ? (
                                        <img src={activeDog.image_url} alt={activeDog.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary font-bold text-lg">
                                            {activeDog.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="overflow-hidden">
                                    <p className="font-semibold text-sm truncate">{activeDog.name}</p>
                                    <Link href={`/dog/${dogId}/profile`} className="text-[10px] text-primary hover:underline block">
                                        Rediger profil
                                    </Link>
                                </div>
                            </div>
                        )}

                        <nav className="space-y-1">
                            {navItems.map((item) => {
                                const isActive = item.exact
                                    ? pathname === item.href
                                    : pathname.startsWith(item.href)

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        aria-label={`Gå til ${item.label}`}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all",
                                            isActive
                                                ? "bg-primary/10 text-primary"
                                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                        )}
                                    >
                                        <item.icon className="h-4 w-4" />
                                        {item.label}
                                    </Link>
                                )
                            })}

                            <div className="pt-4 mt-4 border-t">
                                <Link
                                    href="/analytics"
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all",
                                        pathname === "/analytics"
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                    )}
                                >
                                    <HeartPulse className="h-4 w-4" /> {/* Reusing HeartPulse or importing Activity if needed, but HeartPulse is imported */}
                                    Analytics
                                </Link>
                            </div>
                        </nav>
                    </div>
                </aside>
            )}

            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile Header - Fixed to ensure consistent spacing */}
                <header className="border-b bg-background/95 backdrop-blur-md fixed top-0 left-0 right-0 z-50 md:hidden h-14">
                    <div className="container mx-auto px-4 h-full flex items-center justify-between">
                        <div className="w-10 flex items-center">
                            {pathname !== "/dashboard" && (
                                <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8">
                                    <ChevronLeft className="h-5 w-5" />
                                </Button>
                            )}
                        </div>

                        <h1 className="text-sm font-bold tracking-tight text-center flex-1">
                            {getPageTitle()}
                        </h1>

                        <div className="w-10 flex justify-end items-center">
                            {dogId && activeDog && (
                                <Link href={`/dog/${dogId}/profile`} className="h-7 w-7 rounded-full bg-muted overflow-hidden border border-primary/20 shrink-0">
                                    {activeDog.image_url ? (
                                        <img src={activeDog.image_url} alt={activeDog.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary font-bold text-[10px]">
                                            {activeDog.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </Link>
                            )}
                        </div>
                    </div>
                </header>

                <main className="flex-1 container px-4 pt-14 pb-8 md:pt-8 md:p-8 w-full max-w-7xl mx-auto transition-all duration-300">
                    {children}
                </main>

                {/* Mobile Bottom Navigation - Global with prominent Center Action */}
                {dogId && !pathname.endsWith("/scan") && (
                    <div className="fixed bottom-0 left-0 right-0 py-2 px-4 bg-background/95 backdrop-blur-md border-t z-50 md:hidden pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
                        <div className="max-w-md mx-auto flex justify-around items-end">
                            {/* Nav Item 1 & 2 */}
                            {[navItems[0], navItems[1]].map((item) => {
                                const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
                                return (
                                    <Link key={item.href} href={item.href} className={cn("flex flex-col items-center gap-1 p-2 transition-colors", isActive ? "text-primary" : "text-muted-foreground")}>
                                        <item.icon className={cn("h-6 w-6")} />
                                        <span className="text-[10px] font-medium">{item.label}</span>
                                    </Link>
                                )
                            })}

                            {/* Center Action: Logg */}
                            <div className="flex flex-col items-center mb-1">
                                <HealthLogModal
                                    dogId={dogId}
                                    dogName={activeDog?.name}
                                    trigger={
                                        <button className="h-14 w-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center border-4 border-background -translate-y-4 active:scale-95 transition-all">
                                            <Plus className="h-8 w-8" />
                                        </button>
                                    }
                                />
                                <span className="text-[10px] font-bold text-primary -mt-3">Logg</span>
                            </div>

                            {/* Nav Item 3 & 4 */}
                            {[navItems[2], navItems[3]].map((item) => {
                                const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
                                return (
                                    <Link key={item.href} href={item.href} className={cn("flex flex-col items-center gap-1 p-2 transition-colors", isActive ? "text-primary" : "text-muted-foreground")}>
                                        <item.icon className={cn("h-6 w-6")} />
                                        <span className="text-[10px] font-medium">{item.label}</span>
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
