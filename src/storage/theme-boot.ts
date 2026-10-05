// Explicit extension: vite.config.ts loads this file directly.
import { KEYS } from './keys.ts'

/**
 * Inline script for index.html (injected by vite.config.ts). It sets `data-theme` on <html>
 * before the first paint, so a saved theme never flashes the wrong colours.
 * Must resolve the theme exactly like `resolveTheme` in src/app/theme.ts.
 */
export const themeBootScript = `(function(){var t;try{t=JSON.parse(localStorage.getItem(${JSON.stringify(
  KEYS.settings,
)})).theme}catch(e){}if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t})();`
