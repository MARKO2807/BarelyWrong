# Barely Wrong — tehnička dokumentacija

Kako je aplikacija složena i kako radi. **Što** aplikacija radi (pravila igre, ekrani, dizajn, pravila za pitanja) piše u `docs/SPEC.md`; ovdje je **kako**. Kad se kod promijeni tako da ovo više ne vrijedi, ažuriraj ovu datoteku u istom commitu.

## 1. Pregled

- Jednostranična aplikacija (React 19, Vite, TypeScript, React Router 7, Tailwind 4) bez vlastitog servera.
- Supabase (Postgres, Auth, pgvector) drži pitanja, statistiku i prijave. Igrači su anonimni (anon ključ), a urednik je jedan račun.
- Hosting: Netlify, automatski deploy na svaki push na `main` (GitHub `MARKO2807/BarelyWrong`). Domena barelywrong.com kupljena je preko Netlifyja.
- Partija se vodi i sprema lokalno u pregledniku. Mreža treba samo za dohvat pitanja na početku i za slanje statistike, koja čeka u redu ako mreže nema.

```
main.tsx ──► boot.tsx ──► App (SettingsProvider, GameSessionProvider, router)
                              │
          ┌───────────────────┼─────────────────────────┐
     HomeScreen         SetupScreen / GameScreen    EditorApp (/admin)
          │                   │                          │
       src/ui ◄──── stanje ── src/app/GameSession ── src/data/editorApi
                              │        │                  │
                       src/engine   src/storage       Supabase
                       (pravila)    (local storage)   (urednik)
                              │
                         src/data/questions, sync ──► Supabase (anon)
```

## 2. Mape i odgovornosti

| Mapa | Što radi | Pravilo |
|---|---|---|
| `src/engine/` | Pravila igre: stanje (`GameState`), akcije (`GameAction`), `gameReducer`, selektori, odabir pitanja, timer, postavke partije. | Čisti TypeScript, bez Reacta i preglednika. Sve je pokriveno testovima. Vrijeme (`now`) i slučajnost (`rng`) dolaze izvana. |
| `src/storage/` | Sve što ide u local storage: partija, odigrana pitanja, postavke, zadnje postavke partije, red za slanje, sesija urednika. | Jedino mjesto koje dira `localStorage` (provjerava `src/conventions.test.ts`). |
| `src/data/` | Supabase: dohvat pitanja, slanje statistike i prijava, urednički API, uvoz. | Nema logike igre. |
| `src/app/` | Router, rute, `GameSession` (veza enginea i preglednika), `useStartGame`, postavke (tema, zvuk). | |
| `src/screens/` | Ekrani: početna, nova partija, partija, 404 i urednik (`editor/`). | Samo prikaz i slanje akcija. |
| `src/ui/` | Komponente: gumbi, modal, hero, igra (`game/`), dijalozi, zvuk, ikone. | Bez logike igre. |
| `src/i18n/` | `hr.ts` sa svim tekstovima i helperi `t()` i `tList()`. | Tekst za korisnika nikad izravno u komponenti. |
| `src/styles/` | `tokens.css` (boje, veličine, teme, Tailwind `@theme`), `base.css`, `components.css` (klase komponenti, animacije). | Hex boje samo u `tokens.css` (provjerava test). |
| `supabase/migrations/` | Shema, pogledi, RLS, funkcije za uvoz i duplikate. | Migracije pokreće korisnik (`npm run db:push`). |
| `scripts/` | Uvoz, izvoz, embeddingi, provjera pravila pristupa, alati za pisanje pitanja (`questions.ts`), slike za brand. | Čitaju `.env.local`. |
| `content/drafts/` | Nacrti serija za `npm run q` (nisu u gitu). | |
| `content/checks/` | Igle kojima su pitanja potvrđena, po seriji, za `npm run q -- recheck`. | |
| `content/batches/` | Serije pitanja u JSON formatu (SPEC 9.1). Nakon uvoza nose `id` iz baze. | Lokalni izvor pitanja kad je `VITE_QUESTIONS_SOURCE=local`. |
| `assets/` | Logo, hero pozadine i likovi, slike za prijavu urednika (WebP). | Slike od korisnika; izvornici su u `Desktop/final new/`. |
| `public/` | `robots.txt`, favikone, `og-image.jpg`. | Favikone i OG slika rade se naredbom `npm run brand`. |

