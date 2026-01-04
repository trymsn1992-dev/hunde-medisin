# Hvordan teste Bjeffer (Dog Medication App)

Siden appen bruker en ekte database (Supabase), må du sette opp dette før du kan logge inn og lagre data.

## Steg 1: Sett opp Supabase (Backend)

1.  Gå til [database.new](https://database.new) og opprett et nytt prosjekt (Free plan er ok).
2.  Når prosjektet er klart, gå til **SQL Editor** i menyen til venstre.
3.  Klikk **"New Query"**.
4.  Åpne filen `schema.sql` som ligger i prosjektmappen din, kopier alt innholdet, og lim det inn i SQL Editoren.
5.  Klikk **Run**. Dette oppretter databasen.

## Steg 2: Koble appen til Supabase

1.  I Supabase, gå til **Project Settings** -> **API**.
2.  Finn **Project URL** og **anon public key**.
3.  I din lokale prosjektmappe (`chrono-ring`), opprett en ny fil som heter `.env.local`.
4.  Lim inn følgende (bytt ut med dine verdier):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ditt-prosjekt-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=din-lange-anon-key
```

## Steg 3: Start appen

1.  Åpne terminalen i `chrono-ring` mappen.
2.  Kjør:
    ```bash
    npm run dev
    ```
3.  Åpne nettleseren på [http://localhost:3000](http://localhost:3000).

## Steg 4: Test-Scenario

Følg denne ruten for å teste funksjonaliteten:

1.  **Registrering**:
    *   Klikk "Get Started" eller "Sign Up".
    *   Lag en bruker (f.eks. `test@test.no` / `passord123`).
    *   *Merk: Hvis du ikke har slått av "Confirm Email" i Supabase Auth settings, må du bekrefte e-posten din før du får logget inn.*

2.  **Opprett Hund**:
    *   Du blir spurt om å lage en hund. Skriv inn "Fido".
    *   Du bør bli sendt til Fido sitt Dashboard.

3.  **Legg til Medisin**:
    *   Klikk "Medicines" -> "Add Medicine" -> "Enter Manually".
    *   Navn: "Rimadyl".
    *   Dose: "1 tablett".
    *   Timeplan: Velg "08:00" og "20:00" (eller tidspunkter som er nær NÅ for å teste).
    *   Lagre.

4.  **Test "Due Now"**:
    *   Gå tilbake til Dashboard (`/dog/[id]`).
    *   Hvis du valgte et tidspunkt innenfor +/- 1 time fra nå, skal dosen vises som "Due" eller "Overdue".
    *   Klikk **"Mark as Given"**.
    *   Sjekk at statusen endres til "Given" (grønn).

5.  **Test Historikk**:
    *   Klikk på "History".
    *   Du skal se at du nettopp ga Rimadyl.
