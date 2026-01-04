"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function NewDogPage() {
    const [name, setName] = useState("")
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error("Not authenticated")

            // 1. Create Dog
            const { data: dogData, error: dogError } = await supabase
                .from("dogs")
                .insert({
                    name,
                    created_by: user.id
                })
                .select()
                .single()

            if (dogError) throw dogError

            // 2. Add creator as Admin member
            const { error: memberError } = await supabase
                .from("dog_members")
                .insert({
                    dog_id: dogData.id,
                    user_id: user.id,
                    role: 'admin'
                })

            if (memberError) {
                // If member creation fails, cleanup dog? For prototype, just log
                console.error("Failed to add member:", memberError)
            }

            router.push(`/dog/${dogData.id}`)
            router.refresh()

        } catch (err: unknown) {
            console.error(err)
            const message = err instanceof Error ? err.message : "Unknown error"
            alert("Error creating dog: " + message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-md mx-auto space-y-6">
            <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                </Link>
            </Button>

            <Card>
                <CardHeader>
                    <CardTitle>Add a New Dog</CardTitle>
                    <CardDescription>
                        Create a profile to start tracking medications.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="name" className="text-sm font-medium">Dog&apos;s Name</label>
                            <Input
                                id="name"
                                placeholder="e.g. Buddy"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Creating..." : "Create Profile"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