## 3. Engine (pravila igre)

**Stanje.** `GameState` (`src/engine/schema.ts`, Zod) sadrži timove, opcije, sva odabrana pitanja, runde, Najbrži prst, rezervno pitanje za neriješeno, rezultate, ispravke bodova i trenutni korak (`step`). Cijela partija je jedan serijalizabilni objekt, pa se sprema i vraća bez gubitaka.

**Koraci** (`step.type`), redom kroz partiju:

```
roundIntro → turnIntro → question → answer → judged → (sljedeći tim: turnIntro) … → leaderboard
   → (Najbrži prst nakon zadane runde) fastestFingerIntro → fastestFingerQuestion
        → [fastestFingerBuzzed] → fastestFingerAnswer → fastestFingerJudged
   → … → (izjednačeno na vrhu) tiebreakIntro → tiebreakQuestion → tiebreakAnswer → finished
```

**Akcije** (`GameAction` u `reducer.ts`): `start`, `pause`, `resume`, `reveal`, `judge`, `award` (procjena i neriješeno), `buzz` (Najbrži prst), `undo`, `next`, `adjust` (ručna ispravka bodova). Akcije koje ovise o vremenu nose `now`.

**Nastanak partije.** `createGame` (`create.ts`) uzme postavke, sva dostupna pitanja i id-jeve već odigranih pitanja. `selectQuestions` (`select.ts`) odmah odabere pitanja za cijelu partiju. Ako za neku vrstu runde nema dovoljno neodigranih pitanja, vraća `shortages`, a korisnik može vratiti odigrana pitanja te vrste (`ShortageDialog`).

**Statistika iz enginea.** `getShownQuestionId` javlja koje se pitanje upravo prikazalo (tada se označi kao odigrano). `getCommittedAnswerEvents` daje odgovore koji su postali konačni, tek kad se partija pomakne dalje, pa „Poništi” nikad ne mora povlačiti već poslane podatke.

**Testovi.** `src/engine/*.test.ts` pokrivaju redoslijed rundi, rotaciju timova, Double trouble, Najbrži prst, procjenu, bodovanje, Poništi, neriješeno i odabir pitanja. Pomoćne funkcije za testove su u `src/engine/testing/fixtures.ts` (`newGame`, `run`, `makePool`).

## 4. Tok partije u aplikaciji

1. **Nova partija** (`SetupScreen`): timovi (2–4, ime, boja), duljina (12 ili 6 rundi), Najbrži prst, vrijeme po pitanju. `validateSetup` je u engineu. Zadnje postavke pamte se lokalno (`lastSetup`).
2. **Start** (`useStartGame`): `fetchCandidates()` → `createGame` → `GameSession.begin` → `/game`.
3. **Igra** (`GameScreen`): `GameSession.dispatch(action)` pokrene `gameReducer`, spremi stanje (`saveGame`), označi prikazano pitanje kao odigrano (`markPlayed`) i preda konačne odgovore redu za slanje (`submit`). Završene runde i kraj partije (`getProgressEvents` u engineu) idu u aktivnost (`src/data/activity.ts`, vidi 7). Prečaci s tipkovnice su u `ui/game/keyboard.ts` (`commandForKey`). Gumbi su u `ui/game/Controls.tsx`, a prikaz po koraku u `ui/game/stages.tsx`.
4. **Prekid i nastavak.** Pri zatvaranju kartice partija se sprema s pauziranim timerom (`pagehide`). Otvaranje `/game` nastavlja spremljenu partiju (`resume`). Izlazak usred partije traži potvrdu (`useBlocker` i `beforeunload`).
5. **Zvuk** (`ui/sound/sfx.ts`): 8-bitni efekti sintetizirani Web Audio API-jem, bez audio datoteka. Isključeni su po zadanom. `useGameSounds` ih pušta prema promjenama koraka; `GameTimer` pušta upozorenje na 10 s i otkucaje u zadnje 3 s.
6. **Ekran** (`useWakeLock`): ekran ostaje upaljen dok partija traje. Cijeli zaslon se pali gumbom ili tipkom F.

