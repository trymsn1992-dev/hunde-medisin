"use client"

import { useState, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import Webcam from "react-webcam"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowLeft, Upload, Loader2, CheckCircle2, Camera, RefreshCw } from "lucide-react"
import { scanMedicationImage } from "@/app/actions/ocr"
import { cn } from "@/lib/utils"

export default function ScanMedicinePage() {
    const params = useParams()
    const router = useRouter()
    const dogId = params.id as string

    const fileInputRef = useRef<HTMLInputElement>(null)
    const webcamRef = useRef<Webcam>(null)

    const [mode, setMode] = useState<'upload' | 'camera'>('upload')
    const [mirrored, setMirrored] = useState(true)
    const [imageSrc, setImageSrc] = useState<string | null>(null)
    const [isScanning, setIsScanning] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [scannedData, setScannedData] = useState<{ name?: string, strength?: string, dose?: string, duration?: string, frequency?: string[], category?: string } | null>(null)

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event) => {
            if (event.target?.result) {
                setImageSrc(event.target.result as string)
                setScannedData(null)
                setError(null)
            }
        }
        reader.readAsDataURL(file)
    }

    const capture = useCallback(() => {
        const image = webcamRef.current?.getScreenshot()
        if (image) {
            setImageSrc(image)
            setError(null)
            setScannedData(null)
        }
    }, [webcamRef])

    const processImage = async () => {
        if (!imageSrc) return

        setIsScanning(true)
        setError(null)

        try {
            const result = await scanMedicationImage(imageSrc)

            setScannedData({
                name: result.name || undefined,
                strength: result.strength || undefined,
                dose: result.dose_text || undefined,
                duration: result.duration_days?.toString() || undefined,
                frequency: result.frequency,
                category: result.category || undefined
            })

        } catch (err: unknown) {
            console.error("OCR Error:", err)
            const message = err instanceof Error ? err.message : "Failed to scan image."
            setError(message)
        } finally {
            setIsScanning(false)
        }
    }

    const confirmAndRedirect = () => {
        const query = new URLSearchParams()

        let finalName = scannedData?.name || ""
        if (scannedData?.category) {
            finalName += ` (${scannedData.category})`
        }

        if (finalName) query.set("name", finalName)
        if (scannedData?.strength) query.set("strength", scannedData.strength)
        if (scannedData?.dose) query.set("dose", scannedData.dose)
        if (scannedData?.duration) query.set("duration", scannedData.duration)
        if (scannedData?.frequency) {
            scannedData.frequency.forEach(t => query.append("times", t))
        }

        router.push(`/dog/${dogId}/medicines/new/manual?${query.toString()}`)
    }

    const clearImage = () => {
        setImageSrc(null)
        setScannedData(null)
        setError(null)
        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    return (
        <div className="max-w-lg mx-auto space-y-6">
            <Button variant="ghost" size="sm" asChild>
                <Link href={`/dog/${dogId}/medicines/new`}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Tilbake
                </Link>
            </Button>

            <div className="space-y-2">
                <h1 className="text-2xl font-bold">Skann medisin</h1>
                <p className="text-muted-foreground">Ta bilde eller last opp bilde av pakken.</p>
            </div>

            <div className="flex p-1 bg-muted rounded-lg">
                <button
                    onClick={() => { setMode('upload'); clearImage() }}
                    className={cn(
                        "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                        mode === 'upload' ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    Last opp fil
                </button>
                <button
                    onClick={() => { setMode('camera'); clearImage() }}
                    className={cn(
                        "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                        mode === 'camera' ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    Bruk kamera
                </button>
            </div>

            <Card className="border-2 border-dashed border-muted-foreground/20 hover:bg-muted/50 transition-colors overflow-hidden">
                <CardContent className="flex flex-col items-center justify-center p-0 min-h-[300px] relative bg-background">

                    {imageSrc ? (
                        <div className="relative w-full h-full min-h-[300px] bg-black/5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={imageSrc} alt="Preview" className="w-full h-full object-contain max-h-[400px]" />
                            <Button
                                size="sm"
                                variant="secondary"
                                className="absolute bottom-4 right-4 shadow-lg z-10"
                                onClick={clearImage}
                            >
                                <RefreshCw className="mr-2 h-4 w-4" /> Retake
                            </Button>
                        </div>
                    ) : (
                        mode === 'upload' ? (
                            <div className="flex flex-col items-center justify-center py-10 space-y-4 w-full h-full">
                                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Upload className="h-8 w-8 text-primary" />
                                </div>
                                <div className="text-center px-4">
                                    <h3 className="font-semibold">Last opp bilde</h3>
                                    <p className="text-sm text-muted-foreground">Klikk under for å velge fil</p>
                                </div>
                                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                                    Velg fil
                                </Button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                />
                            </div>
                        ) : (
                            <div className="relative w-full h-full min-h-[300px] bg-black flex flex-col items-center justify-center">
                                <Webcam
                                    audio={false}
                                    ref={webcamRef}
                                    mirrored={mirrored}
                                    screenshotFormat="image/jpeg"
                                    className="w-full h-full object-cover"
                                    videoConstraints={{
                                        facingMode: "environment"
                                    }}
                                    onUserMediaError={(err) => {
                                        console.error("Webcam Error:", err)
                                        setError("Kamera krever sikker tilkobling (HTTPS). Vennligst bruk 'Last opp fil' på mobil.")
                                    }}
                                />
                                <div className="absolute bottom-6 flex items-center gap-4">
                                    <Button
                                        variant="secondary"
                                        size="icon"
                                        className="rounded-full h-10 w-10 bg-black/50 text-white hover:bg-black/70 border-0 shadow-sm"
                                        onClick={() => setMirrored(!mirrored)}
                                        title="Toggle Mirror"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        size="lg"
                                        className="rounded-full h-16 w-16 p-0 shadow-lg border-4 border-white/20"
                                        onClick={capture}
                                    >
                                        <Camera className="h-8 w-8" />
                                    </Button>
                                    <div className="w-10"></div>
                                </div>
                            </div>
                        )
                    )}
                </CardContent>
            </Card>

            {
                error && (
                    <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm font-medium">
                        {error}
                    </div>
                )
            }

            {
                imageSrc && !scannedData && (
                    <Button className="w-full" size="lg" onClick={processImage} disabled={isScanning}>
                        {isScanning ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Analyserer...
                            </>
                        ) : (
                            "Analyser bilde"
                        )}
                    </Button>
                )
            }

            {
                scannedData && (
                    <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <CardHeader>
                            <CardTitle className="flex items-center text-green-600 gap-2">
                                <CheckCircle2 className="h-5 w-5" />
                                Analysis Complete
                            </CardTitle>
                            <CardDescription>We found the following information:</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2 text-sm">
                                <div className="flex justify-between py-1 border-b">
                                    <span className="text-muted-foreground">Name</span>
                                    <span className="font-medium">{scannedData.name || "Not found"}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b">
                                    <span className="text-muted-foreground">Strength</span>
                                    <span className="font-medium">{scannedData.strength || "Not found"}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b">
                                    <span className="text-muted-foreground">Dose Instruction</span>
                                    <span className="font-medium">{scannedData.dose || "Not found"}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b">
                                    <span className="text-muted-foreground">Duration</span>
                                    <span className="font-medium">{scannedData.duration ? `${scannedData.duration} days` : "Indefinite (Until stopped)"}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b">
                                    <span className="text-muted-foreground">Schedule</span>
                                    <span className="font-medium">
                                        {scannedData.frequency && scannedData.frequency.length > 0
                                            ? scannedData.frequency.join(", ")
                                            : "08:00 (Default)"}
                                    </span>
                                </div>
                            </div>

                            <div className="pt-2">
                                <Button onClick={confirmAndRedirect} className="w-full">
                                    Continue with this info
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )
            }
        </div >
    )
}
