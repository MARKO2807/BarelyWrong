/** A responsive image from a vite-imagetools preset: AVIF/WebP sources with a fallback <img>. */
export function Picture({
  picture,
  sizes,
  className,
  priority = false,
  onLoad,
}: {
  picture: ResponsivePicture
  sizes: string
  className?: string
  priority?: boolean
  onLoad?: () => void
}) {
  return (
    <picture>
      {Object.entries(picture.sources).map(([format, srcSet]) => (
        <source key={format} type={`image/${format}`} srcSet={srcSet} sizes={sizes} />
      ))}
      <img
        src={picture.img.src}
        width={picture.img.w}
        height={picture.img.h}
        alt=""
        fetchPriority={priority ? 'high' : 'auto'}
        draggable={false}
        onLoad={onLoad}
        className={`block ${className ?? ''}`}
      />
    </picture>
  )
}