## 5. Pitanja: odakle dolaze

`src/data/questions.ts`, prema varijabli `VITE_QUESTIONS_SOURCE`:

`fetchCandidates({ teamCount, playedIds })` vraća samo kandidate za jednu partiju: za svaku vrstu runde (tema otvorenih pitanja, točno/netočno, procjena) i težinu najviše `candidatesPerDifficulty(teamCount)` = 2 × broj timova (najmanje 4) nasumičnih neodigranih pitanja, ukupno najviše oko 290. Engine (`selectQuestions`) iz njih slaže partiju kao prije; test `src/engine/candidates.test.ts` provjerava da kandidati daju partiju (ili iste manjkove) kad god bi je dala sva pitanja.

- `supabase` (produkcija na Netlifyju): poziva funkciju `game_candidates(p_lang, p_per_difficulty, p_exclude)` jednim upitom i šalje joj sve odigrane id-jeve. Kad neke vrste ponestane, `fetchIdsOfKinds` preko funkcije `question_kinds` doznaje koji su odigrani id-jevi te vrste, pa ih `useStartGame` vrati (`unmarkPlayed`).
- `local` (zadano u razvoju): učita sve datoteke iz `content/batches/*.json`, preskoči `rejected` i `archived`, a kandidate bira `pickCandidates` po istom pravilu kao baza. Pitanjima koja još nisu uvezena dodijeli privremeni id (`batchIds.ts`).

Pogled `game_questions` i dalje postoji (provjera pristupa, urednik), ali ga igra više ne čita.

**Id pitanja** je `<tema>-<četiri znamenke>` (npr. `sport-0042`). Dodjeljuje ga baza pri uvozu (`import_questions`), a skripta za uvoz upisuje ga natrag u JSON datoteku. Id se nikad ne mijenja i ne koristi ponovno. Pitanja se ne brišu: dobivaju status `rejected` ili `archived`, a brisanje je u bazi zabranjeno.

## 6. Baza (Supabase)

Tablice (`supabase/migrations/…_schema.sql`, opis u SPEC 7):

- `topics`: deset tema.
- `questions`: tema, format, težina, status, porijeklo, izvor, oznake, `embedding vector(384)`.
- `question_texts`: tekst po jeziku, s ključem `(question_id, lang)`. Danas postoji samo `hr`; engleski dolazi kao novi redak.
- `answer_events`: statistika odgovora.
- `question_reports`: prijave iz igre.
- `visits`, `game_starts`, `game_progress` (`…_activity.sql`, veličina prozora i jezik iz `…_activity_window_language.sql`, napredak po pitanju iz `…_activity_turns.sql`): aktivnost. Pogled `editor_games` daje jedan red po partiji (dosegnuta runda, status, događaji), a funkcija `activity_visits` posjete po danu, ekranu, izvoru i jeziku.

**Pristup** (`…_access.sql`, `…_editor.sql`, `…_editor_grants.sql`):

- **Anon (igrač):** smije samo `select` na `game_questions`, pozvati `game_candidates` i `question_kinds`, `insert` u `answer_events`, `question_reports`, `visits`, `game_starts` i `game_progress` (samo navedeni stupci). Ponovljena runda iste partije se odbija (`unique`).
- **Urednik:** račun s `app_metadata.role = 'editor'` (funkcija `is_editor()`). Smije čitati i uređivati pitanja, pogled `editor_questions` (sa statistikom), funkcije `import_questions`, `match_questions` i `similar_pairs`. Čita aktivnost i smije brisati partije (`game_starts`; napredak se briše s njima), a posjete ne. `delete` na `questions` je oduzet svima.
- `npm run db:check` provjerava ta pravila iz perspektive igrača i urednika.

**Duplikati.** Embedding se računa iz pitanja i odgovora zajedno, lokalnim modelom `Xenova/multilingual-e5-small` (`scripts/lib/embedder.ts`, `npm run embed`). Pragovi su u SPEC 8.5: 0,96 i više blokira uvoz, 0,93–0,96 je upozorenje. Izmjena teksta u bazi briše zastarjeli embedding (okidač), pa ga `npm run embed` računa ponovno.

## 7. Statistika, prijave i aktivnost (red za slanje)

