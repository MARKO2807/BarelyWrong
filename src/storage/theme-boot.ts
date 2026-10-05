// Explicit extension: vite.config.ts loads this file directly.
import { KEYS } from './keys.ts'

/**
 * Inline script for index.html (injected by vite.config.ts). It sets `data-theme` on <html>
 * before the first paint, so the light theme never flashes dark first. Dark is the default,
 * matching `loadSettings`.
 */
export const themeBootScript = `(function(){var t;try{t=JSON.parse(localStorage.getItem(${JSON.stringify(
  KEYS.settings,
)})).theme}catch(e){}document.documentElement.dataset.theme=t==='light'?'light':'dark'})();`
