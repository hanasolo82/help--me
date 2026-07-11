import { style } from './tokens'
import { CATEGORY_ICONS, normalizeCategory } from './categoryIconMap'

// tone: "light" → icono en color de texto (fondo claro) | "dark" → blanco
// (chip activo / fondo oscuro). Devuelve null si la categoría no tiene icono,
// para que el texto del chip/pill quede como hasta ahora.
export function CategoryIcon({ category, size = style.iconSize.pill, tone = 'light', ...props }) {
  const Icon = CATEGORY_ICONS[normalizeCategory(category)]
  if (!Icon) return null

  const color = tone === 'dark' ? style.color.iconOnDark : style.color.iconOnLight

  return (
    <Icon
      size={size}
      strokeWidth={style.strokeWidth}
      color={color}
      aria-hidden="true"
      focusable="false"
      {...props}
    />
  )
}
