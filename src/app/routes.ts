export const ROUTES = {
  home: '/',
  newGame: '/new-game',
  game: '/game',
  editor: '/admin',
} as const

/** Pages inside the editor (src/screens/editor). */
export const EDITOR_ROUTES = {
  questions: '/admin',
  review: '/admin/review',
  question: (id: string) => `/admin/question/${encodeURIComponent(id)}`,
  reports: '/admin/reports',
  importExport: '/admin/import',
} as const
