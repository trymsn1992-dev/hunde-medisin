'use client'

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, Camera, Upload, PawPrint, Weight, ArrowLeft, UserPlus } from "lucide-react"
import { updateDogProfile, updateMemberSettings, deleteDog } from "@/app/actions/dogs"
import Link from "next/link"
import SubscriptionManager from "@/components/pwa/SubscriptionManager"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { LogOut, Trash2 } from "lucide-react"

export default function DogProfilePage() {
    const params = useParams()
    const dogId = params.id as string
    const router = useRouter()
    const supabase = createClient()

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [dog, setDog] = useState<any>(null)
    const [uploading, setUploading] = useState(false)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [imageUrl, setImageUrl] = useState<string>("")
    const [isEditing, setIsEditing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [members, setMembers] = useState<any[]>([])
    const [currentMember, setCurrentMember] = useState<any>(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push("/login")
        router.refresh()
    }

    const handleDeleteDog = async () => {
        try {
            const res = await deleteDog(dogId)
            if (res.success) {
                router.push("/dashboard")
                router.refresh()
            } else {
                alert("Feil ved sletting: " + res.error)
            }
        } catch (err) {
            console.error(err)
            alert("En uventet feil oppsto")
        }
    }

    useEffect(() => {
        const fetchDog = async () => {
            const { data: { user } } = await supabase.auth.getUser()

            // Fetch Dog
            const { data } = await supabase.from("dogs").select("*").eq("id", dogId).single()
            if (data) {
                setDog(data)
                setPreviewUrl(data.image_url)
                setImageUrl(data.image_url || "")
            }

            // Fetch Members
            const { data: membersData } = await supabase
                .from("dog_members")
                .select("*, profiles(full_name, avatar_url)")
                .eq("dog_id", dogId)

            if (membersData) {
                setMembers(membersData)
                if (user) {
                    const me = membersData.find(m => m.user_id === user.id)
                    setCurrentMember(me)
                }
            }

            setLoading(false)
        }
        fetchDog()
    }, [dogId, supabase])

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) {
            return
        }

        const file = event.target.files[0]
        setUploading(true)
        setError(null)

        try {
            // 1. Create a unique file name
            const fileExt = file.name.split('.').pop()
            const fileName = `${dogId}-${Date.now()}.${fileExt}`
            const filePath = `${fileName}`

            // 2. Upload to 'avatars' bucket
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file)

            if (uploadError) {
                throw uploadError
            }

            // 3. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath)

            setPreviewUrl(publicUrl)
            setImageUrl(publicUrl)
        } catch (error: any) {
            console.error("Upload failed", error)
            alert("Kunne ikke laste opp bilde. Sjekk at du har tilgang. (" + error.message + ")")
        } finally {
            setUploading(false)
        }
    }

    async function handleSubmit(formData: FormData) {
        setSaving(true)
        setError(null)
        setSuccess(null)

        try {
            // 1. Update Dog Profile
            const result = await updateDogProfile(dogId, null, formData)

            if (!result.success) {
                setError(result.message)
                return
            }

            // 2. Update Member Settings
            const memberSettings = {
                missed_meds_alert_enabled: formData.has("member_missed_meds_alert"),
                notify_on_dose_taken: formData.has("member_notify_on_dose_taken")
            }
            await updateMemberSettings(dogId, memberSettings)

            setSuccess("Profil og innstillinger oppdatert!")
            setIsEditing(false)

            // RE-FETCH data immediately
            const { data: { user } } = await supabase.auth.getUser()
            const { data: updatedDog } = await supabase.from("dogs").select("*").eq("id", dogId).single()
            if (updatedDog) setDog(updatedDog)

            const { data: membersData } = await supabase
                .from("dog_members")
                .select("*, profiles(full_name, avatar_url)")
                .eq("dog_id", dogId)
            if (membersData) {
                setMembers(membersData)
                if (user) {
                    const me = membersData.find(m => m.user_id === user.id)
                    setCurrentMember(me)
                }
            }

            router.refresh()
        } catch (e: any) {
            console.error("Save error:", e)
            setError("Noe gikk galt under lagring.")
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-20">
            <div className="flex items-center gap-4 mb-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={`/dog/${dogId}`}>
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Profil</h1>
                    <p className="text-muted-foreground">{isEditing ? "Rediger profil" : `Detaljer for ${dog?.name || "hunden"}`}</p>
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex flex-col space-y-1.5">
                        <CardTitle>Generell info</CardTitle>
                        <CardDescription>Informasjon om din firbente venn.</CardDescription>
                    </div>
                    {!isEditing && (
                        <Button variant="outline" onClick={() => setIsEditing(true)}>
                            Rediger
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="pt-6">
                    {!isEditing ? (
                        // READ-ONLY VIEW
                        <div className="flex flex-col items-center space-y-6">
                            <div className="relative h-32 w-32 rounded-full overflow-hidden border-4 border-background shadow-md bg-muted">
                                {dog?.image_url ? (
                                    <img src={dog.image_url} alt={dog.name} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary font-bold text-4xl">
                                        {dog?.name?.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 w-full max-w-lg text-center sm:text-left">
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground text-xs uppercase tracking-wider">Navn</Label>
                                    <p className="text-xl font-semibold">{dog?.name}</p>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground text-xs uppercase tracking-wider">Rase</Label>
                                    <div className="flex items-center justify-center sm:justify-start gap-2">
                                        <PawPrint className="h-4 w-4 text-primary" />
                                        <p className="text-lg">{dog?.breed || "-"}</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground text-xs uppercase tracking-wider">Vekt</Label>
                                    <div className="flex items-center justify-center sm:justify-start gap-2">
                                        <Weight className="h-4 w-4 text-primary" />
                                        <p className="text-lg">{dog?.weight || "-"}</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground text-xs uppercase tracking-wider">Glemt medisin varsel</Label>
                                    <div className="flex items-center justify-center sm:justify-start gap-2">
                                        <p className="text-lg">{dog?.missed_meds_alert_enabled ? `På (${dog?.missed_meds_delay_minutes} min)` : "Av"}</p>
                                    </div>
                                </div>
                            </div>


                            {success && (
                                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-md text-sm mt-4 animate-in fade-in">
                                    {success}
                                </div>
                            )}
                        </div>
                    ) : (
                        // EDIT FORM VIEW
                        <form
                            onSubmit={(e) => {
                                e.preventDefault()
                                const formData = new FormData(e.currentTarget)
                                handleSubmit(formData)
                            }}
                            className="space-y-6"
                        >

                            {/* Image Upload Section */}
                            <div className="flex flex-col items-center gap-4 p-6 bg-muted/20 rounded-lg border border-dashed">
                                <div className="relative group cursor-pointer w-32 h-32">
                                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-background shadow-md bg-muted flex items-center justify-center">
                                        {previewUrl ? (
                                            <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <Camera className="h-10 w-10 text-muted-foreground opacity-50" />
                                        )}
                                    </div>
                                    <label htmlFor="image-upload" className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer">
                                        <Upload className="h-6 w-6" />
                                    </label>
                                    <input
                                        id="image-upload"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageUpload}
                                        disabled={uploading}
                                    />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-medium">Profilbilde</p>
                                    <p className="text-xs text-muted-foreground">Klikk på bildet for å endre</p>
                                </div>
                                {/* Hidden input to store URL for the server action */}
                                <input type="hidden" name="image_url" value={imageUrl} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="name">Navn</Label>
                                <Input id="name" name="name" defaultValue={dog?.name} required />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="breed" className="flex items-center gap-2">
                                        <PawPrint className="h-4 w-4 text-muted-foreground" /> Rase
                                    </Label>
                                    <Input id="breed" name="breed" defaultValue={dog?.breed || ""} placeholder="Eks. Labrador" />
                                </div>
                                <div className="space-y-2">
                                    <Input id="weight" name="weight" defaultValue={dog?.weight || ""} placeholder="Eks. 25 kg" />
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t">
                                <h3 className="font-medium text-sm">Varslinger</h3>
                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="missed_meds_alert_enabled"
                                            name="missed_meds_alert_enabled"
                                            className="h-4 w-4"
                                            defaultChecked={dog?.missed_meds_alert_enabled}
                                        />
                                        <Label htmlFor="missed_meds_alert_enabled">Varsle meg hvis jeg glemmer medisin</Label>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="missed_meds_delay_hours">Varsle etter (timer ubesvart)</Label>
                                        <select
                                            id="missed_meds_delay_hours"
                                            name="missed_meds_delay_minutes"
                                            className="w-full p-2 rounded-md border bg-background"
                                            defaultValue={dog?.missed_meds_delay_minutes || 120}
                                        >
                                            <option value="60">1 time</option>
                                            <option value="120">2 timer</option>
                                            <option value="180">3 timer</option>
                                        </select>
                                        <p className="text-xs text-muted-foreground">Hvor lenge skal vi vente før vi varsler hvis ingen logger medisinen?</p>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 text-red-800 rounded-md text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <Button type="button" variant="ghost" onClick={() => setIsEditing(false)} disabled={uploading || saving}>
                                    Avbryt
                                </Button>
                                <Button type="submit" disabled={uploading || saving}>
                                    {saving ? <Loader2 className="animate-spin mr-2" /> : null}
                                    Lagre endringer
                                </Button>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>
            {/* MEMBERS LIST */}
            <Card>
                <CardHeader>
                    <CardTitle>Hvem ser på {dog?.name}?</CardTitle>
                    <CardDescription>Oversikt over alle som følger hunden.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {members.map((member) => (
                            <div key={member.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                                <div className="h-10 w-10 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center shrink-0">
                                    {member.profiles?.avatar_url ? (
                                        <img src={member.profiles.avatar_url} alt={member.profiles.full_name} className="h-full w-full object-cover" />
                                    ) : (
                                        <span className="text-sm font-bold">{member.profiles?.full_name?.charAt(0) || "U"}</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{member.profiles?.full_name}</p>
                                    <p className="text-xs text-muted-foreground capitalize">{member.role === 'admin' ? 'Administrator' : 'Medlem'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* ACCESS CARD */}
            <Card>
                <CardHeader>
                    <CardTitle>Inviter flere</CardTitle>
                    <CardDescription>Del tilgang med familiemedlemmer.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                            <div className="space-y-1">
                                <p className="font-medium text-sm">Invitasjonslenke</p>
                                <p className="text-xs text-muted-foreground">Kopier og send til de som skal ha tilgang.</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => {
                                const url = `${window.location.origin}/join/${dog?.invite_code}`
                                navigator.clipboard.writeText(url)
                                alert("Invitasjonslenke kopiert!")
                            }}>
                                <UserPlus className="mr-2 h-4 w-4" />
                                Kopier
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* NOTIFICATIONS CARD */}
            <Card>
                <CardHeader>
                    <CardTitle>Mine varslinger</CardTitle>
                    <CardDescription>Administrer varslinger for din mobil/enhet.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <SubscriptionManager />

                    {currentMember && (
                        <div className="space-y-4 pt-4 border-t">
                            <h4 className="text-sm font-semibold">Innstillinger for denne enheten</h4>

                            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-medium">Glemt medisin</Label>
                                    <p className="text-xs text-muted-foreground">Få varsel hvis ingen logger medisinen.</p>
                                </div>
                                <input
                                    type="checkbox"
                                    className="h-5 w-5 rounded border-gray-300"
                                    checked={currentMember.missed_meds_alert_enabled}
                                    onChange={async (e) => {
                                        const success = await updateMemberSettings(dogId, { missed_meds_alert_enabled: e.target.checked })
                                        if (success.success) {
                                            setCurrentMember({ ...currentMember, missed_meds_alert_enabled: e.target.checked })
                                        }
                                    }}
                                />
                            </div>

                            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-medium">Når andre gir medisin</Label>
                                    <p className="text-xs text-muted-foreground">Få beskjed når andre logfører en dose.</p>
                                </div>
                                <input
                                    type="checkbox"
                                    className="h-5 w-5 rounded border-gray-300"
                                    checked={currentMember.notify_on_dose_taken}
                                    onChange={async (e) => {
                                        const success = await updateMemberSettings(dogId, { notify_on_dose_taken: e.target.checked })
                                        if (success.success) {
                                            setCurrentMember({ ...currentMember, notify_on_dose_taken: e.target.checked })
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* SECURITY & LOGOUT */}
            <Card className="border-destructive/20 bg-destructive/5">
                <CardHeader>
                    <CardTitle className="text-destructive">Sikkerhet & Logg ut</CardTitle>
                    <CardDescription>Logg ut av appen eller slett denne hundeprofilen.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Button
                            variant="outline"
                            className="bg-background hover:bg-muted"
                            onClick={handleLogout}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Logg ut
                        </Button>

                        {currentMember?.role === 'admin' && (
                            <Button
                                variant="destructive"
                                onClick={() => setShowDeleteConfirm(true)}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Slett hundeprofil
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Er du helt sikker?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Dette vil slette profilen til <strong>{dog?.name}</strong> og all tilhørende historikk for alle medlemmer. Denne handlingen kan ikke angres.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Avbryt</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteDog} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Ja, slett profil
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