`src/data/sync.ts` i `src/storage/outbox.ts`: `submit()` doda stavke u lokalni red i odmah pokuša poslati. Vrste stavki: odgovor, prijava, posjet, početak partije i napredak partije. Napredak partije čeka dok njezin početak ne stigne u bazu (inače bi ga baza zauvijek odbila). Ako `flushOutbox` već šalje, novi poziv samo traži još jedan krug odmah nakon njega (`again`), pa ništa ne čeka minutu; red se prazni i na `pagehide` i kad kartica ode u pozadinu. Red se prazni pri startu, kad se veza vrati (`online`) i svake minute. Ako server odbije skupinu, stavke se šalju jedna po jedna, pa jedna loša stavka ne blokira ostale. Procjena i Najbrži prst bez javljanja ne bilježe se.

**Aktivnost** (`src/data/activity.ts`, SPEC 9.4): `recordVisit` pri pokretanju (`boot.tsx`), a `GameSession` zove `recordGameStart` (u `begin`, uz oznaku revanša), `recordProgress` (`getProgressEvents`: `turn` nakon svakog pitanja, `round`, `finished`) i `recordAbandon` (`getCompletedRounds`). Urednik iz toga računa „runda · pitanje” (`liveProgress` u `activityStats.ts`). Id partije je `crypto.randomUUID()` i sprema se uz partiju (`bw:game:v4`), pa se nastavljena partija bilježi pod istim id-jem. Posjeti i početci partija ne bilježe se kad je `import.meta.env.DEV` ili kad uređaj ima sesiju urednika (`hasEditorSession`). `recordGameStart` vraća je li partija u dnevniku (`tracked`), a `GameSession` to sprema uz partiju i šalje napredak samo za takve partije, pa kasnija prijava u Urednik ne prekida bilježenje. `recordGameStart` usput pošalje skriveni Netlify obrazac „partija” iz `index.html` (POST na `/`), a Netlify vlasniku pošalje mail.

## 8. Local storage

Ključevi su `bw:<ime>:v<verzija>` (`src/storage/keys.ts`):

| Ime | Verzija | Sadržaj |
|---|---|---|
| `settings` | 1 | tema, zvuk |
| `played` | 2 | id-jevi odigranih pitanja na ovom uređaju |
| `game` | 5 | partija u tijeku, njezin id za aktivnost, bilježi li se (`tracked`) i vrijeme spremanja |
| `lastSetup` | 2 | zadnji timovi i opcije |
| `outbox` | 4 | statistika, prijave i aktivnost (s veličinom prozora, jezikom i napretkom po pitanju) koji čekaju slanje |
| `auth` | 1 | Supabase sesija urednika |

Kad se oblik podataka promijeni, podigni verziju i dodaj migraciju (`versioned.ts`). Stari podaci se ne smiju samo baciti.

## 9. Urednik (`/admin`)

`src/screens/editor/`: prijava (`EditorApp`, `LoginScene`), popis pitanja s filtrima i statistikom (`QuestionsPage`), uređivanje (`QuestionPage`), pregled pitanja sa statusom `review` (`ReviewPage`), prijave (`ReportsPage`), uvoz i izvoz iz preglednika (`ImportExportPage`) te aktivnost (`GamesPage`, `/admin/games`: brojke iz `src/data/activityStats.ts`, brisanje partija). Aktivnost se učitava tek na toj stranici (`fetchGames`, `fetchVisitCounts`), ne pri prijavi. Podaci idu kroz `src/data/editorApi.ts` i `editorSession.ts`. Uvoz iz preglednika koristi istu logiku kao skripta (`src/data/import/`), osim usporedbe po značenju (embeddingi postoje samo u skripti). `/admin` šalje `X-Robots-Tag: noindex`.

## 10. Uvoz pitanja (postupak)

Korak po korak vodi skill `serija-pitanja`; alati su u `scripts/questions.ts` (`npm run q`).

