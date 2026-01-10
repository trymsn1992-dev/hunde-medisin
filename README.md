# Bjeffer - Dog Medication Tracker

## Project Location
This project is located at:
`./` (Relative to where you open your terminal)

## How to Run Locally

### 1. Prerequisites
- Node.js installed (v18+)
- `npm` or `pnpm`

### 2. Install Dependencies
If this is your first time running the project:
```bash
npm install
```

### 3. Start Development Server
To start the app in development mode:
```bash
npm run dev
```
The app will be available at [http://localhost:3000](http://localhost:3000).

### 4. Database (Supabase)
This project connects to a remote Supabase instance.
Ensure you have your `.env.local` file configured with:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Features
- **Dashboard**: Track doses for multiple dogs.
- **Medicine Lookup**: Search Felleskatalogen directly.
- **Auto-Login**: Remembers your last visited dog profile.
- **Mobile Optimized**: Works great on phones.
