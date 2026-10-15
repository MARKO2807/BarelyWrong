# Barely Wrong — plan razvoja

Ovo nije specifikacija. Prije svakog koraka predloži detaljan plan i pričekaj potvrdu (skill `sljedeci-korak`); dogovoreno ponašanje upiši u `docs/SPEC.md`. Kad je korak gotov, označi ga s `[x]`, dodaj datum i pomakni „Sljedeći korak”.

## Stanje (15. 10. 2026.)

- **Objava:** barelywrong.com (Netlify). Partija, urednik, statistika i prijave rade.
- **Pitanja:** oko 3.500 odobrenih na hrvatskom, u 10 tema i 3 formata. Nova pitanja ne dodajemo dok korisnik ne kaže drukčije.
- **Uređaji:** dorađeno za TV, laptop i mobitel (uspravno i položeno).

**Sljedeći korak:** 1 — pitanja za partiju bira server.

## Koraci

### [ ] 1. Pitanja za partiju bira server

Igra na početku svake partije učita sva odobrena pitanja (`src/data/questions.ts`). S desecima tisuća pitanja na više jezika to postaje sporo.

- Funkcija u bazi (RPC) prima jezik, potrebne vrste rundi i količine te id-jeve odigranih pitanja, a vraća samo pitanja za partiju.
- `selectQuestions` u engineu ostaje i dalje radi raspored po rundama.
- Lokalni izvor (`content/batches`) ostaje za razvoj.

### [ ] 2. Engleski jezik (must)

- **Sučelje:**
  - `src/i18n/en.ts` s istim ključevima kao `hr.ts` (test da se podudaraju);
  - izbor jezika;
  - adrese `/en/...` i `hreflang`;
  - naslov, opis i OG slika po jeziku.
- **Pitanja:** svako pitanje dobiva oznaku dosega:
  - `universal` se može prevesti (novi redak u `question_texts`, `lang = 'en'`, isti id);
  - `local` (hrvatski kut) ostaje samo na hrvatskom.
- **Prijevod:** AI nacrt uz pregled urednika, s istim pravilima kao SPEC 8.4. Pitanja samo na engleskom dodaju se postupno.
- **Statistika:** `answer_events` dobiva jezik.
- **Filtriranje po jeziku:** `game_questions` i funkcija iz koraka 1.

### [ ] 3. Stalni dotok pitanja

- **Skripta za serije:** izvor → nacrt → automatska provjera da se citirani dio nalazi u izvoru → duplikati → `review` u Uredniku.
- **Prijedlozi igrača:** obrazac „Predloži pitanje” s obaveznim izvorom sprema pitanje sa statusom `review`, uz mogući potpis.
- **Suradnje:** pub kvizovi i kviz klubovi, uz potpis ili licencu. Pitanja HKS-a se i dalje ne kopiraju doslovno.
- **Paketi** preko `tags`: blagdani, desetljeća, natjecanja, gradovi, firme. Mogućnost naplate.
- **Cilj:** 10.000+ pitanja po jeziku. Jedna partija troši oko 50 pitanja.

### [ ] 4. Kvaliteta iz podataka

- Težina se podešava prema postotku točnih odgovora (po jeziku).
- Pitanja koja se često prijavljuju i ona na koja svi odgovore točno automatski idu na pregled.

### [ ] 5. Kasnije

- Igra na više mobitela: svaki tim se javlja sa svog uređaja (Supabase Realtime).
- Iz SPEC 11: izbor težine, pitanja sa slikom i zvukom (`media`), Najbrži prst s drugim pokušajem.
