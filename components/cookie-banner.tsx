"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Cookie } from "lucide-react"

export function CookieBanner() {
    const [show, setShow] = useState(false)

    useEffect(() => {
        // Check local storage on mount
        const consent = localStorage.getItem("cookie_consent")
        if (!consent) {
            setShow(true)
        }
    }, [])

    const handleAccept = (type: 'all' | 'necessary') => {
        localStorage.setItem("cookie_consent", type)
        setShow(false)

        // Here you would normally trigger Analytics initialization if 'all' was chosen
        // Since we have no analytics yet, we just store the preference.
    }

    if (!show) return null

    return (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-lg border-t z-[100] shadow-lg animate-in slide-in-from-bottom-5">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-4 justify-between">
                <div className="flex items-start gap-4 text-sm text-muted-foreground flex-1">
                    <div className="p-2 bg-primary/10 rounded-full shrink-0 hidden sm:block">
                        <Cookie className="h-5 w-5 text-primary" />
                    </div>
                    <p>
                        Vi bruker informasjonskapsler for å gi deg en bedre opplevelse og holde deg innlogget.
                        Ved å trykke "Godta alle" samtykker du til dette.
                        Les mer i vår <Link href="/personvern" className="underline hover:text-foreground">personvernerklæring</Link>.
                    </p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto shrink-0">
                    <Button variant="outline" size="sm" onClick={() => handleAccept('necessary')} className="flex-1 sm:flex-none">
                        Kun nødvendige
                    </Button>
                    <Button size="sm" onClick={() => handleAccept('all')} className="flex-1 sm:flex-none">
                        Godta alle
                    </Button>
                </div>
            </div>
        </div>
    )
}
