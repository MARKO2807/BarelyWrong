# Barely Wrong

Kviz za društvene večeri: 2–4 tima igraju na jednom ekranu, najčešće na TV-u. Nitko ništa ne upisuje; voditelj otkriva odgovor i klikne Točno ili Netočno. Aplikacija je zasad samo na hrvatskom. Objavljena je na https://barelywrong.com (Netlify; push na `main` u `MARKO2807/BarelyWrong` odmah objavljuje).

Stack: React, Vite, TypeScript, React Router, Tailwind 4, Supabase (Postgres, Auth, pgvector), Zod, Vitest. Nije PWA.

## Dokumentacija

Plan razvoja i tehnička dokumentacija učitavaju se automatski (dolje). Ostalo se čita po potrebi:

- `docs/SPEC.md` — **što** aplikacija radi: pravila igre, ekrani, dizajn, baza, pravila za pitanja. Pročitaj odgovarajuće poglavlje prije svake izmjene ponašanja i drži ga se. Ako je nešto nejasno ili se čini pogrešnim, pitaj umjesto da pretpostaviš.
- `docs/DECISIONS.md` — važne odluke i razlozi. Pogledaj prije nego predložiš da se nešto već odlučeno promijeni.
- Svaka činjenica ima jedno mjesto (tablica u skillu `dokumentacija`). Izmjena ponašanja ili strukture ažurira odgovarajući dokument u istom commitu.

@docs/ROADMAP.md

@docs/ARCHITECTURE.md

## Postupci (skillovi u `.claude/skills/`)

- `sljedeci-korak` — „nastavi”, „sljedeći korak”: plan iz ROADMAP-a, potvrda, izvedba, označavanje gotovog.
- `provjera` — `npm run check` i pregled u pregledniku na TV/laptopu, uspravnom i položenom mobitelu.
- `objava` — provjera, usklađena dokumentacija, commit, push i provjera objavljene stranice.
- `serija-pitanja` — pisanje, provjera činjenica i uvoz pitanja.
- `dokumentacija` — usklađivanje dokumenata s kodom.

Hook `.claude/hooks/format.mjs` nakon svake izmjene datoteke pokrene Prettier.

## Naredbe

Ažuriraj ovaj popis kad se naredbe promijene.

- `npm run dev` (port 5173), `npm run build`, `npm run preview` (port 4173)
- `npm run check` (tsc + eslint + vitest; prije svakog commita), `npm run test`, `npm run test:watch`, `npm run lint`, `npm run format`
- `npm run db:push` (migracije na Supabase, pokreće korisnik), `npm run db:check` (provjera pravila pristupa)
- `npm run import -- <datoteka> [--dry-run] [--allow-similar]` (uvoz serije; dodijeljene id-jeve upisuje natrag u datoteku)
- `npm run export` (sigurnosna kopija baze u `backups/`), `npm run embed` (embeddingi; model se prvi put preuzme u `.cache/`)
- `npm run brand` (favikone i slika za pregled linka u `public/`, iz `assets/logo.png`)
- Skripte za bazu čitaju `.env.local`; `import`, `export` i `embed` prijavljuju se uredničkim računom (`BW_EDITOR_EMAIL`, `BW_EDITOR_PASSWORD`).

## Pravila rada

- Na početku svakog većeg koraka predloži plan i pričekaj potvrdu.
- Logika igre samo u `src/engine`, pokrivena testovima. Komponente samo prikazuju stanje i šalju akcije.
- Local storage samo kroz `src/storage`; ključevi imaju prefiks `bw:` i verziju sheme.
- Tekstovi sučelja samo u `src/i18n/hr.ts`.
- Boje, fontovi i razmaci samo kroz CSS varijable (tokene); nikad hardkodirane hex vrijednosti u komponentama.
- Dizajn kreće od velikog TV ekrana (16:9) i mora raditi na svim veličinama, do mobitela.
- Kod, nazivi i commit poruke na engleskom; tekstovi za korisnika i komunikacija s korisnikom na hrvatskom.
- Commit i push radi kad korisnik traži izmjenu za objavu (skill `objava`).

## Sigurnost i baza

- Nikad ne upisuj lozinke ni ključeve i ne ispisuj vrijednosti iz `.env.local`. Ne koristi `service_role` ključ.
- Migracije (`npm run db:push`) i brisanje podataka u bazi radi korisnik; ti pripremiš SQL i objasniš što radi.
- Uvoz pitanja u produkcijsku bazu samo uz izričito odobrenje korisnika.

## Zamke

- Engine ne smije zvati `Date.now()` ni `Math.random()`: vrijeme (`now`) i `rng` dolaze kroz akcije i parametre.
- Promjena oblika spremljenih podataka traži novu verziju ključa i migraciju (`src/storage/keys.ts`, `versioned.ts`).
- Hex boje izvan `tokens.css` ruše `src/conventions.test.ts`; za prozirnost koristi `color-mix` s tokenom.
- Tailwind varijanta `short:` (položeni mobitel) definirana je s `@custom-variant` u `src/styles/components.css`.
- Likovi na početnoj i prijavi postavljeni su u postocima pozadine 1672×941; uspravni ekrani dobivaju zasebne `*-mobile.webp` pozadine bez likova.
- Igra učitava sva odobrena pitanja na startu partije; ne povećavaj bitno njihov broj prije koraka 1 iz ROADMAP-a.
- Novi vanjski servis (API, font, slika s CDN-a) blokira CSP iz `vite.config.ts` dok ga ondje ne dodaš.
- Na Windowsu: Node skripte koje trebaju `sharp` ili `prettier` pokreći iz mape projekta.
- Probna partija u pregledniku ostaje u local storageu (`bw:game:v3`); obriši je nakon provjere.

## Pitanja

- Točnost je najvažnija. Nikad ne izmišljaj činjenice; svaku provjeri u izvoru i zapiši izvor.
- Pitanja Hrvatskog kviz saveza nikad ne kopiraj doslovno: uzmi činjenicu i napiši novo pitanje prema pravilniku u `docs/SPEC.md` (8.4).
- Svako pitanje ima zanimljivost (`note`).
- `id` pitanja se nikad ne mijenja; pitanja se ne brišu nego dobivaju status.
- Prije uvoza uvijek pokreni provjeru duplikata.