1. Nacrt se piše u `content/drafts/<tema>-NN.json` (nije u gitu): pitanje, odgovor, zanimljivost, izvor i „igle”, izrazi koji se moraju naći u članku. Izvor je članak Wikipedije (`en:Naslov`, `hr:Naslov`) ili Hrvatske enciklopedije (`he:slug`, enciklopedija.hr/clanak/slug; slug nađe `npm run q -- he "pojam"`). Dodatni izvori idu u `extra.also`. `npm run q -- check` dohvati članke (spremaju se u `.cache/wiki/`), provjeri igle i traži drugi neovisni izvor za rizična pitanja (SPEC 8.5; pravilo je `needsSecondSource`).
2. `npm run q -- review` iz nacrta napravi `content/batches/<tema>-NN.json` prema SPEC 9.1 i pokrene `npm run import -- … --dry-run`: Zod provjera, normalizacija, duplikati (tekst, odgovor, značenje) i preklapanja odgovora. Stavke s greškom izbaci iz nacrta, a upozorenja ispiše.
3. `npm run q -- import … --force` (ili `npm run import -- …`) upisuje seriju u jednoj transakciji i zapisuje dodijeljene id-jeve natrag u datoteku. Igle se spremaju u `content/checks/<tema>-NN.json` (`id`, izvori, igle). Obje datoteke idu u commit. Serija s id-jevima ne može se ponovno izgraditi iz nacrta.
4. `npm run test` (test `src/data/content.test.ts` provjerava format, jedinstvene id-jeve, `note` i oblik točno/netočno) i `npm run embed` za nova pitanja ako ih uvoz nije izračunao.
5. Ispravci već uvezenih pitanja: `npm run q -- set <id> note|source "…"` i `npm run q -- archive "razlog" <id>…` mijenjaju bazu i datoteku serije zajedno.
6. Ponovna provjera: `npm run q -- recheck [serija…]` ponovno dohvati izvore odobrenih pitanja iz `content/checks/` i ispiše ona čije igle više nisu u članku. S `--review` ta pitanja dobiju status `review` i razlog u `editor_note` (baza i datoteka serije); to se pokreće samo uz odobrenje korisnika. Dokazi za starija pitanja preneseni su iz bilješki provjere (listopad 2026.); oko 2.000 najstarijih pitanja ima samo zapisan izvor, bez igala.

## 11. Izgled

- **Tokeni.** Sve boje, veličine fontova, razmaci i trajanja su CSS varijable u `src/styles/tokens.css`, posebno za tamnu i svijetlu temu (`[data-theme]`). Prijava urednika je uvijek tamna (`data-scheme="dark"`). Tema se postavlja prije prvog crtanja skriptom iz `src/storage/theme-boot.ts`, koju Vite ubaci u `index.html`.
- **Veličine.** Dizajn kreće od TV-a 16:9. Root font raste s ekranom (`--root-font-size`), a veličine u partiji ovise o visini ekrana (`--timer-size`, `--answer-size`…). Uspravni ekrani (`@media (orientation: portrait)`) imaju svoje vrijednosti u `tokens.css`. Varijanta `short:` (položeni mobitel, visina do 30 rem) definirana je u `components.css`. Dugo pitanje se smanjuje (`FitText`); riječ dulja od retka (redak je najviše 40 znakova) prelama se (`overflow-wrap: anywhere`), a ako ni najmanja veličina ne stane, pitanje se pomiče.
- **Dodir i mali ekrani.** Na `pointer: coarse` gumbi, polja, kartice Urednika i izbori (`segmented-option`) imaju najmanje `--touch-target` (44 px), a `.field-control` 16 px slova (`components.css`, na kraju). Efekti `:hover` iz `components.css` su unutar `@media (hover: hover)`, da ne zapnu nakon dodira; Tailwindov `hover:` to radi sam. `--spacing-safe-x/y` uzimaju i `env(safe-area-inset-*)` jer `index.html` ima `viewport-fit=cover`. Kad se donji bodovi skrivaju, odlučuje `scoreboardClass` u `GameScreen`. Tablica bodova po temama (`.standings-grid`, `Standings`) ima stupce s temama od 64 rem (`lg`).
- **Urednik:** popis pitanja crta 100 redaka i gumb „Prikaži još” (`QuestionsPage`); kartice na mobitelu prelaze u drugi red.
- **Slike.** `vite-imagetools` s presetima u `vite.config.ts`: `?hero` (pozadine, WebP u više širina), `?sprite` (likovi), `?logo` (AVIF i WebP), `?placeholder` (mutna sličica od 32 px). Komponenta `ui/Picture.tsx` iscrta `<picture>`. Uspravni ekrani (`usePortrait`, omjer najviše 1:1) dobivaju uspravne pozadine bez likova (`*-mobile.webp`). Ostali dobivaju široku pozadinu s likovima postavljenima u postocima slike 1672×941 (`HeroImage`, `LoginScene`).
- **Učitavanje.** `main.tsx` je malen: prethodno učita logo početne pa uveze `boot.tsx`. Nova partija, igra i urednik su zasebni dijelovi koda (lazy rute).

