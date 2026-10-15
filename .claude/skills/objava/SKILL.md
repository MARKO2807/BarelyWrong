---
name: objava
description: Objava izmjena Barely Wronga na barelywrong.com (commit i push na main, Netlify automatski objavljuje). Koristi kad korisnik kaže „pushaj”, „objavi”, „deploy”, „stavi live” ili kad je tražio izmjenu „i samo pushaj”.
---

# Objava

1. Pokreni skill `provjera`. Bez prolaza nema objave.
2. **Dokumentacija.** Pregledaj `git diff`. Ako se promijenilo ponašanje, struktura, naredbe ili zamke, ažuriraj u istom commitu:
   - `docs/SPEC.md` za ponašanje;
   - `docs/ARCHITECTURE.md` za strukturu i tok;
   - `CLAUDE.md` za naredbe, pravila i zamke;
   - `docs/ROADMAP.md` za stanje.
3. **Sadržaj commita.** `git status`: ne commitaj privremene datoteke (npr. `tmp-*`), `.env*`, `backups/` ni `.cache/`.
4. **Commit.** Poruka na engleskom, kratka, opisuje promjenu za korisnika. Na kraju ide trailer iz uputa sessiona (Co-Authored-By).
5. `git push` na `main`. Netlify objavi za oko minutu.
6. **Provjera objave.** Kad je izmjena vidljiva, otvori https://barelywrong.com u pregledniku i potvrdi da se promjena vidi i da nema grešaka u konzoli.
7. **Javi korisniku** što je objavljeno (hash commita) i što je provjereno.

Migracije baze nisu dio objave: njih pokreće korisnik (`npm run db:push`), i to **prije** pusha koda koji ih treba.
