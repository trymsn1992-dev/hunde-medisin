import { LastVisitedTracker } from "@/components/last-visited-tracker"

export default async function DogLayout({
    children,
    params
}: {
    children: React.ReactNode
    params: Promise<{ id: string }>
}) {
    const { id } = await params // Await params in newer Next.js versions
    return (
        <>
            <LastVisitedTracker dogId={id} />
            {children}
        </>
    )
}
