import type { SVGProps } from 'react'

/** A pixel grid: one string per row, `#` for a filled pixel, anything else for empty. */
export type PixelGrid = readonly string[]

/** Turns a grid into one SVG path, merging each row's runs of filled pixels into rectangles. */
export function gridToPath(grid: PixelGrid): string {
  let path = ''
  grid.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== '#') continue
      const start = x
      while (row[x + 1] === '#') x++
      const length = x - start + 1
      path += `M${start} ${y}h${length}v1h-${length}z`
    }
  })
  return path
}

export type PixelIconProps = Omit<SVGProps<SVGSVGElement>, 'viewBox' | 'children'>

/** Builds an icon component that draws `grid` in the current text colour, 1em tall. */
export function createPixelIcon(name: string, grid: PixelGrid) {
  const width = Math.max(...grid.map((row) => row.length))
  const height = grid.length
  const path = gridToPath(grid)

  function PixelIcon({ className, ...props }: PixelIconProps) {
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        fill="currentColor"
        shapeRendering="crispEdges"
        aria-hidden="true"
        focusable="false"
        className={className ? `pixel-icon ${className}` : 'pixel-icon'}
        {...props}
      >
        <path d={path} />
      </svg>
    )
  }
  PixelIcon.displayName = name
  return PixelIcon
}
