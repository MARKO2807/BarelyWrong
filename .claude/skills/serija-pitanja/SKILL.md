---
name: serija-pitanja
description: Pisanje, provjera i uvoz serije kviz pitanja za Barely Wrong (content/batches, npm run q, npm run import). Koristi kad korisnik traži nova pitanja, seriju, prijevod pitanja, ispravak ili arhiviranje pitanja, ili uvoz u bazu.
---

# Serija pitanja

Pravila sadržaja su u `docs/SPEC.md` (poglavlje 8), a postupak uvoza u `docs/ARCHITECTURE.md` (poglavlje 10). Točnost je najvažnija. Sve alate daje `npm run q` (`scripts/questions.ts`; popis naredbi: `npm run q` bez argumenata).

## Postupak

1. **Dogovor.** Tema, format, broj pitanja i težina (SPEC 8.3). Koliko čega ima: `npm run q -- count`. Bez izričitog odobrenja korisnika ništa se ne uvozi u bazu.
2. **Slobodni odgovori.** Prije pisanja provjeri kandidate: `npm run q -- find "Odgovor 1" "Odgovor 2" …`.
   - `HAS`: odgovor već postoji (bilo koji status), preskoči ga.
   - `MENT`: spominje se u drugom pitanju. Pogledaj (`npm run q -- show <id>`); ako bi to pitanje otkrilo tvoj odgovor ili obrnuto, preskoči. Često je lažna uzbuna (sličan korijen riječi).
   - `free`: slobodno.
   - Kad je tema zasićena, idi na „drugu razinu”: djela, likovi, pojmovi, mjesta, procjene.
3. **Nacrt** u `content/drafts/<tema>-NN.json` (nije u gitu; ime je sljedeći broj serije). Stavka:
   `[težina, pitanje, odgovor, [prihvatljivi oblici], zanimljivost, "en:Naslov članka", [oznake], [igle], {"topic": "…", "also": [["hr:Naslov", [igle]]]}?]`
   - **Izvori:** `en:Naslov`, `hr:Naslov` (Wikipedia) ili `he:slug` (Hrvatska enciklopedija; slug: `npm run q -- he "pojam"`).
   - **Igle** su kratki doslovni izrazi iz članka koji dokazuju i pitanje i zanimljivost (godine, brojevi, imena, ključne riječi). Zanimljivost bez igle nije provjerena.
   - **Drugi izvor** (`also`) je obavezan za procjene, teška pitanja, rekorde („najveći”, „prvi”, „jedini”…) i hrvatske teme. Mora biti s drugog mjesta ili na drugom jeziku: `en:` + `hr:`, ili Wikipedia + `he:`. Igle drugog izvora potvrđuju istu ključnu činjenicu (godinu, broj, ime). Ako se izvori ne slažu, pitanje se izbacuje ili preformulira tako da vrijedi u oba.
   - `{"topic"}` treba za točno/netočno i procjene, jer su pitanja iz više tema.
4. **Provjera činjenica:** `npm run q -- check <nacrt>`. Za svaki `FAIL` pogledaj članak: `npm run q -- wiki "en:Naslov" "regex"` (radi i za `hr:` i `he:`). Popravi tvrdnju prema izvoru, promijeni iglu, dodaj drugi izvor ili izbaci pitanje; nikad ne pretpostavljaj.
5. **Pregled duplikata:** `npm run q -- review <nacrt> <tema> <format>`. Izgradi seriju, pokrene probni uvoz, iz nacrta izbaci stavke s greškom i ispiše upozorenja s pitanjima na koja se odnose. Upozorenja riješi (vidi pravila dolje), pa ponovi `check` i `review`.
6. **Uvoz:** `npm run q -- import <nacrt> <tema> <format> --force` (`--force` tek kad su upozorenja pregledana). Upisuje u produkcijsku bazu, id-jeve u `content/batches/<ime>.json` i igle u `content/checks/<ime>.json`.
7. **Commit** serije i njenih igala (`Content: <ime> (N questions, approved after checks)`) i, kad korisnik tako želi, push.
8. **Izvještaj korisniku:** koliko je dodano, težina i format, što je izbačeno i zašto.

## Pravila naučena na ~1.500 pitanja

- **Zanimljivost bez „danas”, „trenutno”, „zadnji”** (uvoz ih blokira) i bez brojki koje se mijenjaju (broj naslova, „i dalje vodi klub”). Bolje povijesna činjenica.
- **Obrnuti duplikat:** novo pitanje ne smije u tekstu ili zanimljivosti imenovati odgovor postojećeg pitanja, niti postojeće pitanje imenovati odgovor novog (npr. pitanje o Philaeu i pitanje o Rosetti koje spominje Philae). Kod procjena je imenovanje predmeta neizbježno i prihvatljivo.
- **Ista serija:** pitanja unutar serije ne smiju otkrivati jedno drugo.
- **Prihvatljivi oblici:** samo prezime ne stavljaj ako ga dijeli odgovor drugog pitanja (Fleming, Lewis, Williams).
- **Vremenski osjetljivo:** rekordi, „najviša zgrada”, valuta države koja mijenja valutu. Provjeri datum u članku ili formuliraj povijesno.
- **Disambiguacijske stranice** (npr. „en:Fez”, „en:Blue Mosque”) nemaju činjenice: uzmi točan naslov članka.
- **Uvezena serija** se ne gradi ponovno: alat to odbija, a ispravci idu preko `npm run q -- set <id> note|source "…"` (baza i datoteka zajedno) ili `npm run q -- archive "razlog" <id>…`.

## Ponovna provjera uvezenih pitanja

`npm run q -- recheck [serija…]` ponovno dohvati izvore i ispiše pitanja čije igle više nisu u članku (samo čita). Za svako pogledaj članak: često je samo preformulirana rečenica (tada osvježi iglu u `content/checks/`), a ponekad se činjenica promijenila. Tek uz odobrenje korisnika: `npm run q -- recheck <serija…> --review` stavlja neuspjela pitanja na pregled u Urednik.

Skripte čitaju `.env.local` (urednički račun). Nikad ne ispisuj te vrijednosti.
