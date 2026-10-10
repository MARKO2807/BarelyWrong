# Barely Wrong — specifikacija

## 1. Sažetak

Barely Wrong je kviz za društvene večeri. Igraju 2–4 tima na jednom ekranu, najčešće na laptopu spojenom na TV. Nitko ništa ne upisuje: pitanje se pročita naglas, tim izgovori odgovor, aplikacija otkrije točan odgovor, a osoba koja vodi igru klikne Točno ili Netočno.

- Jezik: samo hrvatski (sučelje i pitanja), uz strukturu spremnu za engleski.
- Radi u pregledniku, bez instalacije. Nije PWA.
- Domena: barelywrong.com. Hosting: Netlify. Backend: Supabase.
- Igrači se nikad ne prijavljuju. Postoji jedan urednički račun za Urednik.

Prioriteti, ovim redom: pitanja su točna i zanimljiva; partija se postavlja jednostavno; izgled i UX su vrhunski na velikom ekranu.

## 2. Tehnologija

- React, Vite, TypeScript, React Router.
- Tailwind CSS. Sve boje, fontovi i razmaci su CSS varijable (tokeni) za tamnu i svijetlu temu; nikad hardkodirane boje u komponentama.
- Supabase: Postgres, Auth (jedan urednički račun, registracija isključena), pgvector.
- Zod za provjeru podataka pri uvozu i učitavanju pitanja.
- Vitest za testove pravila igre.
- Netlify: SPA preusmjeravanje (`/* /index.html 200`), varijable okruženja `VITE_SUPABASE_URL` i `VITE_SUPABASE_ANON_KEY`.

## 3. Arhitektura

| Mapa | Sadržaj |
|---|---|
| `src/engine/` | Pravila igre kao čisti TypeScript bez Reacta: stanje, akcije, reducer, selektori. Redoslijed rundi, Double trouble, Najbrži prst, rotacija timova, bodovanje i odabir pitanja žive samo ovdje i pokriveni su testovima. |
| `src/storage/` | Jedino mjesto koje dira local storage. |
| `src/data/` | Dohvat pitanja iz Supabasea, slanje statistike i prijava. |
| `src/i18n/hr.ts` | Svi tekstovi sučelja na jednom mjestu, uz jednostavan `t()` helper. |
| `src/screens/`, `src/ui/` | Ekrani i komponente. Bez logike igre. |
| `supabase/migrations/` | Shema, pogledi i RLS. |
| `scripts/` | Uvoz, izvoz, izračun embeddinga i provjera duplikata. |
| `content/` | Pravilnici i serije pitanja (JSON) prije uvoza. |
| `assets/` | Logo i hero slike od korisnika. |

**Tok podataka u partiji.** Na početku partije aplikacija dohvati sva odobrena pitanja, filtrira ona koja su već odigrana na ovom uređaju i odmah odabere sva pitanja za cijelu partiju (sve runde, Najbrži prst i jedno rezervno pitanje procjene za neriješeno). Odabrana pitanja spremaju se u stanje partije. Pitanje se smatra odigranim kad se prikaže na ekranu; neiskorišteno rezervno pitanje i pitanja iz prekinute partije ostaju za sljedeći put. Partija se zatim vodi i sprema lokalno nakon svake akcije, pa kratki prekid interneta ne smeta, a nastavak nakon zatvaranja preglednika radi bez mreže.

**Statistika i prijave** šalju se u pozadini. Ako nema mreže, čuvaju se u lokalnom redu i šalju kasnije. Statistika za potez šalje se tek kad se prijeđe na sljedeći potez, kako "Poništi" ne bi kvario podatke.

**Storage sloj** izlaže funkcije poput `loadGame`, `saveGame`, `clearGame`, `getPlayedIds`, `markPlayed`, `resetPlayed`, `loadSettings`, `saveSettings`, `loadLastTeams`, `saveLastTeams`. Ključevi imaju prefiks `bw:` i broj verzije sheme; kad se verzija promijeni, postoji migracija starih podataka.

