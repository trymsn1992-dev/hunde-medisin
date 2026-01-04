import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
      <div className="max-w-3xl space-y-8">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl text-primary">
          Bjeffer
        </h1>
        <p className="text-xl text-muted-foreground">
          The smart assistant for your dog&apos;s medication. <br />
          Coordinate with your family, never miss a dose.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="rounded-full text-lg h-12 px-8">
            <Link href="/login">
              Get Started <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full text-lg h-12 px-8">
            <Link href="/login">
              Log In
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
