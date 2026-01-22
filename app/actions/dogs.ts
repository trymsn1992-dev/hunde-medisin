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

export async function updateDogProfile(dogId: string, prevState: any, formData: FormData) {
    const supabase = await createClient()

    // Extract data
    const name = formData.get("name") as string
    const breed = formData.get("breed") as string
    const weight = formData.get("weight") as string
    const imageUrl = formData.get("image_url") as string

    if (!name) {
        return { message: "Navn er påkrevd" }
    }

    try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return { message: "Ikke logget inn" }
        }

        const { data, error } = await supabase
            .from("dogs")
            .update({
                name,
                breed: breed || null,
                weight: weight || null,
                image_url: imageUrl || null,
                missed_meds_alert_enabled: formData.has("missed_meds_alert_enabled"),
                missed_meds_delay_minutes: parseInt(formData.get("missed_meds_delay_minutes") as string) || 120
            })
            .eq("id", dogId)
            .select()

        if (error) {
            console.error("Update dog error:", error)
            return { message: "Kunne ikke oppdatere profil: " + error.message, success: false }
        }

        if (!data || data.length === 0) {
            // Should be covered by RLS or generic error catch
            return { message: "Du har ikke tilgang til å endre denne hunden eller hunden finnes ikke.", success: false }
        }

    } catch (e: any) {
        console.error("Unexpected error:", e)
        return { message: "Uventet feil: " + e.message, success: false }
    }

    revalidatePath(`/dog/${dogId}`)
    revalidatePath(`/dog/${dogId}/profile`)
    // We don't redirect, just stay on profile page with success
    return { success: true, message: "Profil oppdatert!" }
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

export async function updateLastVisitedDog(dogId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    // Fire and forget - we don't need to await this or block UI
    await supabase
        .from('profiles')
        .update({ last_visited_dog_id: dogId })
        .eq('id', user.id)
}
export async function updateMemberSettings(dogId: string, settings: { missed_meds_alert_enabled?: boolean, notify_on_dose_taken?: boolean }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { success: false, message: "Ikke logget inn" }

    const { error } = await supabase
        .from('dog_members')
        .update(settings)
        .eq('dog_id', dogId)
        .eq('user_id', user.id)

    if (error) {
        console.error("Update member settings error:", error)
        return { success: false, message: "Kunne ikke oppdatere innstillinger: " + error.message }
    }

    revalidatePath(`/dog/${dogId}/profile`)
    return { success: true, message: "Innstillinger oppdatert!" }
}