## 4. Pravila igre

### 4.1 Postavljanje partije

- 2–4 tima. Ime je obavezno (do 20 znakova), a dva tima ne mogu imati isto ime (bez obzira na velika i mala slova). Svaki tim bira jednu od deset boja; dva tima ne mogu imati istu. Oznaka tima je kvadrat u njegovoj boji s početnim slovom imena, a boja tima jako je naglašena tijekom igre (najava tima, oznaka iznad pitanja, kartica s bodovima).
- Duljina: Puna (12 rundi) ili Kratka (6 rundi).
- Vrijeme po pitanju: 30, 45, 60, 75 ili 90 sekundi; zadano 60.
- Najbrži prst: uključen ili isključen; zadano uključen.
- Prikazuje se procjena trajanja: broj timova × broj rundi × (vrijeme po pitanju + 30 s).
- Zadnji timovi i postavke se pamte. "Kreni" je onemogućen dok postavke nisu ispravne.

### 4.2 Runde

- Postoji 12 vrsta rundi: 10 tema, Točno/netočno i Procjena.
- Puna partija ima svih 12 vrsta nasumičnim redom; kratka ima 6 nasumičnih.
- U rundi svaki tim dobiva po jedno pitanje. U tematskoj rundi to su otvorena pitanja iz te teme; u rundama Točno/netočno i Procjena to su pitanja tog formata iz bilo koje teme.
- Težine pitanja u istoj rundi smiju se razlikovati najviše za jedan stupanj (lako i teško nikad zajedno).
- Prvi tim bira se nasumično, a timovi zatim igraju naizmjence istim redoslijedom kroz cijelu partiju (A, B, A, B…), pa nijedan tim ne igra dvaput zaredom.

### 4.3 Potez

1. Najava tima (ime, boja, ikona) i gumb Kreni.
2. Pitanje i timer. U zadnjih 10 sekundi timer pocrveni i otkucava. Moguća je pauza.
3. Odgovor se otkriva klikom na "Otvori odgovor" ili automatski kad istekne vrijeme, uz efekt.
4. Prikazuju se odgovor i zanimljivost. Drugi prihvatljivi oblici (`accept`) ne prikazuju se u igri: je li odgovor dovoljno točan, timovi odlučuju zajedno.
5. Točno (1 bod) ili Netočno (0). "Poništi" radi dok se ne prijeđe na sljedeći potez.
6. Kratka animacija "+1" uz tim, zatim sljedeći tim.

### 4.4 Točno/netočno

Isto vrijeme kao ostala pitanja. Tim naglas kaže "točno" ili "netočno", a ocjenjuje se kao obično.

### 4.5 Procjena

- Tim na potezu kaže broj. Sljedeći tim po redu kaže "više" ili "manje", tj. je li točan odgovor veći ili manji od tog broja.
- Nakon otkrivanja klikne se ime tima koji dobiva bod: tim koji je rekao "više" ili "manje" ako je u pravu, inače tim koji je procjenjivao. Ako je procjena točno pogođena, bod dobiva tim koji je procjenjivao.
- Vrijedi 1 bod (2 u Double trouble rundi).

### 4.6 Double trouble

Jednom po partiji, u nasumičnoj rundi koja nikad nije prva. Sva pitanja u toj rundi vrijede dvostruko. Najavljuje se na početku runde.

### 4.7 Najbrži prst

- Jednom po partiji, ako je uključen, na nasumičnom mjestu između dviju rundi, uz najavu.
- Otvoreno pitanje bilo koje težine iz nasumične teme, za sve timove odjednom.
- Fiksni timer od 30 sekundi, neovisno o postavci vremena. Timovi dižu ruku, a voditelj klikne tim koji se prvi javio; timer tada staje.
- Jedan pokušaj: točno +2, netočno −1. Nakon toga se pitanje zatvara. "Poništi" vraća i pogrešno odabran tim, a timer nastavlja gdje je stao.
- Ako se nitko ne javi u 30 sekundi, otkriva se odgovor i nitko ne dobiva ni ne gubi bodove.
- Ne udvostručuje se. Ukupni rezultat smije biti negativan.

