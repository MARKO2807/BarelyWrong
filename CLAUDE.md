# Barely Wrong

Kviz za društvene večeri: 2–4 tima igraju na jednom ekranu, najčešće na TV-u. Nitko ništa ne upisuje; voditelj otkriva odgovor i klikne Točno ili Netočno. Aplikacija je samo na hrvatskom.

Puna specifikacija je u `docs/SPEC.md`. Pročitaj je prije svake veće izmjene i drži se je; ako nešto u njoj nije jasno ili se čini pogrešnim, pitaj umjesto da pretpostaviš.

## Stack

React, Vite, TypeScript, React Router, Tailwind, Supabase (Postgres, Auth, pgvector), Zod, Vitest. Hosting na Netlifyju, domena barelywrong.com. Nije PWA.

## Struktura

- `src/engine/` — pravila igre, čisti TypeScript bez Reacta, s testovima
- `src/storage/` — jedino mjesto koje dira local storage
- `src/data/` — Supabase: pitanja, statistika, prijave
- `src/i18n/hr.ts` — svi tekstovi sučelja
- `src/styles/tokens.css` — jedino mjesto s bojama (tokeni za obje teme i Tailwind `@theme`)
- `src/app/` — router, rute i postavke (tema, zvuk)
- `src/screens/`, `src/ui/` — ekrani i komponente, bez logike igre
- `supabase/migrations/` — shema, pogledi, RLS
- `scripts/` — uvoz, izvoz, embeddingi, duplikati
- `content/batches/` — serije pitanja za uvoz
- `assets/` — logo i hero slike

## Naredbe

Ažuriraj ovaj popis kad se naredbe promijene.

- `npm run dev`, `npm run build`, `npm run preview`
- `npm run test` (jednom), `npm run test:watch`
- `npm run lint`, `npm run format`
- `npm run import -- <datoteka> [--dry-run]`
- `npm run export`
- `npm run embed`

## Pravila rada

- Na početku svake faze iz `docs/SPEC.md` predloži plan i pričekaj potvrdu.
- Logika igre samo u `src/engine`, pokrivena testovima. Komponente samo prikazuju stanje i šalju akcije.
- Local storage samo kroz `src/storage`; ključevi imaju prefiks `bw:` i verziju sheme.
- Tekstovi sučelja samo u `src/i18n/hr.ts`.
- Boje, fontovi i razmaci samo kroz CSS varijable (tokene); nikad hardkodirane hex vrijednosti u komponentama.
- Dizajn kreće od velikog TV ekrana (16:9) i mora raditi na svim veličinama, do mobitela.
- Kod i nazivi u kodu na engleskom; tekstovi za korisnika i komunikacija sa mnom na hrvatskom.

## Pitanja

- Točnost je najvažnija. Nikad ne izmišljaj činjenice; svaku provjeri u izvoru i zapiši izvor.
- Pitanja Hrvatskog kviz saveza nikad ne kopiraj doslovno: uzmi činjenicu i napiši novo pitanje prema pravilniku u `docs/SPEC.md` (8.4).
- Svako pitanje ima zanimljivost (`note`).
- `id` pitanja se nikad ne mijenja; pitanja se ne brišu nego dobivaju status.
- Prije uvoza uvijek pokreni provjeru duplikata.
