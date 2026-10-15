---
name: serija-pitanja
description: Pisanje, provjera i uvoz serije kviz pitanja za Barely Wrong (content/batches, npm run import). Koristi kad korisnik traži nova pitanja, seriju, prijevod pitanja ili uvoz u bazu.
---

# Serija pitanja

Pravila sadržaja su u `docs/SPEC.md` (poglavlje 8), a postupak uvoza u `docs/ARCHITECTURE.md` (poglavlje 10). Točnost je najvažnija.

1. **Dogovor.** S korisnikom dogovori temu, format, broj pitanja i raspodjelu težine (SPEC 8.3: najviše 20 % lakih, oko 45 % srednjih, oko 35 % teških). Provjeri koliko pitanja već ima ta tema: `content/batches/<tema>-*.json` ili Urednik.
2. **Pisanje** u novu datoteku `content/batches/<tema>-NN.json` (sljedeći broj), prema SPEC 8.4:
   - svako pitanje ima `note` i `source`;
   - pitanja HKS-a nikad se ne kopiraju doslovno;
   - točno/netočno počinje s „Točno ili netočno:”.
3. **Provjera činjenica.** Svaku činjenicu provjeri u izvoru, u drugom, neovisnom prolazu: dohvati stranicu i nađi rečenicu koja je potvrđuje. Ono što se ne može potvrditi izbaci; ne izmišljaj.
4. `npm run test`. Test `src/data/content.test.ts` provjerava format, id-jeve, `note` i oblik točno/netočno.
5. `npm run import -- content/batches/<datoteka>.json --dry-run` i pregledaj izvještaj o duplikatima i preklapanjima. Dupli i preslični se izbacuju ili preformuliraju. `--allow-similar` koristi samo kad si pregledao i pitanja su zaista različita.
6. **Uvoz.** `npm run import -- …` bez `--dry-run`, ali tek uz izričito odobrenje korisnika (piše u produkcijsku bazu). Skripta upisuje id-jeve natrag u datoteku, a ta datoteka ide u commit.
7. `npm run embed` ako izvještaj kaže da neka pitanja nemaju embedding.
8. **Izvještaj korisniku:** koliko je pitanja dodano, raspodjela po težini i formatu, što je izbačeno i zašto.

Skripte čitaju `.env.local` (urednički račun). Nikad ne ispisuj te vrijednosti.
