---
name: dokumentacija
description: Usklađivanje dokumentacije Barely Wronga s kodom (CLAUDE.md, docs/SPEC.md, docs/ARCHITECTURE.md, docs/ROADMAP.md, docs/DECISIONS.md). Koristi kad korisnik traži „ažuriraj dokumentaciju”, „je li dokumentacija točna”, nakon većeg niza izmjena ili kad primijetiš da dokument ne odgovara kodu.
---

# Usklađivanje dokumentacije

Svaka činjenica ima jedno mjesto; ostali dokumenti upućuju na nju umjesto da je ponavljaju.

| Dokument               | Sadrži                                                         | Ne sadrži                  |
| ---------------------- | -------------------------------------------------------------- | -------------------------- |
| `CLAUDE.md`            | pravila rada, naredbe, sigurnost, zamke (kratko)               | opis koda, stanje projekta |
| `docs/SPEC.md`         | **što** aplikacija radi: pravila igre, ekrani, dizajn, sadržaj | strukturu koda             |
| `docs/ARCHITECTURE.md` | **kako** je kod složen i kako podaci teku                      | pravila igre, planove      |
| `docs/ROADMAP.md`      | stanje i sljedeći koraci                                       | opis postojećeg koda       |
| `docs/DECISIONS.md`    | važne odluke i zašto su donesene                               | upute                      |

Postupak:

1. **Što se promijenilo.** `git log` od zadnje izmjene dokumenata (`git log -1 --format=%H -- docs CLAUDE.md`), zatim pregled diffa.
2. **Provjera tvrdnji.** Za svaku tvrdnju u dotaknutim poglavljima provjeri da još vrijedi u kodu: putanje datoteka, nazivi funkcija, ključevi storagea, naredbe u `package.json`, koraci partije, migracije.
3. **Ispravci.** Ispravi netočno, dodaj novo i obriši zastarjelo. Ne dodaj povijest promjena (to je u gitu). Ako je donesena važna odluka, upiši je u `docs/DECISIONS.md`.
4. **Ukupna duljina.** Drži je pod kontrolom: `CLAUDE.md`, `ARCHITECTURE.md` i `ROADMAP.md` učitavaju se u svaki session.
5. Commit zasebno ili uz izmjenu koda na koju se odnosi.
