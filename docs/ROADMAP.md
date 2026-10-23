# Barely Wrong — plan razvoja

Ovo nije specifikacija. Prije svakog koraka predloži detaljan plan i pričekaj potvrdu (skill `sljedeci-korak`); dogovoreno ponašanje upiši u `docs/SPEC.md`. Kad je korak gotov, označi ga s `[x]` u popisu i u naslovu koraka, dodaj datum i pomakni „Sljedeći korak”.

## Stanje (23. 10. 2026.)

- **Objava:** barelywrong.com (Netlify). Partija, urednik, statistika, prijave i aktivnost (Urednik → Games) rade.
- **Pitanja:** oko 5.000 odobrenih na hrvatskom, u 10 tema i 3 formata. Partija ih više ne učitava sva (korak 1), pa broj može rasti.
- **Uređaji:** dorađeno za TV, laptop i mobitel (uspravno i položeno).

**Sljedeći korak:** 2 — engleski jezik. Korisnik odlučuje kada se kreće.

## Popis zadataka

- [x] **1. Server bira pitanja za partiju** (22. 10. 2026.) — preduvjet za puno pitanja i više jezika.
- [ ] **2. Engleski jezik** (must) — sučelje, prijevod univerzalnih pitanja, statistika po jeziku.
- [ ] **3. Stalni dotok pitanja** — skripta za serije, prijedlozi igrača, suradnje, paketi.
- [ ] **4. Kvaliteta iz podataka** — težina i pregled pitanja prema statistici.
- [x] **5. Aktivnost u Uredniku** (23. 10. 2026.) — posjeti i partije vidljivi samo uredniku, mail kad netko zaigra.
- [ ] **6. Kasnije** — igra na više mobitela, izbor težine, pitanja sa slikom i zvukom.

Redoslijed nije obavezan.

## Koraci

### [x] 1. Pitanja za partiju bira server (22. 10. 2026.)

Prije je igra na početku svake partije učitala sva odobrena pitanja: 6 upita, 1,4 MB i oko 4,8 s do početka partije. Sada:

- Funkcija `game_candidates` u bazi prima jezik, broj pitanja po vrsti runde i težini (2 × broj timova, najmanje 4) i id-jeve odigranih pitanja, a vraća samo nasumične neodigrane kandidate (najviše oko 290). Jedan upit, oko 0,45 s.
- `selectQuestions` u engineu i dalje slaže partiju; test provjerava da kandidati daju partiju kad god bi je dala sva pitanja.
- Vraćanje odigranih pitanja kad vrste ponestane ide preko funkcije `question_kinds`.
- Lokalni izvor (`content/batches`) ostaje za razvoj i bira kandidate po istom pravilu (`pickCandidates`).

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
- Pitanja koja se često prijavljuju i ona na koja svi odgovore točno automatski idu na pregled. Prijave šalje anonimni igrač, pa prag mora brojati različite partije, a ne samo prijave (lažne prijave s javnim ključem).
- Ponovna provjera izvora (`npm run q -- recheck`) redovito, npr. jednom mjesečno.
- **Igle za oko 2.000 najstarijih pitanja** (dogovoreno 23. 10. 2026., odgođeno): ta pitanja imaju samo zapisan izvor, pa ih `recheck` ne pokriva. Plan u dva koraka:
  1. automatski prolaz: alat u članku traži odgovor i brojeve iz zanimljivosti i ono što nađe spremi kao igle u `content/checks/` (procjena: otprilike polovica pitanja);
  2. ručni pregled ostatka, prvo procjene, teška pitanja i rekordi.
  
  Ništa se u bazi ne mijenja bez odobrenja korisnika.

### [x] 5. Aktivnost u Uredniku (23. 10. 2026.)

Napravljeno prema planu ispod; ponašanje je u SPEC 9.4. Izmjene u odnosu na plan: stranica se zove „Games”, urednik može trajno brisati partije (posjete ne), a zaštita od lažnih zapisa po brzini je odgođena. Dogovoreno s korisnikom 18. i 23. 10. 2026. Partije su važnije od posjeta, ali bilježe se oboje. Podaci se čuvaju zauvijek.

