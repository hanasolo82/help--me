import L from 'leaflet'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { getCategoryIcon } from './categoryIconMap'
import { style } from './tokens'

// Pin de mapa opcional con el icono de la categoría en un círculo de color de
// marca. Respeta la regla de la biblioteca: el color va en el FONDO del pin y
// el icono siempre en blanco (nunca un icono verde/naranja).
//
// Todavía no está cableado: los marcadores actuales del mapa usan
// createActivityMarkerSvg (taskCategories.js). Para adoptarlo, sustituir el
// icono del marcador por categoryPin(task.category) en el componente de mapa.
// Estilos globales en src/styles.css (.category-pin__bubble / __stem).
export function categoryPin(category, bg = '#1f6b48') {
  const Icon = getCategoryIcon(category)
  const svg = Icon
    ? renderToStaticMarkup(
        createElement(Icon, {
          size: style.iconSize.marker,
          color: style.color.iconOnDark,
          strokeWidth: 2.25,
        }),
      )
    : ''

  return L.divIcon({
    className: 'category-pin',
    html: `<div class="category-pin__bubble" style="background:${bg}">${svg}</div>
           <div class="category-pin__stem" style="border-top-color:${bg}"></div>`,
    iconSize: [34, 42],
    iconAnchor: [17, 42],
  })
}
