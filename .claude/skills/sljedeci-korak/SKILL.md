---
name: sljedeci-korak
description: Nastavak rada na Barely Wrongu prema docs/ROADMAP.md. Koristi kad korisnik kaže „sljedeći korak”, „nastavi”, „idemo dalje”, „što je sljedeće”, „krenimo s korakom N” ili traži novi veći zadatak iz plana razvoja (server bira pitanja, engleski, dotok pitanja, statistika).
---

# Sljedeći korak iz plana

1. Pročitaj „Sljedeći korak” i popis koraka u `docs/ROADMAP.md`. Ako je korisnik naveo korak, uzmi taj.
2. Pročitaj dijelove `docs/SPEC.md` i `docs/ARCHITECTURE.md` koje korak dira, kao i stvarni kod tih mjesta. Ne oslanjaj se samo na dokumentaciju.
3. Predloži plan na hrvatskom, kratko:
   - cilj;
   - izmjene po datotekama;
   - migracije (njih pokreće korisnik);
   - testovi;
   - što ostaje izvan opsega;
   - otvorena pitanja.
4. **Pričekaj potvrdu** prije bilo kakve izmjene (CLAUDE.md: plan na početku svake faze).
5. Nakon potvrde napravi korak. Na kraju:
   - pokreni provjeru (skill `provjera`);
   - ažuriraj SPEC i ARCHITECTURE ako se ponašanje ili struktura promijenilo;
   - u `docs/ROADMAP.md` označi korak kao gotov (`[x]`), upiši datum i pomakni „Sljedeći korak”;
   - ako je korisnik tražio objavu, nastavi skillom `objava`.
6. Ako korak traži migraciju: napiši je u `supabase/migrations/`, objasni korisniku što radi i zamoli ga da pokrene `npm run db:push`. Ne pokreći je sam.
