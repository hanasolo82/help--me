import { style } from './tokens'

// Ilustraciones grandes A COLOR (hero, perfiles, estados vacíos). Aquí sí se
// usan los colores de marca como acento, al contrario que los iconos pequeños.
//
// Dos modos:
// - `as`: componente SVG importado con vite-plugin-svgr (`import Art from
//   './illustrations/pet-walk.svg?react'`). Permite teñir zonas del dibujo que
//   usen `fill="var(--accent)"`. Requiere instalar el plugin cuando lleguen los
//   SVG definitivos: `npm i -D vite-plugin-svgr` + `svgr()` en vite.config.
// - `src`: ruta de imagen (sin plugin). No se puede teñir con --accent.
export function Illustration({ as: Svg, src, alt, size = 200, accent = style.color.brand, ...props }) {
  if (!Svg && !src) return null

  return (
    <span
      role="img"
      aria-label={alt}
      style={{ '--accent': accent, display: 'inline-block', width: size, height: 'auto' }}
    >
      {Svg ? (
        <Svg width={size} height="auto" aria-hidden="true" focusable="false" {...props} />
      ) : (
        <img src={src} alt="" width={size} loading="lazy" decoding="async" {...props} />
      )}
    </span>
  )
}
