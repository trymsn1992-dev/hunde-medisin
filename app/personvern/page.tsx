import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function PrivacyPage() {
    return (
        <div className="container max-w-3xl mx-auto py-12 px-4 space-y-8">
            <Button variant="ghost" asChild className="mb-8">
                <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Tilbake til forsiden
                </Link>
            </Button>

            <div className="space-y-4">
                <h1 className="text-3xl font-bold">Personvernerklæring for hundemedisin</h1>
                <p className="text-muted-foreground">Sist oppdatert: {new Date().toLocaleDateString('no-NO')}</p>
            </div>

            <section className="space-y-3">
                <h2 className="text-xl font-semibold">1. Innledning</h2>
                <p>
                    Denne personvernerklæringen forklarer hvordan hundemedisin ("tjenesten", "vi") samler inn og bruker personopplysninger når du bruker vår applikasjon for oppfølging av hundens helse.
                    Vi tar ditt personvern på alvor og følger gjeldende personvernlovgivning (GDPR).
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-semibold">2. Hvilke opplysninger samler vi inn?</h2>
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Kontoinformasjon:</strong> Din e-postadresse (brukes for innlogging/identifikasjon).</li>
                    <li><strong>Hundeinformasjon:</strong> Navn, rase, vekt, bilder og fødselsdato på hunder du legger til.</li>
                    <li><strong>Helseopplysninger:</strong> Informasjon om medisiner, doseringer, og helselogger du registrerer for hundene.</li>
                    <li><strong>Tekniske data:</strong> IP-adresse og nettlesertype (via våre loggføringssystemer for sikkerhet).</li>
                </ul>
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-semibold">3. Formålet med behandlingen</h2>
                <p>Vi bruker opplysningene til å:</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Levere tjenesten (hjelpe deg å huske medisiner).</li>
                    <li>Sikre at kun du (og de du inviterer) har tilgang til dine hunders data.</li>
                    <li>Forbedre brukeropplevelsen og feilsøke tekniske problemer.</li>
                </ul>
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-semibold">4. Informasjonskapsler (Cookies)</h2>
                <p>
                    Vi bruker informasjonskapsler for å holde deg innlogget og sikre at nettsiden fungerer ("Nødvendige cookies").
                    Vi bruker ingen tredjeparts sporingscookies til markedsføring uten ditt samtykke.
                </p>
                <p>
                    <strong>Nødvendige:</strong> Supabase Auth (håndterer innlogging).
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-semibold">5. Deling av data</h2>
                <p>
                    Vi selger aldri dine data til tredjeparter. Dine data lagres trygt hos våre dataleverandører:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Supabase:</strong> Database og autentisering (Servere i EU/US, underlagt GDPR-krav).</li>
                    <li><strong>OpenAI:</strong> Brukes kun hvis du benytter bilde-skanningfunksjonen. Bildet sendes for analyse og slettes/anonymiseres iht. OpenAIs retningslinjer for API-bruk (Ingen trening på dine data).</li>
                </ul>
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-semibold">6. Dine rettigheter</h2>
                <p>Du har rett til å:</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Se hvilke opplysninger vi har lagret om deg.</li>
                    <li>Korrigere feilaktige opplysninger.</li>
                    <li>Slette din konto og alle data permanent. Dette gjør du inne i appen under "Min Profil" eller ved å kontakte oss.</li>
                </ul>
            </section>

            <section className="space-y-3">
                <h2 className="text-xl font-semibold">7. Kontakt</h2>
                <p>
                    Har du spørsmål om personvern? Ta gjerne kontakt med utvikler på [Din E-post] eller via GitHub.
                </p>
            </section>
        </div>
    )
}
