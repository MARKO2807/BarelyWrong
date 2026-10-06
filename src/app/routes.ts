export const ROUTES = {
  home: '/',
  newGame: '/nova-partija',
  game: '/igra',
  editor: '/urednik',
} as const

/** Pages inside the editor (src/screens/editor). */
export const EDITOR_ROUTES = {
  questions: '/urednik',
  review: '/urednik/pregled',
  question: (id: string) => `/urednik/pitanje/${encodeURIComponent(id)}`,
  reports: '/urednik/prijave',
  importExport: '/urednik/uvoz',
} as const
