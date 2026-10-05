/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { imagetools } from 'vite-imagetools'
import { hr } from './src/i18n/hr.ts'
import { themeBootScript } from './src/storage/theme-boot.ts'

/** Candidate widths for responsive images; anything wider than the source is skipped. */
const HERO_WIDTHS = [640, 960, 1280, 1920, 2560, 3840]
const LOGO_WIDTHS = [320, 640, 960, 1280, 1920]

function widthsUpTo(candidates: number[], sourceWidth: number): string {
  return [...candidates.filter((w) => w < sourceWidth), sourceWidth].join(';')
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

/** Fills index.html texts from src/i18n/hr.ts and applies the saved theme before first paint. */
function htmlPlugin(): Plugin {
  return {
    name: 'barely-wrong-html',
    transformIndexHtml(html) {
      return {
        html: html
          .replaceAll('%BW_TITLE%', escapeHtml(hr.meta.title))
          .replaceAll('%BW_DESCRIPTION%', escapeHtml(hr.meta.description))
          .replaceAll('%BW_NOSCRIPT%', escapeHtml(hr.meta.noscript)),
        tags: [{ tag: 'script', children: themeBootScript, injectTo: 'head' }],
      }
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    imagetools({
      // Presets: `?hero`, `?logo` and `?placeholder` on an image import.
      defaultDirectives: async (url, metadata) => {
        const { searchParams } = url
        if (searchParams.has('hero') || searchParams.has('logo')) {
          const { width = 0 } = await metadata()
          const hero = searchParams.has('hero')
          return new URLSearchParams({
            w: widthsUpTo(hero ? HERO_WIDTHS : LOGO_WIDTHS, width),
            // The pixel-art heroes come out smaller as WebP than as AVIF; the logo is the other way round.
            format: hero ? 'webp' : 'avif;webp',
            quality: hero ? '72' : '82',
            as: 'picture',
          })
        }
        if (searchParams.has('placeholder')) {
          return new URLSearchParams({
            w: '32',
            format: 'webp',
            quality: '50',
            inline: '',
            as: 'url',
          })
        }
        return new URLSearchParams()
      },
    }),
    htmlPlugin(),
  ],
  test: {
    // Tests read src CSS as raw text (token contrast, conventions); without this it comes back empty.
    css: { include: [/\.css(\?|$)/] },
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
