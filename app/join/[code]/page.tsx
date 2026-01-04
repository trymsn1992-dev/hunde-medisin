import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { joinDogByInvite } from "@/app/actions/dogs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
    const { code } = await params
    const supabase = await createClient()

    // 1. Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser()

    // 2. Fetch Dog Info (Safe RPC)
    const { data: dogs, error } = await supabase.rpc('get_dog_by_invite', { _code: code })
    const dog = dogs && dogs[0]

    if (error || !dog) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <Card className="w-full max-w-md text-center">
                    <CardHeader>
                        <CardTitle className="text-red-500">Invalid Invitation</CardTitle>
                        <CardDescription>
                            We couldn't find a dog with this code. The link might be expired or incorrect.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild>
                            <Link href="/">Back to Home</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // 3. Handle Join Action
    async function handleJoin() {
        "use server"
        const result = await joinDogByInvite(code)
        if (result.success && result.dogId) {
            redirect(`/dog/${result.dogId}`)
        } else {
            // Error handling? For now redirect to dashboard
            redirect("/dashboard?error=join_failed")
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
            <Card className="w-full max-w-md text-center shadow-lg">
                <CardHeader>
                    <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-3xl">
                        🐶
                    </div>
                    <CardTitle className="text-2xl">Join {dog.name}&apos;s Team</CardTitle>
                    <CardDescription>
                        You have been invited to help manage medications for {dog.name}.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {user ? (
                        <form action={handleJoin}>
                            <Button size="lg" className="w-full font-semibold">
                                Join Now
                            </Button>
                        </form>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">
                                You need to log in to accept this invitation.
                            </p>
                            <div className="grid gap-2">
                                <Button asChild variant="default" className="w-full">
                                    <Link href={`/login?next=/join/${code}`}>Log In</Link>
                                </Button>
                                <Button asChild variant="outline" className="w-full">
                                    <Link href={`/signup?next=/join/${code}`}>Create Account</Link>
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