### 4.8 Ljestvica, kraj i neriješeno

- Nakon svake runde prikazuje se ljestvica: poredak s animiranim pomicanjem, ukupni bodovi i bodovi po temama (Najbrži prst ima svoj stupac).
- Kraj: pobjednik uz slavlje, poredak, tablica bodova po temama, "Revanš" (isti timovi i postavke, nova pitanja) i "Nova partija". Tim na zadnjem mjestu dobiva poruku „Error 404: IQ not found.”
- Ako je više timova izjednačeno na prvom mjestu: dobivaju pitanje procjene, svaki naglas kaže broj, a nakon otkrivanja klikne se tim koji je bio najbliže. Igra se samo jedno takvo pitanje i pobjednik je uvijek jedan; ako su dva tima jednako blizu, odlučuje voditelj. Pitanje za neriješeno ne donosi bodove, samo određuje pobjednika.

### 4.9 Ostalo

- Prekid partije traži dvostruku potvrdu. Nedovršena partija nudi se na početnoj ("Nastavi partiju").
- Tijekom partije tipka natrag u pregledniku i zatvaranje kartice traže potvrdu.
- Svako pitanje može se prijaviti uz razlog: netočno, nejasno, zastarjelo, preteško, ostalo.
- Kad se pitanja jedne vrste runde potroše, aplikacija upozori i ponudi vraćanje odigranih pitanja te vrste.
- Ekran se ne gasi tijekom partije (Screen Wake Lock API).
- Ispravak bodova: u izborniku igre voditelj timu može dodati ili oduzeti bod (npr. nakon krivog klika). Ispravci se vode zasebno od rezultata poteza, ne diraju statistiku pitanja i na ljestvici imaju svoj stupac. Mogu se raditi sve dok se ne odlučuje o pobjedniku.

## 5. Ekrani

- **Početna:** hero slika prema temi, logo, podnaslov „Kviz za one koji skoro sve znaju.” i gumb "Igraj" u sredini. Zaglavlje: logo, "Pravila" i "Postavke". Hero se sastoji od pozadine teme i zasebnih likova (lovac, čudovište Brainly i mozak pred ciljem) koji se lagano miču. Ako postoji nedovršena partija, prikazuje se "Nastavi partiju". U tamnoj temi iza teksta je mekani tamni sjaj, a u svijetloj mekani bijeli sjaj i tamni podnaslov.
- **Postavljanje partije** prema 4.1.
- **Igra:** najava runde, potez, otkrivanje, Najbrži prst, ljestvica nakon runde, neriješeno i kraj. Na vrhu: runda (npr. 3/12), tema s ikonom, značka Double trouble kad vrijedi. U sredini: pitanje i timer. Dolje: bodovi svih timova i kontrole.
- **Popup "Pravila"** s tekstom iz priloga A. Nije zasebna ruta.
- **Popup Postavke:** zvuk (zadano isključen), tema (Tamna ili Svijetla; zadano Tamna) i "Vrati odigrana pitanja" (uz potvrdu).
- **Urednik** na ruti `/admin`, samo uz prijavu (poglavlje 9). Rute su na engleskom: `/`, `/new-game`, `/game`, `/admin`.

**Prečaci na tipkovnici:** razmaknica (Kreni, Otvori odgovor, Dalje), T (Točno), N (Netočno), 1–4 (odabir tima), Z (Poništi), P (Pauza), F (cijeli zaslon), Esc (izbornik partije).

## 6. Dizajn

### 6.1 Raspored

