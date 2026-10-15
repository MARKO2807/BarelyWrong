---
name: provjera
description: Provjera Barely Wronga prije commita ili kad korisnik pita „radi li”, „provjeri”, „je li spremno”. Pokreće tipove, lint i testove i provjerava izgled u pregledniku na TV/laptop, uspravnom i položenom mobitelu.
---

# Provjera

1. `npm run check` (tsc, eslint i vitest). Svaka greška se popravlja, ne zaobilazi; testovi se ne brišu niti slabe da bi prošli.
2. Formatiranje radi hook nakon svake izmjene (`.claude/hooks/format.mjs`). Za datoteke izmijenjene izvan alata za uređivanje pokreni `npx prettier --write <datoteke>`.
3. Ako se izmjena vidi na ekranu:
   - Dev server je na portu 5173 (`.claude/launch.json`, ime `dev`). Ako već radi, samo otvori `http://localhost:5173`.
   - Pogledaj veličine 1366×768 (TV i laptop), 375×812 (uspravni mobitel) i 812×375 (položeni mobitel), a po potrebi i 360×640.
   - Za partiju: `/new-game` → Kreni, pa prođi korake (Space, T/N, P, Esc za izbornik). Provjeri da se ništa ne preklapa, da nema vodoravnog pomicanja i da nema grešaka u konzoli.
   - Na kraju vrati prikaz na desktop i obriši probnu partiju (`localStorage.removeItem('bw:game:v3')` kroz alat za debug), da ne ostane korisniku.
4. Prijavi korisniku što je provjereno i što nije, iskreno.
