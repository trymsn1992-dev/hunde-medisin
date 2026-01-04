"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
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
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        const fetchDogs = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push("/login")
                return
            }

            // Fetch dogs where user is a member
            const { data, error } = await supabase
                .from("dogs")
                .select(`
          id,
          name,
          image_url
          -- we could join dog_members to filter, but RLS should handle visibility if policy is correct
          -- Wait, RLS for 'select * from dogs' uses:
          -- exists (select 1 from dog_members where dog_id=dogs.id and user_id=uid)
          -- So simplistic fetch should work if RLS is on.
        `)

            if (error) {
                console.error("Error fetching dogs:", error)
            } else {
                setDogs((data as unknown as Dog[]) || [])
            }
            setLoading(false)
        }

        fetchDogs()
    }, [router, supabase])

    if (loading) {
        return <div className="flex items-center justify-center h-64">Loading...</div>
    }

    // If no dogs, show specialized empty state
    if (dogs.length === 0) {
        return (
            <div className="max-w-md mx-auto mt-10">
                <Card className="text-center p-6 bg-card/50 border-dashed">
                    <CardHeader>
                        <div className="mx-auto w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                            <Plus className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle>No dogs yet</CardTitle>
                        <CardDescription>
                            Create a profile for your dog to start tracking medications.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild className="w-full">
                            <Link href="/new-dog">Add Dog Profile</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Your Dogs</h1>
                <Button asChild size="sm">
                    <Link href="/new-dog">
                        <Plus className="mr-2 h-4 w-4" /> Add Dog
                    </Link>
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {dogs.map((dog) => (
                    <Link key={dog.id} href={`/dog/${dog.id}`}>
                        <Card className="hover:bg-accent/5 transition-colors cursor-pointer border-l-4 border-l-primary">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                                <div className="space-y-1">
                                    <CardTitle className="text-xl">{dog.name}</CardTitle>
                                    <CardDescription>Click to manage</CardDescription>
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
                                    Go to Dashboard <ChevronRight className="ml-1 h-4 w-4" />
                                </div>
                            </CardFooter>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    )
}
