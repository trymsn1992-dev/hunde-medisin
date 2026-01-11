"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import Webcam from "react-webcam"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowLeft, Upload, Loader2, CheckCircle2, Camera, RefreshCw, Zap } from "lucide-react"
import { scanMedicationImage } from "@/app/actions/ocr"
import { cn } from "@/lib/utils"

export default function ScanMedicinePage() {
    const params = useParams()
    const router = useRouter()
    const dogId = params.id as string

    const fileInputRef = useRef<HTMLInputElement>(null)
    const webcamRef = useRef<Webcam>(null)

    const [mode, setMode] = useState<'upload' | 'camera'>('camera') // Default to camera for ease
    const [mirrored, setMirrored] = useState(false) // Usually back camera isn't mirrored
    const [imageSrc, setImageSrc] = useState<string | null>(null)
    const [isScanning, setIsScanning] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [scannedData, setScannedData] = useState<{ name?: string, strength?: string, dose?: string, duration?: string, frequency?: string[], category?: string, color?: string } | null>(null)
    const [facingMode, setFacingMode] = useState<"user" | "environment">("environment")

    // Camera Constraints for High Res
    const videoConstraints = {
        facingMode: facingMode,
        width: { ideal: 4096 },
        height: { ideal: 2160 }
    }

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

    // SMART CROP LOGIC
    const capture = useCallback(() => {
        const video = webcamRef.current?.video
        if (!video) return

        // 1. Create canvas
        const canvas = document.createElement('canvas')
        const videoWidth = video.videoWidth
        const videoHeight = video.videoHeight

        // Match the "Viewfinder" aspect ratio and size roughly
        // The viewfinder is central. Let's say it covers 80% width and 40% height of the screen?
        // Or better, let's crop the center 70% x 50% to focus on the label text.
        // This acts as a "digital macro".

        const cropWidth = videoWidth * 0.7
        const cropHeight = videoHeight * 0.5

        // Calculations center the crop
        const startX = (videoWidth - cropWidth) / 2
        const startY = (videoHeight - cropHeight) / 2

        canvas.width = cropWidth
        canvas.height = cropHeight

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Draw cropped region
        ctx.drawImage(video, startX, startY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight)

        // Get High Quality JPEG
        const croppedImage = canvas.toDataURL('image/jpeg', 0.9)

        setImageSrc(croppedImage)
        setError(null)
        setScannedData(null)
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
                category: result.category || undefined,
                color: result.color || undefined
            })

            // Haptic feedback if available (mobile)
            if (navigator.vibrate) navigator.vibrate(50)

        } catch (err: unknown) {
            console.error("OCR Error:", err)
            const message = err instanceof Error ? err.message : "Failed to scan image."
            setError(message)
        } finally {
            setIsScanning(false)
        }
    }

    // Auto-scan on capture? 
    // Providing a preview first is better UX to confirm sharpness.

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
        if (scannedData?.color) query.set("color", scannedData.color)
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

    const toggleCamera = () => {
        setFacingMode(prev => prev === "user" ? "environment" : "user")
        setMirrored(prev => !prev)
    }

    return (
        <div className="max-w-md mx-auto h-[100dvh] flex flex-col bg-background">
            {/* Header */}
            <div className="p-4 flex items-center justify-between shrink-0">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={`/dog/${dogId}/medicines/new`}>
                        <ArrowLeft className="h-6 w-6" />
                    </Link>
                </Button>
                <div className="flex gap-2 bg-muted rounded-full p-1">
                    <button
                        onClick={() => { setMode('camera'); clearImage() }}
                        className={cn(
                            "px-4 py-1.5 text-xs font-semibold rounded-full transition-all",
                            mode === 'camera' ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Kamera
                    </button>
                    <button
                        onClick={() => { setMode('upload'); clearImage() }}
                        className={cn(
                            "px-4 py-1.5 text-xs font-semibold rounded-full transition-all",
                            mode === 'upload' ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        Fil
                    </button>
                </div>
                <div className="w-6" /> {/* Spacer */}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 relative overflow-hidden flex flex-col">
                {error && (
                    <div className="absolute top-4 left-4 right-4 z-50 p-3 rounded-md bg-destructive text-destructive-foreground text-sm font-medium shadow-lg animate-in slide-in-from-top-2">
                        {error}
                        <Button variant="ghost" size="sm" className="absolute top-0 right-0 h-full px-2 hover:bg-white/20" onClick={() => setError(null)}>✕</Button>
                    </div>
                )}

                {imageSrc ? (
                    // --- PREVIEW / RESULT STATE ---
                    <div className="flex-1 flex flex-col bg-black/5 relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageSrc} alt="Preview" className="w-full h-full object-contain" />

                        {/* Overlay Controls */}
                        <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent pt-20 flex flex-col gap-4">
                            {!scannedData && (
                                <div className="flex gap-4">
                                    <Button
                                        variant="outline"
                                        className="flex-1 bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-md"
                                        onClick={clearImage}
                                        disabled={isScanning}
                                    >
                                        <RefreshCw className="mr-2 h-4 w-4" /> Ta nytt
                                    </Button>
                                    <Button
                                        className="flex-1 bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20"
                                        onClick={processImage}
                                        disabled={isScanning}
                                    >
                                        {isScanning ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyserer...
                                            </>
                                        ) : (
                                            <>
                                                <Zap className="mr-2 h-4 w-4" /> Start Analyse
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}

                            {scannedData && (
                                <Card className="animate-in slide-in-from-bottom-10 duration-500 bg-background/95 backdrop-blur shadow-2xl border-0">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-lg flex items-center text-green-600 gap-2">
                                            <CheckCircle2 className="h-5 w-5" />
                                            Fant data!
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                            <div>
                                                <span className="text-muted-foreground text-xs uppercase tracking-wider">Navn</span>
                                                <p className="font-semibold truncate">{scannedData.name || "-"}</p>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground text-xs uppercase tracking-wider">Styrke</span>
                                                <p className="font-medium truncate">{scannedData.strength || "-"}</p>
                                            </div>
                                            <div className="col-span-2">
                                                <span className="text-muted-foreground text-xs uppercase tracking-wider">Dosering</span>
                                                <p className="font-medium">{scannedData.dose || "-"}</p>
                                            </div>
                                            {scannedData.color && (
                                                <div className="col-span-2 flex items-center gap-2 mt-1">
                                                    <span className="text-muted-foreground text-xs uppercase tracking-wider">Pakningsfarge</span>
                                                    <div className={cn("h-4 w-4 rounded-full border shadow-sm",
                                                        // Map English color to rough Tailwind bg for preview
                                                        {
                                                            "bg-red-500": scannedData.color === "red",
                                                            "bg-orange-500": scannedData.color === "orange",
                                                            "bg-yellow-500": scannedData.color === "yellow",
                                                            "bg-green-500": scannedData.color === "green",
                                                            "bg-blue-500": scannedData.color === "blue",
                                                            "bg-purple-500": scannedData.color === "purple",
                                                            "bg-pink-500": scannedData.color === "pink"
                                                        }
                                                    )} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <Button variant="outline" className="flex-1" onClick={clearImage}>Prøv igjen</Button>
                                            <Button className="flex-1" onClick={confirmAndRedirect}>Bruk info</Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Scanning Beam Animation */}
                        {isScanning && (
                            <div className="absolute inset-0 bg-black/30 z-10">
                                <div className="w-full h-1 bg-blue-500/80 shadow-[0_0_15px_rgba(59,130,246,0.8)] animate-[scan_2s_ease-in-out_infinite]" />
                            </div>
                        )}
                    </div>
                ) : (
                    // --- CAPTURE STATE ---
                    mode === 'camera' ? (
                        <div className="relative flex-1 bg-black flex flex-col justify-center overflow-hidden">
                            <Webcam
                                audio={false}
                                ref={webcamRef}
                                mirrored={mirrored}
                                screenshotFormat="image/jpeg"
                                className="absolute inset-0 w-full h-full object-cover"
                                videoConstraints={videoConstraints}
                                onUserMediaError={(err) => {
                                    console.error("Webcam Error:", err)
                                    setError("Kamerafeil. Sjekk tillatelser eller bruk opplasting.")
                                    setMode('upload')
                                }}
                            />

                            {/* Viewfinder Overlay */}
                            <div className="absolute inset-0 z-10 pointer-events-none">
                                {/* Semi-transparent borders around the 'cutout' */}
                                <div className="absolute top-0 left-0 right-0 h-[25%] bg-black/60 backdrop-blur-[1px]" />
                                <div className="absolute bottom-0 left-0 right-0 h-[25%] bg-black/60 backdrop-blur-[1px]" />
                                <div className="absolute top-[25%] bottom-[25%] left-0 w-[15%] bg-black/60 backdrop-blur-[1px]" />
                                <div className="absolute top-[25%] bottom-[25%] right-0 w-[15%] bg-black/60 backdrop-blur-[1px]" />

                                {/* The Cutout Border */}
                                <div className="absolute top-[25%] left-[15%] right-[15%] bottom-[25%] border-2 border-white/50 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-blue-500 rounded-tl-sm" />
                                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-blue-500 rounded-tr-sm" />
                                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-blue-500 rounded-bl-sm" />
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-blue-500 rounded-br-sm" />
                                </div>

                                <p className="absolute top-[20%] w-full text-center text-white/90 text-sm font-medium drop-shadow-md">
                                    Plasser etiketten i ruten
                                </p>
                            </div>

                            {/* Camera Controls */}
                            <div className="absolute bottom-0 left-0 right-0 p-8 pb-12 flex items-center justify-around z-50 bg-gradient-to-t from-black/80 to-transparent">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-white/80 hover:text-white hover:bg-white/10 rounded-full h-12 w-12"
                                    onClick={toggleCamera}
                                >
                                    <RefreshCw className="h-6 w-6" />
                                </Button>

                                <button
                                    onClick={capture}
                                    className="h-20 w-20 rounded-full border-4 border-white/30 bg-white/20 hover:bg-white/30 transition-all flex items-center justify-center backdrop-blur-sm group active:scale-95"
                                >
                                    <div className="h-16 w-16 rounded-full bg-white group-active:scale-90 transition-transform shadow-lg" />
                                </button>

                                <div className="w-12" /> {/* Spacer for symmetry */}
                            </div>
                        </div>
                    ) : (
                        // --- UPLOAD STATE ---
                        <div className="flex flex-col items-center justify-center p-8 space-y-6 flex-1 bg-muted/20">
                            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center shadow-inner">
                                <Upload className="h-10 w-10 text-primary" />
                            </div>
                            <div className="text-center space-y-2 max-w-[240px]">
                                <h3 className="font-semibold text-lg">Last opp bilde</h3>
                                <p className="text-sm text-muted-foreground">Velg et bilde fra galleriet ditt hvis kamera ikke passer.</p>
                            </div>
                            <Button
                                size="lg"
                                className="w-full max-w-xs rounded-full"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                Velg fra galleri
                            </Button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageUpload}
                            />
                        </div>
                    )
                )}
            </div>

            <style jsx global>{`
                @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
            `}</style>
        </div>
    )
}