**Što se bilježi.** Nema kolačića, IP adresa, imena timova ni trajnog id-ja uređaja. Trajni id bi u EU tražio privolu i banner, pa se povratak istog uređaja ne prati.

- **Posjet** (svako otvaranje stranice):
  - vrijeme i stranica;
  - vrsta ekrana (mobitel, tablet, laptop, veliki ekran);
  - domena s koje je posjetitelj došao (`document.referrer`, samo host);
  - vremenska zona preglednika kao okvirna lokacija.
- **Početak partije:**
  - nasumični id partije;
  - broj timova, duljina, vrijeme po pitanju, Najbrži prst;
  - teme rundi redom;
  - revanš da/ne;
  - ekran, vremenska zona, tema i zvuk.
- **Napredak partije:** zapis za svaku završenu rundu, za završetak i za „Prekini partiju”. Partija zatvorena bez toga ostaje „nedovršena”, sa zadnjom završenom rundom.
- **Ne šalje se ništa** s uređaja prijavljenog u Urednik ni iz lokalnog razvoja.

**Baza** (jedna migracija; pokreće je korisnik):

- **Tablice:** `visits`, `game_starts` i `game_progress`.
- **Pravila pristupa:**
  - anon smije samo `insert`, ne smije čitati, mijenjati ni brisati;
  - urednik smije samo čitati;
  - lažne zapise s javnim ključem nije moguće potpuno spriječiti (isto kao kod `answer_events`); ako ih bude, čiste se ručno.
- **Za urednika:** pogled `editor_games` (jedan red po partiji: dosegnuta runda, status, trajanje) i funkcija sa zbirnim brojkama po razdoblju.
- **Provjera:** `npm run db:check` dobiva provjere da anon ne može čitati te tablice.

**Kod:**

- **Engine:** čista funkcija iz promjene stanja vraća „runda završena / partija završena”, po uzoru na `getCommittedAnswerEvents`, s testovima.
- **Slanje:** postojeći red za slanje (`outbox`) dobiva nove vrste zapisa.
- **Gdje se zapisi stvaraju:**
  - `GameSession`: početak, napredak, prekid i revanš;
  - pokretanje aplikacije: posjet.

**Urednik → stranica „Aktivnost”:**

- **Uživo:** partije pokrenute u zadnjih 30 minuta koje još nisu gotove.
- **Brojke za 7 dana, 30 dana i ukupno:**
  - posjeti;
  - započete i završene partije;
  - postotak završenih;
  - prosječno trajanje;
  - postotak revanša.
- **Graf po danima:** posjeti i partije.
- **Zadnje partije**, npr. „sub 18:40 · veliki ekran · duga · 3 tima · 52 min · završena · revanš”.
- **Raspodjele:** ekran, duljina, izvor posjeta, runda u kojoj se partije prekidaju, najigranije teme.

**Mail kad netko zaigra (Netlify Forms):**

- U `index.html` ide skriveni obrazac „partija”. Pri pokretanju partije aplikacija ga pošalje u pozadini (POST na `/`) s kratkim sažetkom.
- Mail šalje Netlify, bez servera i API ključa.
- **Korisnik u Netlifyju:** uključi Forms → Enable form detection, a nakon deploya doda obavijest mailom za obrazac „partija”.
- **Ograničenje:** besplatni plan ima oko 100 prijava mjesečno. Ako bude više, šalje se samo za prvu partiju u danu ili samo za završene.

**Redoslijed objave:** migracija (korisnik) → push koda → uključivanje obrasca i obavijesti u Netlifyju.

### [ ] 6. Kasnije

- Igra na više mobitela: svaki tim se javlja sa svog uređaja (Supabase Realtime).
- Iz SPEC 11: izbor težine, pitanja sa slikom i zvukom (`media`), Najbrži prst s drugim pokušajem.
