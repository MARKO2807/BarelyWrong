# Barely Wrong — odluke

Važne odluke i razlozi, da se ne otvaraju ponovno bez novog razloga. Nova odluka ide na vrh. Promjena odluke dodaje novi zapis i ne briše stari.

## Proizvod

- **Jedan ekran, bez upisivanja odgovora.** Voditelj čita, tim govori, voditelj sudi. Igra mora biti brza za postaviti i ugodna na TV-u. (SPEC 1)
- **Igrači se ne prijavljuju; postoji jedan urednički račun.** Manje trenja i nema osobnih podataka. Urednik je određen s `app_metadata.role`, a ne samo prijavom.
- **Nije PWA.** Igra radi u pregledniku. Instalacija i offline cache donose više održavanja nego koristi.
- **Odbrojavanje je jednostavno** (listopad 2026.): jedan timer koji u zadnjih 10 s pocrveni i trese se; zvuk se čuje na 10 s i u zadnje 3. Dramatičnija verzija (rubovi ekrana, bljeskovi, otkucaj svake sekunde) bila je previše.
- **Pravila na jednoj stranici koja se pomiče**, a ne u dvije stranice (listopad 2026.).
- **Na uspravnom mobitelu** su posebne uspravne pozadine s već nacrtanim likovima, bez zasebnih likova i animacija (listopad 2026.). Široke slike na mobitelu ne izgledaju dobro.

## Podaci i pitanja

- **Pitanja se nikad ne brišu.** Dobivaju status `rejected` ili `archived`, a id se nikad ne koristi ponovno. Statistika i prijave tako uvijek pokazuju na postojeće pitanje.
- **Odigrana pitanja pamte se po uređaju**, u local storageu. Nema računa igrača, a to je dovoljno da se društvo ne vrti u krug.
- **Statistika se šalje tek kad se partija pomakne dalje**, da „Poništi” nikad ne treba brisati poslane podatke.
- **Sve se sprema lokalno nakon svake akcije.** Kratki prekid mreže ne smeta, a partija se nastavlja nakon zatvaranja preglednika.
- **Pragovi sličnosti 0,96 i 0,93** (multilingual-e5-small). Izmjereno na pilotu; prvotni 0,92 i 0,85 davali su tisuće lažnih uzbuna. (SPEC 8.5)
- **Embeddingi se računaju lokalno** (transformers.js): nema API ključa ni troška.
- **Pitanja HKS-a se ne kopiraju doslovno.** Uzima se činjenica i piše novo pitanje; za javno izdanje treba dopuštenje HKS-a.
- **Rizična pitanja traže dva neovisna izvora** (listopad 2026.): procjene, teška pitanja, rekordi i hrvatske teme, jer je pojedini članak Wikipedije češće netočan baš u brojkama, rekordima i lokalnim temama. Neovisan izvor je drugo mjesto (Hrvatska enciklopedija) ili Wikipedia na drugom jeziku. Igle se čuvaju (`content/checks/`) da se izvori mogu ponovno provjeriti; pitanje koje izvor više ne potvrđuje ide na pregled, ne briše se. (SPEC 8.5)
- **Pitanja za partiju bira server** (`game_candidates`, listopad 2026.): najviše 2 × broj timova (najmanje 4) nasumičnih neodigranih pitanja po vrsti runde i težini, umjesto učitavanja svih 5.000. Engine i dalje sam slaže partiju; test provjerava da su kandidati uvijek dovoljni kad bi bila dovoljna i sva pitanja. Šalju se svi odigrani id-jevi.
- **Engleski kao redak u `question_texts`** s istim id-jem pitanja; lokalna (hrvatska) pitanja se ne prevode. (ROADMAP 2)

## Tehnika

- **Razvoj u Claude Codeu, ne u Projektu na claude.ai** (listopad 2026.). Code radi izravno u repozitoriju: upute (`CLAUDE.md`), dokumentacija, skillovi, hook i memorija uvijek odgovaraju stvarnom kodu. Projekt na claude.ai ima samo uploadane kopije i ne može pokretati naredbe. (ARCHITECTURE 14)
- **Alati za pitanja su u repozitoriju** (`npm run q`), ne u privremenim mapama sesija, da svaka sesija nastavlja bez učenja ispočetka.

- **Logika igre je čisti TypeScript** (`src/engine`) s testovima. Vrijeme i slučajnost dolaze izvana, pa su testovi deterministički.
- **Svi tekstovi su u `hr.ts`, a sve boje su tokeni.** Engleski i nove teme se dodaju bez diranja komponenti; to provjeravaju testovi.
- **Slike preko vite-imagetools** (WebP/AVIF u više širina) i lazy rute. Mobilni Lighthouse je oko 90, a desktop 100.
- **CSP dopušta mrežu samo prema Supabaseu.** Novi vanjski servis traži izmjenu `vite.config.ts`.
- **Migracije i brisanje u bazi radi korisnik.** Asistent ne koristi `service_role` ključ niti upisuje lozinke.
