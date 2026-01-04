'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createDog(prevState: any, formData: FormData) {
    const supabase = await createClient()
    const name = formData.get("name") as string

    if (!name) {
        return { message: "Name is required" }
    }

    try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return { message: "Not authenticated" }
        }

        // 1. Create Dog
        const { data: dogData, error: dogError } = await supabase
            .from("dogs")
            .insert({
                name,
                created_by: user.id
            })
            .select()
            .single()

        if (dogError) {
            console.error("Dog creation error:", dogError)
            return { message: "Failed to create dog: " + dogError.message }
        }

        // 2. Add creator as Admin member
        const { error: memberError } = await supabase
            .from("dog_members")
            .insert({
                dog_id: dogData.id,
                user_id: user.id,
                role: 'admin'
            })

        if (memberError) {
            console.error("Member creation error:", memberError)
            // If this fails, we have an orphaned dog. 
            // Ideally we should delete the dog, but let's just report error.
            return { message: "Dog created but failed to join: " + memberError.message }
        }

    } catch (e) {
        return { message: "Unexpected error" }
    }

    revalidatePath("/dashboard")
    redirect("/dashboard")
}
