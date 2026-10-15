# Barely Wrong — smjer razvoja

Dogovoreni smjer nakon prvog izdanja (listopad 2026.). Ovo nije specifikacija: prije svakog koraka predloži detaljan plan i pričekaj potvrdu, a kad se nešto dogovori, upiši to u `docs/SPEC.md`.

## Stanje (15. 10. 2026.)

- Aplikacija je objavljena na barelywrong.com (Netlify). Partija, urednik, statistika i prijave rade.
- Oko 3.500 odobrenih pitanja na hrvatskom, u deset tema i tri formata. Korisnik je zasad rekao da ne dodajemo nova pitanja.
- Dorađeno je za TV, laptop i mobitel (uspravno i položeno).

## 1. Pitanja za partiju bira server (prvo)

Igra danas na početku svake partije učita sva odobrena pitanja (`src/data/questions.ts`). S desecima tisuća pitanja na više jezika to će biti sporo.

- Funkcija u bazi (RPC) prima jezik, potrebne vrste rundi i količine te id-jeve odigranih pitanja, a vraća samo pitanja za partiju.
- `selectQuestions` u engineu ostaje i dalje radi raspored po rundama.
- Lokalni izvor (`content/batches`) ostaje za razvoj.

## 2. Engleski jezik (must)

- **Sučelje:** `src/i18n/en.ts` s istim ključevima kao `hr.ts` (test da se ključevi podudaraju), izbor jezika, adrese `/en/...`, `hreflang`, naslov i opis te OG slika po jeziku.
- **Pitanja:** svako pitanje dobiva oznaku dosega:
  - `universal` se može prevesti, kao novi redak u `question_texts` s `lang = 'en'` i istim id-jem;
  - `local` (hrvatski kut) ostaje samo na hrvatskom.
- **Prijevod:** AI nacrt uz pregled urednika, s istim pravilima kao u SPEC 8.4 (zanimljivost, provjera izvora).
- **Pitanja samo na engleskom:** dodaju se postupno.
- **Statistika:** `answer_events` dobiva jezik, jer težina ovisi o publici.
- **Pogled:** `game_questions` i nova funkcija iz koraka 1 filtriraju po jeziku.

## 3. Stalni dotok pitanja

- **Alat za serije:** izvor, pa nacrt pitanja, pa automatska provjera da se citirani dio zaista nalazi u izvoru, pa duplikati, pa `review` u Uredniku. Ručni postupak koji smo koristili pretvara se u skriptu.
- **Prijedlozi igrača:** obrazac „Predloži pitanje” (s obaveznim izvorom) sprema pitanje sa statusom `review`. Prijedlog može nositi potpis predlagatelja.
- **Suradnje:** organizatori pub kvizova i kviz klubovi, uz potpis ili licencu. Pitanja HKS-a se i dalje nikad ne kopiraju doslovno.
- **Paketi** preko `tags`: blagdani, desetljeća, sportska natjecanja, gradovi, firme. Mogućnost naplate.
- **Cilj:** 10.000+ pitanja po jeziku. Jedna partija troši oko 50 pitanja.

## 4. Kvaliteta iz podataka

- Težina se podešava prema postotku točnih odgovora iz `answer_events` (po jeziku).
- Pitanja koja se često prijavljuju i pitanja na koja svi odgovore točno automatski idu na pregled.

## 5. Kasnije

- Igra na više mobitela: svaki tim se javlja sa svog uređaja (Supabase Realtime).
- Ostalo iz SPEC 11: izbor težine, pitanja sa slikom i zvukom (`media`), Najbrži prst s drugim pokušajem.
