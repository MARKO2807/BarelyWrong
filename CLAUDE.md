# Barely Wrong

Kviz za društvene večeri: 2–4 tima igraju na jednom ekranu, najčešće na TV-u. Nitko ništa ne upisuje; voditelj otkriva odgovor i klikne Točno ili Netočno. Aplikacija je samo na hrvatskom.

## Dokumentacija

- `docs/SPEC.md` — **što** aplikacija radi: pravila igre, ekrani, dizajn, baza, pravila za pitanja. Pročitaj je prije svake veće izmjene i drži se je; ako nešto u njoj nije jasno ili se čini pogrešnim, pitaj umjesto da pretpostaviš.
- `docs/ARCHITECTURE.md` — **kako** je kod složen: engine i koraci partije, tok podataka, baza i pristup, local storage, urednik, uvoz, slike, build i deploy. Pročitaj odgovarajući dio prije izmjene u tom području.
- `docs/ROADMAP.md` — dogovoreni smjer (server bira pitanja, engleski, dotok pitanja) i trenutno stanje.
- Kad izmjena promijeni ponašanje ili strukturu, u istom commitu ažuriraj SPEC, ARCHITECTURE ili ovaj file.

## Stanje

- Objavljeno na https://barelywrong.com (Netlify, auto deploy na push na `main`, repo `MARKO2807/BarelyWrong`). Produkcija čita pitanja iz Supabasea (`VITE_QUESTIONS_SOURCE=supabase`); lokalno je zadano `local` (`content/batches`).
- Oko 3.500 odobrenih pitanja na hrvatskom. Nova pitanja ne dodajemo dok korisnik ne kaže drukčije.

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
- `npm run db:push` (migracije na Supabase), `npm run db:check` (provjera pravila pristupa)
- `npm run import -- <datoteka> [--dry-run] [--allow-similar]` (uvoz serije; dodijeljene id-jeve upisuje natrag u datoteku)
- `npm run export` (sigurnosna kopija baze u `backups/`)
- `npm run embed` (embeddingi za pitanja koja ih nemaju; model se prvi put preuzme u `.cache/`)
- `npm run brand` (favikone i slika za pregled linka u `public/`, iz `assets/logo.png`)
- Skripte za bazu čitaju `.env.local`; `import`, `export` i `embed` prijavljuju se uredničkim računom (`BW_EDITOR_EMAIL`, `BW_EDITOR_PASSWORD`).

## Pravila rada

- Na početku svake faze iz `docs/SPEC.md` predloži plan i pričekaj potvrdu.
- Logika igre samo u `src/engine`, pokrivena testovima. Komponente samo prikazuju stanje i šalju akcije.
- Local storage samo kroz `src/storage`; ključevi imaju prefiks `bw:` i verziju sheme.
- Tekstovi sučelja samo u `src/i18n/hr.ts`.
- Boje, fontovi i razmaci samo kroz CSS varijable (tokene); nikad hardkodirane hex vrijednosti u komponentama.
- Dizajn kreće od velikog TV ekrana (16:9) i mora raditi na svim veličinama, do mobitela.
- Kod i nazivi u kodu na engleskom; tekstovi za korisnika i komunikacija sa mnom na hrvatskom.
- Prije commita: `npx tsc -b`, `npm run lint`, `npm run test`, `npx prettier --write` na izmijenjenim datotekama. Vizualne izmjene provjeri u pregledniku (dev server na portu 5173, `.claude/launch.json`) na TV/laptop veličini (1366×768), uspravnom mobitelu (375×812) i položenom mobitelu (812×375).
- Commit i push smiješ raditi kad korisnik traži izmjenu za objavu; push na `main` odmah objavljuje stranicu.

## Sigurnost i baza

- Nikad ne upisuj lozinke ni ključeve i ne ispisuj vrijednosti iz `.env.local`. Ne koristi `service_role` ključ.
- Migracije (`npm run db:push`) i brisanje podataka u bazi radi korisnik; ti pripremiš SQL i objasniš što radi.
- Igrači su anonimni (anon ključ smije samo čitati `game_questions` i dodavati statistiku i prijave). Urednik je račun s `app_metadata.role = 'editor'`.

## Zamke

- Engine ne smije zvati `Date.now()` ni `Math.random()`: vrijeme (`now`) i `rng` dolaze kroz akcije i parametre.
- Promjena oblika spremljenih podataka traži novu verziju ključa i migraciju (`src/storage/keys.ts`, `versioned.ts`).
- Hex boje u komponentama ili CSS-u izvan `tokens.css` ruše `src/conventions.test.ts`; za prozirnost koristi `color-mix` s tokenom.
- Tailwind varijanta `short:` (položeni mobitel) definirana je s `@custom-variant` u `src/styles/components.css`.
- Likovi na početnoj i prijavi postavljeni su u postocima pozadine 1672×941; uspravni ekrani dobivaju zasebne `*-mobile.webp` pozadine bez likova.
- Igra danas učitava sva odobrena pitanja na startu partije; ne povećavaj tu količinu bez koraka 1 iz `docs/ROADMAP.md`.
- Na Windowsu: Node skripte koje trebaju `sharp` pokreći iz mape projekta.

## Pitanja

- Točnost je najvažnija. Nikad ne izmišljaj činjenice; svaku provjeri u izvoru i zapiši izvor.
- Pitanja Hrvatskog kviz saveza nikad ne kopiraj doslovno: uzmi činjenicu i napiši novo pitanje prema pravilniku u `docs/SPEC.md` (8.4).
- Svako pitanje ima zanimljivost (`note`).
- `id` pitanja se nikad ne mijenja; pitanja se ne brišu nego dobivaju status.
- Prije uvoza uvijek pokreni provjeru duplikata.
