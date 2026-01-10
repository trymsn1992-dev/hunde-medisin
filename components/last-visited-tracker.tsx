"use client"

import { useEffect } from "react"
import { updateLastVisitedDog } from "@/app/actions/dogs"

export function LastVisitedTracker({ dogId }: { dogId: string }) {
    useEffect(() => {
        // Optimistically update, no need to wait or handle error visibly
        updateLastVisitedDog(dogId)
    }, [dogId])

    return null
}
