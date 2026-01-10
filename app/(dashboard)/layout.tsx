"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { LogOut, Dog, LayoutGrid, CalendarDays, Pill, Heart } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
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
        { label: "Medisiner", href: `/dog/${dogId}/medicines`, icon: Pill },
        { label: "Helse", href: `/dog/${dogId}/health/log`, icon: Heart },
    ] : []

    return (
        <div className="min-h-screen flex bg-background">
            {/* Desktop Sidebar */}
            {dogId && (
                <aside className="hidden md:flex w-64 flex-col border-r bg-card/50 backdrop-blur-md sticky top-0 h-screen shrink-0">
                    <div className="h-16 flex items-center px-6 border-b">
                        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl text-primary transition-opacity hover:opacity-80">
                            <Dog className="h-6 w-6" />
                            <span>Bjeffer</span>
                        </Link>
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
                        </nav>
                    </div>

                    <div className="p-4 border-t">
                        <Button variant="ghost" onClick={handleLogout} className="w-full justify-start text-muted-foreground hover:text-foreground">
                            <LogOut className="h-4 w-4 mr-2" />
                            Logg ut
                        </Button>
                    </div>
                </aside>
            )}

            <div className="flex-1 flex flex-col min-w-0">
                {/* Mobile Header (Hidden on Desktop if Sidebar handles logo? No, usually keep header for mobile) */}
                {/* Actually, let's keep a Header for Mobile ONLY, or adapted for desktop (e.g. just user profile) */}
                <header className="border-b bg-card/50 backdrop-blur-md sticky top-0 z-50 md:hidden">
                    <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
                        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl text-primary shrink-0">
                            <Dog className="h-6 w-6" />
                            <span>Bjeffer</span>
                        </Link>

                        <div className="flex items-center gap-2">
                            {/* Mobile Active Dog Indicator */}
                            {dogId && activeDog && (
                                <Link href={`/dog/${dogId}/profile`} className="h-8 w-8 rounded-full bg-muted overflow-hidden border border-primary/20">
                                    {activeDog.image_url ? (
                                        <img src={activeDog.image_url} alt={activeDog.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary font-bold text-xs">
                                            {activeDog.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </Link>
                            )}
                            <Button variant="ghost" size="icon" onClick={handleLogout}>
                                <LogOut className="h-5 w-5 text-muted-foreground" />
                            </Button>
                        </div>
                    </div>
                </header>

                <main className="flex-1 container px-4 py-8 md:p-8 w-full max-w-7xl mx-auto pb-24">
                    {children}
                </main>

                {/* Mobile Bottom Navigation - Global */}
                {dogId && (
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur-lg border-t z-50 md:hidden pb-[calc(1rem+env(safe-area-inset-bottom))]">
                        <div className="max-w-md mx-auto flex justify-around items-center">
                            {navItems.map((item) => {
                                const isActive = item.exact
                                    ? pathname === item.href
                                    : pathname.startsWith(item.href)

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors min-w-[64px]",
                                            isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <item.icon className={cn("h-6 w-6", isActive && "fill-current/20")} />
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
