import {
  PawPrint,
  ShoppingBag,
  ShoppingCart,
  Truck,
  SprayCan,
  Wrench,
  BookOpen,
  HeartHandshake,
  Smartphone,
  Star,
} from 'lucide-react'

// Los identificadores reales de categoría del proyecto NO están normalizados:
// los chips del mapa usan 'Recados' / 'Ayuda tecnica' / 'all' (helperCategoryFilters),
// las tareas guardan 'Tecnología' con tilde (tasksService.allowedCategories) y las
// skills dinámicas pueden traer emojis en el nombre. Se normaliza aquí (misma
// técnica que taskCategories.normalizeCategory) para que cualquier variante
// resuelva a su icono.
export function normalizeCategory(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

// Cubre las 11 categorías de tasksService.allowedCategories más los valores
// históricos. 'all' ("Todas") no lleva icono a propósito.
export const CATEGORY_ICONS = {
  mascotas: PawPrint,
  recados: ShoppingBag,
  compras: ShoppingCart,
  ayuda_tecnica: Smartphone,
  limpieza: SprayCan,
  mudanza: Truck,
  reparaciones: Wrench,
  clases: BookOpen,
  cuidado: HeartHandshake,
  tecnologia: Smartphone,
  otros: Star,
}

export function getCategoryIcon(category) {
  return CATEGORY_ICONS[normalizeCategory(category)] || null
}
