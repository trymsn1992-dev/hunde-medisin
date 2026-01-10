# Slik kobler du på hundemedisin.no 🌐

For å få nettsiden din live på `hundemedisin.no`, må vi flytte den fra din datamaskin og ut på nettet ("hosting"). Det enkleste og beste for denne teknologien (Next.js) er å bruke **Vercel**.

## Steg 1: Legg koden ut på nettet (Vercel)

1.  **Lag en GitHub-konto** (hvis du ikke har) på [github.com](https://github.com).
2.  Last opp koden din dit (eller bruk Vercel CLI direkte fra terminalen din).
    *   *Enklest:* Last ned [Vercel CLI](https://vercel.com/docs/cli) og kjør kommandoen `vercel` inne i prosjektmappen din.
3.  Gå til [vercel.com](https://vercel.com) og logg inn.
4.  Importer prosjektet ditt.
5.  **VIKTIG:** Under "Environment Variables" i Vercel, må du legge inn de samme nøklene som du har i `.env.local`-filen din:
    *   `NEXT_PUBLIC_SUPABASE_URL`
    *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    *   `OPENAI_API_KEY` (hvis du bruker det for scanning)

## Steg 2: Koble til domenet ditt

Når siden din er "live" på en vercel-adresse (f.eks. `bjeffer.vercel.app`), gjør du følgende for å bruke ditt eget domene:

1.  Gå til **Settings** -> **Domains** inne på prosjektet ditt i Vercel.
2.  Skriv inn `hundemedisin.no` og trykk **Add**.
3.  Vercel vil nå gi deg noen tall/koder (DNS records) som ser ca. slik ut:
    *   **Type:** A Record
    *   **Value:** `76.76.21.21` (eksempel)
    
## Steg 3: Oppdater domeneregisteret (der du kjøpte domenet)

1.  Logg inn der du kjøpte domenet (f.eks. Domeneshop, GoDaddy, Namecheap).
2.  Finn "DNS innstillinger" eller "Name Servers".
3.  Legg inn **A-record** (eller "Nameservers") som Vercel ba deg om.
4.  Vent litt (kan ta opptil 24 timer, men ofte bare minutter).

**Ferdig!** 🎉
Når du nå skriver `hundemedisin.no` i nettleseren, vil den nye appen din dukke opp.
