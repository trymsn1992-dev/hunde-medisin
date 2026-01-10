import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoginForm } from "@/components/auth/login-form"
import { SignupForm } from "@/components/auth/signup-form"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function Home() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    // 1. Check for last visited dog
    const { data: profile } = await supabase
      .from('profiles')
      .select('last_visited_dog_id')
      .eq('id', session.user.id)
      .single()

    if (profile?.last_visited_dog_id) {
      redirect(`/dog/${profile.last_visited_dog_id}`)
    }

    // 2. Fallback: Check for any dog
    const { data: member } = await supabase
      .from('dog_members')
      .select('dog_id')
      .eq('user_id', session.user.id)
      .limit(1)
      .single()

    if (member?.dog_id) {
      redirect(`/dog/${member.dog_id}`)
    }

    // 3. Fallback: Dashboard root (likely "Create Dog" flow)
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center p-4">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-4xl gap-12 mt-10 md:mt-0">
        <div className="text-center space-y-6">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-primary">
            Bjeffer
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Den smarte assistenten for hundens medisinering.
            <br className="hidden md:inline" /> Koordiner med familien, glem aldri en dose.
          </p>
        </div>

        {/* Auth Tabs */}
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 h-12">
              <TabsTrigger value="login" className="text-base">Start / Logg inn</TabsTrigger>
              <TabsTrigger value="signup" className="text-base">Ny bruker</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <LoginForm hideTitle />
            </TabsContent>
            <TabsContent value="signup">
              <SignupForm hideTitle />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Footer / Links */}
      <div className="py-8 text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Bjeffer. Laget med ❤️ for våre firbente venner.</p>
      </div>
    </div>
  )
}
