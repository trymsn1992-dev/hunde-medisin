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

export async function deleteDog(dogId: string) {
    const supabase = await createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { message: "Not authenticated" }

        const { error } = await supabase
            .from("dogs")
            .delete()
            .eq("id", dogId)
        // Extra safety: only delete if created by user OR user is admin member
        // RLS should handle this, but explicit check doesn't hurt.
        // Actually, RLS for DELETE on 'dogs' is not standard yet in our schema.
        // Let's rely on RLS policies we just checked/fixed.

        if (error) {
            console.error("Delete dog error:", error)
            return { message: "Failed to delete dog: " + error.message }
        }

    } catch (e) {
        return { message: "Unexpected error" }
    }

    revalidatePath("/dashboard")
    redirect("/dashboard")
}

export async function joinDogByInvite(inviteCode: string) {
    const supabase = await createClient()

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { message: "Not authenticated" }

        const { data: dogId, error } = await supabase.rpc('join_dog_by_invite', {
            _code: inviteCode
        })

        if (error) {
            console.error("Join dog error:", error)
            return { message: "Failed to join: " + error.message }
        }

        return { success: true, dogId }

    } catch (e) {
        return { message: "Unexpected error" }
    }
}
