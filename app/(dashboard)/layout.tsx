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
        <div className="min-h-screen flex flex-col bg-background">
            {/* Header */}
            <header className="border-b bg-card/50 backdrop-blur-md sticky top-0 z-50 transition-all">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-6">
                        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl text-primary shrink-0 transition-opacity hover:opacity-80">
                            <Dog className="h-6 w-6" />
                            <span className="hidden sm:inline">Bjeffer</span>
                        </Link>

                        {dogId && activeDog && (
                            <Link href={`/dog/${dogId}/profile`} className="flex items-center gap-3 pl-6 border-l group">
                                <div className="relative">
                                    <div className="h-10 w-10 rounded-full bg-muted overflow-hidden border-2 border-background shadow-sm group-hover:border-primary/50 transition-colors">
                                        {activeDog.image_url ? (
                                            <img src={activeDog.image_url} alt={activeDog.name} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary font-bold text-lg">
                                                {activeDog.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 shadow-sm">
                                        <div className="bg-green-500 h-2.5 w-2.5 rounded-full border-2 border-background"></div>
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-semibold text-sm leading-none group-hover:text-primary transition-colors">{activeDog.name}</span>
                                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Medisinsporing</span>
                                </div>
                            </Link>
                        )}
                    </div>

                    {/* Desktop Navigation - Centered */}
                    {dogId && (
                        <nav className="hidden md:flex items-center flex-1 justify-center">
                            {navItems.map((item) => {
                                const isActive = item.exact
                                    ? pathname === item.href
                                    : pathname.startsWith(item.href)

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all mx-1",
                                            isActive
                                                ? "bg-primary text-primary-foreground shadow-sm"
                                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                        )}
                                    >
                                        <item.icon className="h-4 w-4" />
                                        {item.label}
                                    </Link>
                                )
                            })}
                        </nav>
                    )}

                    <div className="flex items-center gap-2 shrink-0">
                        {/* Mobile: Just show a simpler logout or maybe nothing extra since we focus on desktop nav here */}
                        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
                            <LogOut className="h-4 w-4 mr-2" />
                            <span className="hidden sm:inline">Logg ut</span>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-4 py-8">
                {children}
            </main>
        </div>
    )
}
