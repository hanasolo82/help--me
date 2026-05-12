// Limpieza basica para textos libres: quita signos peligrosos simples, compacta espacios y limita longitud.
export function sanitizeText(value, maxLength = 240) {
  return String(value ?? '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

// Valida correo antes de enviarlo a Supabase Auth. Devuelve valor limpio + error legible.
export function validateEmail(email) {
  const cleanEmail = sanitizeText(email, 254).toLowerCase()
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)

  return {
    value: cleanEmail,
    isValid,
    error: isValid ? null : 'Introduce un correo valido.',
  }
}

// Valida telefono en formato internacional simple. Supabase requiere numeros razonables para OTP.
export function validatePhone(phone) {
  const cleanPhone = sanitizeText(phone, 32).replace(/[^\d+]/g, '')
  const isValid = /^\+?[1-9]\d{7,14}$/.test(cleanPhone)

  return {
    value: cleanPhone,
    isValid,
    error: isValid ? null : 'Introduce un telefono valido con prefijo si es necesario.',
  }
}

// Evita ejecutar llamadas Auth/API si faltan variables de entorno publicas de Vite.
export function assertSupabaseReady() {
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    throw new Error('Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.')
  }
}