- TV na prvom mjestu: osnovni raspored je 16:9 za velik ekran, a tekst se mora čitati s kauča. Važni elementi drže se oko 5% podalje od rubova, jer neki TV-i odrežu rub slike.
- Potpuno responzivno na svim veličinama, do mobitela uspravno.
- Gumb za cijeli zaslon.
- Tekst pitanja je što veći može biti, a da stane bez pomicanja; dulja pitanja automatski dobivaju manji font.
- Početna je u retro 8-bit i neon stilu; ostali ekrani su minimalistički i pregledni.

### 6.2 Tipografija

Google Fonts, self-hostani preko `@fontsource`, uključujući latin-ext (č, ć, đ, š, ž):

- **Rubik ExtraBold:** naslovi, gumbi, poveznice, nazivi tema, oznake.
- **Chakra Petch:** tekst pitanja i sav ostali tekst.
- **VT323:** podnaslov na početnoj, timer, bodovi i terminalski natpisi.

Pikselni fontovi nikad se ne koriste za tekst pitanja.

### 6.3 Boje

| Token | Tamna tema | Svijetla tema |
|---|---|---|
| `--bg` | #070B30 | #F3F8FF |
| `--surface` | #141857 | #FFFFFF |
| `--border` | #2B2F86 | #C6D4F0 |
| `--text` | #F2EEFF | #14183D |
| `--text-muted` | #A9A6D6 | #545C80 |
| `--primary` (gumbi) | #FB1F92 | #FB1F92 |
| `--on-primary` (tekst na gumbima) | #14071F | #14071F |
| `--primary-text` (ružičasti tekst) | #FF3D9F | #D10C74 |
| `--secondary` | #03E1FD | #1F96F9 |
| `--secondary-text` | #03E1FD | #0A6CC2 |
| `--accent` (Double trouble) | #FFB547 | #FFB547 |
| `--on-accent` | #14183D | #14183D |
| `--correct` | #3BF2A1 | #0B7A4C |
| `--wrong` (i timer u zadnjih 10 s) | #FF5468 | #D62839 |

Na ružičastim gumbima tekst je uvijek tamni; bijeli tekst na #FB1F92 ima premali kontrast. Sve kombinacije teksta i pozadine moraju imati kontrast od najmanje 4,5:1; to provjerava test `src/styles/tokens.test.ts`. Zato je ružičasti tekst u tamnoj temi svjetliji od gumba (#FB1F92 na `--surface` ima samo 4,4:1), a plava boja tima je #4380FF umjesto #3D7BFF (4,46:1 s tamnim tekstom).

