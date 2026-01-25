"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowLeft, Camera, Edit3 } from "lucide-react"

export default function NewMedicinePage() {
    const params = useParams()
    const dogId = params.id as string

    return (
        <div className="max-w-lg mx-auto space-y-6">
            <div className="text-center space-y-2 pt-4">
                <h1 className="text-2xl font-bold">Legg til medisin</h1>
                <p className="text-muted-foreground">Velg hvordan du vil legge til medisinen.</p>
            </div>

            <div className="grid gap-4">
                <Link href={`/dog/${dogId}/medicines/new/scan`}>
                    <Card className="hover:bg-accent/10 transition-colors border-primary/20 cursor-pointer">
                        <CardHeader className="flex flex-row items-center space-y-0 gap-4">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                <Camera className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1">
                                <CardTitle>Skann etikett</CardTitle>
                                <CardDescription>Ta bilde for å fylle ut automatisk</CardDescription>
                            </div>
                        </CardHeader>
                    </Card>
                </Link>

                <Link href={`/dog/${dogId}/medicines/new/manual`}>
                    <Card className="hover:bg-accent/10 transition-colors cursor-pointer">
                        <CardHeader className="flex flex-row items-center space-y-0 gap-4">
                            <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center">
                                <Edit3 className="h-6 w-6 text-foreground" />
                            </div>
                            <div className="flex-1">
                                <CardTitle>Legg til manuelt</CardTitle>
                                <CardDescription>Skriv inn navn og dosering selv</CardDescription>
                            </div>
                        </CardHeader>
                    </Card>
                </Link>
            </div>
        </div>
    )
}
