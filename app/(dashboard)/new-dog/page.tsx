"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { createDog } from "@/app/actions/dogs"

export default function NewDogPage() {
    // We'll use useFormState for server action feedback if needed, 
    // but for now let's just use a simple form action or client wrapper.
    // Actually, to keep 'loading' state UI, we can stick to client component invoking the action.

    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function clientAction(formData: FormData) {
        setLoading(true)
        const result = await createDog(null, formData)
        if (result?.message) {
            alert(result.message)
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
                    <form action={clientAction} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="name" className="text-sm font-medium">Dog&apos;s Name</label>
                            <Input
                                id="name"
                                name="name"
                                placeholder="e.g. Buddy"
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