**Boje timova** (ispune s tamnim tekstom #14183D, na ružičastoj #14071F), : ružičasta #FB1F92, cijan #03E1FD, jantarna #FFB547, ljubičasta #A779FF, plava #4380FF, limeta #B6F23B, narančasta #FF8A3D, crvena #FF4D4D, žuta #FFE14D, bijela #F4F2FF.

### 6.4 Tema

Tamna ili Svijetla; zadano je Tamna, a izbor se pamti. Hero slika i boje mijenjaju se s temom, a učitava se samo slika aktivne teme.

### 6.5 Grafike, animacije i zvuk

- Ikone su iz biblioteke lucide (lucide-react): 12 ikona vrsta rundi (10 tema, Točno/netočno, Procjena), Najbrži prst i ikone sučelja. Favicon je pikselno slovo B. Gumb "Igraj" nema ikonu.
- Na početnoj mozak lebdi gore-dolje, Brainly „diše”, a lovac samo jedva primjetno diše na mjestu. Veliki logo lagano lebdi uz neonski sjaj, logo u zaglavlju pulsira sjajem, a gumb "Igraj" lagano pulsira.
- Bodovi u igri pišu se istim fontom kao odgovor (Rubik ExtraBold).
- Animacije: otkrivanje odgovora, najava runde, najava Double trouble i Najbržeg prsta, pomicanje na ljestvici, slavlje na kraju. Poštuje se postavka sustava za smanjene animacije.
- Zvukovi: 8-bitni efekti generirani preko Web Audio API-ja (otkucaji u zadnjih 10 s, otkrivanje, točno, netočno, najave, pobjeda). Po zadanom su isključeni i uključuju se u Postavkama.
- Ton tekstova: zaigran, kratak, na hrvatskom, u duhu „Error 404: IQ not found.”

### 6.6 Slike od korisnika

- `assets/logo.png`: logo (zasad PNG; kad bude SVG, zamjenjuje ga).
- `assets/hero-dark.png`: hero za tamnu temu (noćni grad).
- `assets/hero-light.png`: hero za svijetlu temu (dnevni grad).

Hero slike optimizirati u WebP/AVIF u više veličina (srcset). Na velikom TV-u trebaju biti što veće razlučivosti.

## 7. Podaci (Supabase)

```sql
create table topics (
  id text primary key,            -- 'sport'
  name_hr text not null,          -- 'Sport'
  sort smallint not null
);

create table questions (
  id text primary key,            -- 'sport-0001', generira uvoz
  topic_id text not null references topics(id),
  format text not null check (format in ('open','true_false','estimate')),
  difficulty smallint not null check (difficulty between 1 and 3),
  status text not null default 'review'
    check (status in ('review','approved','rejected','archived')),
  origin text not null default 'own',   -- 'own', 'hks/<set>#<broj>', ...
  source text,
  tags text[] not null default '{}',
  time_sensitive boolean not null default false,
  checked_at date,
  media jsonb,                    -- rezervirano za buduća pitanja sa slikom ili zvukom
  editor_note text,
  embedding vector(384),          -- dimenzija ovisi o odabranom modelu
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table question_texts (
  question_id text references questions(id) on delete cascade,
  lang text not null default 'hr',
  question text not null,
  answer text not null,
  accept text[] not null default '{}',
  note text,
  primary key (question_id, lang)
);

create table answer_events (
  id bigint generated always as identity primary key,
  question_id text not null references questions(id),
  kind text not null check (kind in ('turn','fastest_finger')),
  correct boolean not null,
  created_at timestamptz not null default now()
);

create table question_reports (
  id bigint generated always as identity primary key,
  question_id text not null references questions(id),
  reason text not null check (reason in ('wrong','unclear','outdated','too_hard','other')),
  comment text,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
```

- Igra čita pitanja kroz pogled `game_questions` koji spaja `questions` i `question_texts` (jezik `hr`) samo za status `approved`, bez internih polja (`embedding`, `editor_note`, `origin`).
- RLS: anonimni korisnik smije čitati samo odobrena pitanja kroz pogled te dodavati retke u `answer_events` i `question_reports`. Prijavljeni urednik smije sve.
- Statistika se bilježi za otvorena pitanja, točno/netočno i Najbrži prst; procjena se ne bilježi, a ni Najbrži prst na koji se nitko nije javio.
- Pitanja se nikad ne brišu: odbačena dobivaju status, a njihov `id` se nikad ponovno ne koristi.
- Engleski kasnije dolazi kao novi redak u `question_texts` s `lang = 'en'`.
- Teme (`id`, naziv): `general` Opće znanje, `sport` Sport, `film_tv` Film i TV, `music` Glazba, `geography` Geografija, `history` Povijest, `culture` Kultura, `nature` Biologija i priroda, `science_tech` Znanost i tehnologija, `language_literature` Jezik i književnost.

## 8. Pitanja: pravila sadržaja

### 8.1 Teme i granice

| Tema | Što spada unutra |
|---|---|
| Opće znanje | Svakodnevica, hrana i piće, brendovi i proizvodi, mjere i jedinice, simboli. Samo ako pitanje ne pripada jasno drugoj temi. |
| Sport | Sportovi, natjecanja, sportaši, pravila, rekordi. Uključuje šah. |
| Film i TV | Filmovi, serije, glumci, redatelji, animacija, TV emisije, nagrade, videoigre. |
| Glazba | Izvođači, pjesme, albumi, žanrovi, instrumenti, klasična glazba, festivali i Eurovizija. |
| Geografija | Države, gradovi, rijeke, planine, otoci, zastave, stanovništvo, klima. |
| Povijest | Događaji, osobe, razdoblja i države kroz povijest. Bez dnevne politike, otprilike zadnjih 20 godina. |
| Kultura | Likovna umjetnost, arhitektura, kazalište, ples, mitologija, običaji, tradicija i baština. |
| Biologija i priroda | Životinje, biljke, ljudsko tijelo, ekologija, prirodne pojave (vulkani, potresi, vrijeme). |
| Znanost i tehnologija | Fizika, kemija, svemir, matematika, izumi i izumitelji, računala i internet. |
| Jezik i književnost | Knjige, pisci, likovi, poezija, stripovi, hrvatski jezik, značenje i porijeklo riječi, frazemi. |

Granični slučajevi: odlučuje znanje potrebno za odgovor. Pjesma iz filma ide u Glazbu ako se pita o izvođaču ili pjesmi, a u Film i TV ako se pita o filmu. Za znamenitost: gdje se nalazi ide u Geografiju, a tko ju je projektirao ili u kojem je stilu u Kulturu. Izumi idu u Znanost i tehnologiju i kad su povijesni.

### 8.2 Formati

- **Otvoreno (`open`):** jedan nedvosmislen odgovor.
- **Točno/netočno (`true_false`):** tvrdnja koja počinje s „Točno ili netočno:”, a odgovor je „Točno” ili „Netočno”. Otprilike pola točnih i pola netočnih. Netočne tvrdnje moraju biti uvjerljive, ne očite.
- **Procjena (`estimate`):** odgovor je broj s jedinicom (npr. „224 cm”). Broj je stabilan i ne očekuje se da ga netko zna napamet. Bez dopuštenog odstupanja.

### 8.3 Težina

- **1 Lako:** zna većina odraslih u Hrvatskoj.
- **2 Srednje:** zna netko tko prati temu.
- **3 Teško:** traži specifično znanje, ali ne natjecateljsko.

Ciljana raspodjela u svakoj temi i formatu: oko 30 % lako, 45 % srednje, 25 % teško.

Natjecateljski teška pitanja ne ulaze u igru; mogu se spremiti sa statusom `archived` za budući ekspertni način.

### 8.4 Pravilnik pisanja

- Pitanje ima najviše oko 25 riječi, jasno je i na hrvatskom standardnom jeziku, s navodnicima „”.
- Jedan točan odgovor. Drugi prihvatljivi oblici (samo prezime, izvorni pravopis, hrvatska transkripcija) idu u `accept`.
- Zanimljiv kut umjesto suhe činjenice; kontekst ili trag u pitanju je dobrodošao.
- Zanimljivost (`note`) je obavezna: jedna rečenica koja donosi novu činjenicu i ne ponavlja odgovor.
- Bez riječi „danas”, „trenutno” i „zadnji”, osim ako je nužno; tada `timeSensitive: true`.
- Bez trik pitanja i bez pitanja čiji odgovor ovisi o tumačenju.
- Izbjegavati tragedije i žrtve, dnevnu politiku, sadržaj koji može uvrijediti vjersku ili nacionalnu skupinu te seksualni sadržaj.
- Oko trećine pitanja u svakoj temi ima hrvatski kut.
- Raznolikost: podteme kroz `tags`; isti odgovor najviše dvaput u istoj temi.
- Svaka činjenica provjerena je u izvoru (Wikipedia hr/en, Hrvatska enciklopedija na enciklopedija.hr, službene stranice), a izvor je zapisan.

### 8.5 Izvori i postupak

- **Hrvatski kviz savez**, repozitorij https://hrkviz.hr/repozitorij: setovi pitanja s ključem odgovora. Pitanja se nikad ne kopiraju doslovno: uzima se činjenica i piše novo pitanje u našem stilu. Odbacuju se natjecateljski teška, zastarjela i preuska pitanja. I ključ odgovora treba provjeriti, jer su u pilot setu nađene greške. Zapisuje se `origin: "hks/<set>#<broj>"`, a svaka izmjena u odnosu na izvornik opisuje se u `editorNote`. Za javno izdanje treba zatražiti dopuštenje HKS-a.
- **Izvorna pitanja** za teme koje HKS slabo pokriva, posebno Biologiju i prirodu, Jezik i književnost te Opće znanje.
- **Postupak za svaku seriju:** nacrt, zatim neovisna provjera svake činjenice web pretragom (drugi prolaz), provjera duplikata, uvoz sa statusom `review` i pregled u Uredniku.
- **Duplikati:** isti normalizirani tekst (mala slova, bez dijakritika i interpunkcije) uz isti odgovor; isti odgovor u istoj temi; semantička sličnost preko embeddinga i pgvectora. Model je višejezični i radi lokalno u Node skripti (npr. `multilingual-e5-small` preko transformers.js), bez API ključa. Pragovi: sličnost od 0,96 naviše je vjerojatni duplikat i blokira uvoz (osim uz `--allow-similar`), 0,93–0,96 ide na pregled kao upozorenje. Izmjereno na pilotu (listopad 2026.): parafraze istog pitanja 0,945–0,988, drukčija pitanja o istom pojmu do 0,943, nepovezana pitanja do 0,906; model sažima raspon, pa su prvotni pragovi 0,92 i 0,85 davali tisuće lažnih uzbuna. Embedding se računa iz pitanja i odgovora zajedno. Pragove prilagoditi nakon prvih uvoza. Uvoz serije još upozorava na preklapanja koja sličnost ne vidi jer su pitanja drukčije sročena: isti odgovor u drugoj temi i odgovor koji se spominje u tekstu ili zanimljivosti drugog pitanja, ili obrnuto (uz padežne nastavke; odgovori kraći od četiri slova, brojevi i točno/netočno ne uspoređuju se, a odgovor koji se spominje u više od tri pitanja smatra se općepoznatim). U Uredniku se ta provjera ne radi za pojedinačno pitanje.
- **Cilj:** 100 odobrenih otvorenih pitanja po temi (1.000), uz 100 točno/netočno i 100 procjena, ukupno 1.200. Kvaliteta je uvjet: tema ne dobiva slaba pitanja samo da dosegne broj.
- **Pilot:** `content/batches/sport-pilot.json` sadrži 27 sportskih pitanja iz seta „Sportskih 100”, preformuliranih i provjerenih, u formatu za uvoz.

## 9. Uvoz i Urednik

### 9.1 Format za uvoz

```json
[
  {
    "topic": "geography",
    "format": "open",
    "difficulty": 1,
    "question": "Koji je glavni grad Australije?",
    "answer": "Canberra",
    "accept": [],
    "note": "Grad je izgrađen kao kompromis između suparničkih Sydneyja i Melbournea.",
    "source": "Wikipedia (hr): Canberra",
    "tags": ["glavni gradovi", "Australija"]
  }
]
```

- Obavezno: `topic`, `format`, `difficulty`, `question`, `answer`.
- Neobavezno: `accept`, `note`, `source`, `tags`, `timeSensitive`, `origin`, `editorNote`, `checkedAt`, `status`.
- Zadane vrijednosti: `origin` je `own`; `status` je `approved` kad je `origin` `own`, inače `review`; `checkedAt` je današnji datum; `id` se generira kao `<topic>-<četiri znamenke>`.
- Uvoz radi ovim redom: provjera Zodom s jasnim porukama o greškama, normalizacija (razmaci, navodnici), provjera duplikata s izvještajem, upis. Postoji opcija `--dry-run`.

### 9.2 Naredbe

`npm run import -- <datoteka> [--dry-run]`, `npm run export` (izvoz cijele baze u JSON kao sigurnosna kopija), `npm run embed` (izračun embeddinga za pitanja koja ga nemaju).

### 9.3 Urednik (`/admin`)

- Prijava jednim uredničkim računom (kreira se ručno u Supabaseu).
- Popis pitanja s filtrima (status, tema, format, težina, tekst) i statistikom (koliko je puta prikazano, postotak točnih).
- Uređivanje svih polja; odobravanje, odbacivanje i arhiviranje.
- Prijave iz igre, s označavanjem riješenih.
- Uvoz JSON datoteke iz preglednika (ista logika kao skripta) i izvoz.
- Upozorenja o mogućim duplikatima uz pitanje.

## 10. Faze rada

Na početku svake faze predloži plan i pričekaj potvrdu.

1. **Temelj:** Vite, React, TypeScript, Tailwind, tokeni, fontovi, teme, Netlify konfiguracija. Početna s hero slikama i logom, popupi "Pravila" i Postavke.
2. **Pravila igre i spremanje:** `src/engine` i `src/storage`, s testovima za redoslijed rundi, rotaciju timova, Double trouble, Najbrži prst, procjenu, bodovanje, Poništi, neriješeno i odabir pitanja.
3. **Ekrani igre** na pilot pitanjima iz lokalnog JSON-a: postavljanje, potez, posebne runde, ljestvica, kraj, prečaci, timer, zvuk, wake lock i cijeli zaslon.
4. **Supabase:** shema, pogled, RLS, urednički račun, dohvat pitanja, statistika i prijave s lokalnim redom.
5. **Urednik, uvoz i izvoz,** embeddingi i provjera duplikata.
6. **Sadržaj:** obrada HKS setova i pisanje izvornih pitanja u serijama po temama, do cilja iz 8.5.
7. **Dorada:** animacije, testiranje na TV-u i mobitelu, pristupačnost, optimizacija slika.

## 11. Pripremljeno za kasnije

Bez prepravljanja postojećeg moraju se moći dodati: engleski jezik, izbor težine, pitanja sa slikom i zvukom (`media`), paketi pitanja (`tags`), igra na više mobitela (pravila su izdvojena u `src/engine`) i mogućnost da nakon krivog odgovora na Najbržem prstu pokušaju i drugi timovi.

## Prilog A: tekst za "Pravila"

Izvor istine je `src/i18n/hr.ts` (`howToPlay.steps`).

1. Igraju 2–4 tima. Svaka runda je jedna tema, a svaki tim u njoj dobiva jedno pitanje. Timovi igraju naizmjence, istim redoslijedom kroz cijelu partiju.
2. Pitanje se pročita naglas i krene vrijeme, koje se može pauzirati. Tim se dogovori i kaže odgovor naglas; ništa se ne upisuje.
3. Kad ste spremni, otvorite odgovor; kad vrijeme istekne, otvori se sam. Je li odgovor dovoljno točan, odlučujete zajedno. Točan odgovor donosi 1 bod.
4. U rundi Točno ili netočno tim kaže je li tvrdnja istinita.
5. U rundi Procjena tim kaže broj, a sljedeći tim kaže je li točan odgovor veći ili manji. Bod dobiva tko je u pravu, a ako je broj pogođen točno, tim koji je procjenjivao.
6. Double trouble: u jednoj rundi, nikad prvoj, sva pitanja vrijede duplo.
7. Najbrži prst: jednom u partiji, između dviju rundi, pitanje je za sve timove. Tko se prvi javi, odgovara: točno +2, netočno −1. Ako se nitko ne javi u 30 sekundi, bodova nema.
8. Nakon svake runde slijedi ljestvica. Pobjeđuje tim s najviše bodova; kod neriješenog odlučuje jedno pitanje procjene, a pobjeđuje tko je najbliže.
9. Krivi klik? „Poništi” vraća zadnju odluku dok se ne krene dalje, a bodovi se mogu ispraviti i u izborniku igre.

