// Image presets from vite.config.ts (vite-imagetools).

interface ResponsivePicture {
  /** srcset per format, e.g. `avif`. */
  sources: Record<string, string>
  /** Largest fallback image. */
  img: { src: string; w: number; h: number }
}

declare module '*?hero' {
  const picture: ResponsivePicture
  export default picture
}

declare module '*?logo' {
  const picture: ResponsivePicture
  export default picture
}

/** Tiny blurred preview, inlined as a data URL. */
declare module '*?placeholder' {
  const src: string
  export default src
}