## 12. Build, deploy i sigurnost

- `npm run build` = `tsc -b` + `vite build`. Vite plugin `htmlPlugin` ubacuje naslov i opis iz `hr.ts` i skriptu za temu u `index.html`. Plugin `headersPlugin` generira `dist/_headers` s Content-Security-Policy (inline skripta je dopuštena po hashu, a mreža samo prema `*.supabase.co`).
- `netlify.toml`: SPA preusmjeravanje, trajni cache za `/assets/*` i sigurnosna zaglavlja.
- **Varijable na Netlifyju:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_QUESTIONS_SOURCE=supabase`. `BW_EDITOR_*` nikad ne ide na Netlify.
- **Netlify Forms:** skriveni obrazac „partija” u `index.html` (mail pri novoj partiji). Polja su nazivi iz `hr.activity.mailFields`; `htmlPlugin` ih upiše umjesto `%BW_GAME_FORM_FIELDS%`, a `mailFields` u `src/data/activity.ts` šalje iste nazive. Netlify sprema samo polja koja postoje u objavljenom obrascu. U Netlifyju treba uključiti Forms → Enable form detection i obavijest mailom za taj obrazac.
- **`index.html`:** favikone, Open Graph i Twitter oznake. Slika za pregled linka je `https://barelywrong.com/og-image.jpg` (1200×630).

## 13. Testovi i provjere

`npm run test` (Vitest, jsdom). Uz testove enginea, storagea i podataka postoje i:

- `src/conventions.test.ts`: hex boje samo u `tokens.css`, local storage samo u `src/storage`;
- `src/styles/tokens.test.ts`: kontrast teksta i pozadine najmanje 4,5:1 u obje teme;
- `src/i18n/i18n.test.ts`: tekstovi;
- `src/data/content.test.ts`: sve serije pitanja.

Prije commita mora proći `npm run check` (tsc, eslint, vitest). Prettier pokreće hook `.claude/hooks/format.mjs` nakon svake izmjene datoteke koju napravi Claude Code (`.claude/settings.json`); datoteke iz `.prettierignore` (`docs`, `content`, `CLAUDE.md`) se ne formatiraju.

## 14. Rad s Claude Codeom

Projekt se razvija u Claude Codeu (desktop aplikacija, kartica Code), u ovoj mapi. Svaka nova sesija automatski dobije sve što treba; ništa se ne kopira ručno.

| Što | Gdje | Kako se koristi |
|---|---|---|
| Upute projekta | `CLAUDE.md` | Učitava se u svaku sesiju; uvozi `docs/ROADMAP.md` i ovaj dokument. |
| Znanje o projektu | `docs/` | SPEC, DECISIONS i ostalo čitaju se po potrebi. |
| Postupci | `.claude/skills/` | `sljedeci-korak`, `provjera`, `objava`, `serija-pitanja`, `dokumentacija`; pokreću se sami kad zadatak odgovara opisu. |
| Automatika | `.claude/settings.json`, `.claude/hooks/` | Prettier nakon svake izmjene; dopuštenja za sigurne naredbe (testovi, git status, alati za čitanje pitanja) bez pitanja korisnika. |
| Dev server | `.claude/launch.json` | `dev` i `preview` za pregled u pregledniku. |
| Memorija | izvan repozitorija, u mapi Claude Codea | Kratke napomene između sesija (npr. podsjetnici korisnika). |

Projekt na claude.ai (Projects) ne može čitati ni mijenjati kod; za razgovor bez koda u njega se mogu uploadati datoteke iz `docs/`, ali izvor istine ostaje ovdje.

