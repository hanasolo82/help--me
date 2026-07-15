import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { CATEGORY_ICONS, getCategoryIcon } from './categoryIconMap'
import { style } from './tokens'

// Icono de categoría como string SVG estático, para HTML que React no controla
// (los divIcon de Leaflet). Fallback a "otros" (estrella): un waypoint sin
// glifo parecería roto en el mapa.
export function categoryIconSvg(category, {
  size = style.iconSize.marker,
  strokeWidth = style.strokeWidth,
  color = style.color.iconOnWhite,
  className = '',
} = {}) {
  const Icon = getCategoryIcon(category) || CATEGORY_ICONS.otros

  return renderToStaticMarkup(
    createElement(Icon, {
      size,
      strokeWidth,
      color,
      className: className || undefined,
      'aria-hidden': 'true',
      focusable: 'false',
    }),
  )
}
