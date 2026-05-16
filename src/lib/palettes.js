// Paletas de la app. Sustituyen al color picker libre por opciones curadas y consistentes.
// `primary` se almacena en profiles.accent_color (texto, hex en minusculas).
// `ink` controla bordes y sombras; `soft` se usa como fondo cremoso de cada paleta.

export const PALETTES = {
  indigo: {
    key: 'indigo',
    label: 'Indigo',
    primary: '#1804c9',
    ink: '#10162f',
    soft: '#fff0e5',
  },
  sunset: {
    key: 'sunset',
    label: 'Sunset',
    primary: '#ff6b35',
    ink: '#2d1810',
    soft: '#fff5ec',
  },
  forest: {
    key: 'forest',
    label: 'Forest',
    primary: '#2e7d32',
    ink: '#0f2f10',
    soft: '#eef7ee',
  },
}

export const PALETTE_LIST = Object.values(PALETTES)
export const DEFAULT_PALETTE = PALETTES.indigo

export function findPaletteByPrimary(primaryHex) {
  if (typeof primaryHex !== 'string') return DEFAULT_PALETTE
  const value = primaryHex.toLowerCase()
  return PALETTE_LIST.find((palette) => palette.primary === value) || DEFAULT_PALETTE
}

export function isValidPalettePrimary(primaryHex) {
  if (typeof primaryHex !== 'string') return false
  const value = primaryHex.toLowerCase()
  return PALETTE_LIST.some((palette) => palette.primary === value)
}
