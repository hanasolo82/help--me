export { style } from './tokens'
export { CategoryIcon } from './categoryIcons'
export { CATEGORY_ICONS, getCategoryIcon } from './categoryIconMap'
export { Illustration } from './Illustration'
// categoryPin (Leaflet) se importa directo desde './leafletCategoryPin' para no
// arrastrar leaflet + react-dom/server a los bundles que solo usan iconos.
