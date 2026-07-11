// Design tokens de la biblioteca visual (iconos + ilustraciones).
// Regla de la casa: los iconos pequeños (chips, pills, marcadores) son SIEMPRE
// neutros — color de texto sobre fondo claro, blanco sobre fondo oscuro/activo.
// El verde y el naranja de marca se reservan para fondos, botones y acentos de
// ilustraciones grandes; nunca tiñen un icono.
export const style = {
  color: {
    brand: 'var(--hm-color-primary)', // #1f6b48 → fondos/botones, NO iconos
    accent: 'var(--hm-color-accent)', // #d9623b → acentos, NO iconos
    surface: 'var(--hm-color-surface)',
    bg: 'var(--hm-color-bg)',
    border: 'var(--hm-color-border)',

    // Iconos: siempre neutros. --hm-color-text reacciona al tema (oscuro en
    // claro, crema en oscuro), así que "iconOnLight" = "color del texto".
    iconOnLight: 'var(--hm-color-text)',
    iconOnDark: '#ffffff', // sobre chip activo (fondo verde) o fondo oscuro
  },
  strokeWidth: 2,
  radius: { pill: '999px', card: '16px' },
  iconSize: { tag: 12, chip: 14, pill: 14, marker: 16 },
}
