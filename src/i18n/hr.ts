/** Every user-facing text in the app. Read through `t()` / `tList()` from `src/i18n`. */
export const hr = {
  meta: {
    title: 'Barely Wrong',
    pageTitle: '{page} · Barely Wrong',
    description:
      'Kviz za društvene večeri: 2–4 tima, jedan ekran i pitanja iz deset tema. Kviz za one koji skoro sve znaju.',
    noscript: 'Barely Wrong treba JavaScript. Uključi ga u pregledniku i osvježi stranicu.',
  },
  app: {
    name: 'Barely Wrong',
    tagline: 'Kviz za one koji skoro sve znaju.',
  },
  nav: {
    label: 'Glavni izbornik',
    howToPlay: 'Kako se igra',
    settings: 'Postavke',
    play: 'Igraj',
    continueGame: 'Nastavi partiju',
  },
  common: {
    close: 'Zatvori',
    cancel: 'Odustani',
    done: 'Gotovo',
    backHome: 'Na početnu',
  },
  howToPlay: {
    title: 'Kako se igra',
    steps: [
      'Igraju 2–4 tima. Svaka runda je jedna tema, a svaki tim u njoj dobiva jedno pitanje.',
      'Pitanje se pročita naglas i krene vrijeme. Tim se dogovori i kaže odgovor naglas; ništa se ne upisuje.',
      'Kad ste spremni, otvorite odgovor; kad vrijeme istekne, otvori se sam. Točan odgovor donosi 1 bod.',
      'U rundi Točno ili netočno odlučujete je li tvrdnja istinita.',
      'U rundi Procjena tim kaže broj, a sljedeći tim kaže je li točan odgovor veći ili manji. Bod dobiva tko je u pravu.',
      'Double trouble: u jednoj rundi sva pitanja vrijede duplo.',
      'Najbrži prst: jednom u partiji pitanje je za sve. Tko prvi digne ruku, odgovara: točno +2, netočno −1.',
      'Pobjeđuje tim s najviše bodova. Kod neriješenog odlučuje pitanje procjene: bliži pobjeđuje.',
    ],
    confirm: 'Jasno!',
  },
  settings: {
    title: 'Postavke',
    sound: {
      label: 'Zvuk',
      description: 'Zvučni efekti tijekom igre.',
      on: 'Uključen',
      off: 'Isključen',
    },
    theme: {
      label: 'Tema',
      description: 'Sustav prati postavku uređaja.',
      system: 'Sustav',
      light: 'Svijetla',
      dark: 'Tamna',
    },
    played: {
      label: 'Odigrana pitanja',
      description: 'Pitanja koja ste već igrali na ovom uređaju ne ponavljaju se.',
      reset: 'Vrati odigrana pitanja',
      confirmQuestion: 'Sigurno? Sva odigrana pitanja opet ulaze u igru.',
      confirm: 'Da, vrati',
      success: 'Gotovo! Sva pitanja su opet u igri.',
      failure: 'Nešto je pošlo krivo. Pokušaj ponovno.',
    },
    credits: {
      label: 'Zasluge',
      questions:
        'Pitanja se provjeravaju u Wikipediji, Hrvatskoj enciklopediji i na službenim stranicama.',
      hks: 'Dio pitanja nastao je prema setovima iz repozitorija Hrvatskog kviz saveza. Pitanja su napisana iznova, a činjenice ponovno provjerene.',
      hksLink: 'hrkviz.hr/repozitorij',
      hksUrl: 'https://hrkviz.hr/repozitorij',
      fonts: 'Fontovi: Pixelify Sans, Chakra Petch i VT323 (SIL Open Font License).',
    },
  },
  comingSoon: {
    title: 'Uskoro',
    text: 'Ovaj dio još gradimo. Vrati se uskoro!',
  },
  notFound: {
    title: 'Error 404',
    pageTitle: 'Stranica nije pronađena',
    text: 'Ova stranica ne postoji. Ni mi ne znamo gdje je, a skoro sve znamo.',
  },
} as const
