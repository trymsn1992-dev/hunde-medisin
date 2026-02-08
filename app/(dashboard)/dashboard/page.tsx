"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { PricingModal } from "@/components/pricing-modal"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"

type Dog = {
    id: string
    name: string
    image_url: string | null
    // ... other fields
}

export default function DashboardPage() {
    const [dogs, setDogs] = useState<Dog[]>([])
    const [loading, setLoading] = useState(true)
    const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null)
    const [userEmail, setUserEmail] = useState<string>("")
    const supabase = createClient()
    const router = useRouter()

    const [isPricingOpen, setIsPricingOpen] = useState(false); // Added state

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push("/login")
                return
            }
            setUserEmail(user.email || "")

            // Fetch dogs where user is a member
            const { data: dogsData, error: dogsError } = await supabase
                .from("dogs")
                .select('id, name, image_url')

            if (dogsError) {
                console.error("Error fetching dogs:", dogsError)
            } else {
                setDogs((dogsData as unknown as Dog[]) || [])

                // Redirect if no dogs
                if (!dogsData || dogsData.length === 0) {
                    router.push("/new-dog")
                    return
                }
            }

            // Fetch subscription status
            const { data: profileData } = await supabase
                .from('profiles')
                .select('subscription_status')
                .eq('id', user.id)
                .single()

            setSubscriptionStatus(profileData?.subscription_status || null)

            setLoading(false)
        }

        fetchData()
    }, [router, supabase])



    if (loading) {
        return <div className="flex items-center justify-center h-64">Laster...</div>
    }

    // Check query params for Vipps return
    if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('vipps') === 'processing') {
            // Maybe show a toast or banner?
        }
    }

    const isSubscribed = subscriptionStatus === 'active' || subscriptionStatus === 'pending' || subscriptionStatus === 'trialing';

    return (
        <div className="space-y-6">
            <PricingModal open={isPricingOpen} onOpenChange={setIsPricingOpen} />
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    Mine Hunder
                    {isSubscribed && (
                        <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full font-medium border border-emerald-200">
                            Premium
                        </span>
                    )}
                </h1>
                {!isSubscribed && (
                    <Button
                        onClick={() => setIsPricingOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                    >
                        Oppgrader til Premium
                    </Button>
                )}
            </div>
            <div className="flex items-center gap-2">
                <Button asChild size="sm">
                    <Link href="/new-dog">
                        <Plus className="mr-2 h-4 w-4" /> Legg til hund
                    </Link>
                </Button>
            </div>

            {dogs.length === 0 ? (
                <div className="max-w-md mx-auto mt-10">
                    <Card className="text-center p-6 bg-card/50 border-dashed">
                        <CardHeader>
                            <div className="mx-auto w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                                <Plus className="h-6 w-6 text-primary" />
                            </div>
                            <CardTitle>Ingen hunder enda</CardTitle>
                            <CardDescription>
                                Opprett en profil for hunden din for å begynne å spore medisiner.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button asChild className="w-full">
                                <Link href="/new-dog">Legg til hundeprofil</Link>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {dogs.map((dog) => (
                        <Link key={dog.id} href={`/dog/${dog.id}`}>
                            <Card className="hover:bg-accent/5 transition-colors cursor-pointer border-l-4 border-l-primary">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                                    <div className="space-y-1">
                                        <CardTitle className="text-xl">{dog.name}</CardTitle>
                                        <CardDescription>Klikk for å administrere</CardDescription>
                                    </div>
                                    {dog.image_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={dog.image_url} alt={dog.name} className="h-12 w-12 rounded-full object-cover bg-muted" />
                                    ) : (
                                        <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                            {dog.name.substring(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                </CardHeader>
                                <CardFooter className="pt-0">
                                    <div className="flex items-center text-sm text-muted-foreground w-full justify-end">
                                        Gå til oversikt <ChevronRight className="ml-1 h-4 w-4" />
                                    </div>
                                </CardFooter>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}
