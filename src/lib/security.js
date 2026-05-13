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

// Password minimo para email/password. La politica fuerte final tambien debe configurarse en Supabase.
export function validatePassword(password) {
  const value = String(password ?? '')
  const isValid = value.length >= 8

  return {
    value,
    isValid,
    error: isValid ? null : 'La contrasena debe tener al menos 8 caracteres.',
  }
}

// Username publico: simple, portable y facil de validar igual en frontend, SQL y futuro movil.
export function validateUsername(username) {
  const value = sanitizeText(username, 30).toLowerCase()
  const isValid = /^[a-z0-9_]{3,30}$/.test(value)

  return {
    value,
    isValid,
    error: isValid ? null : 'Username: 3-30 caracteres, solo letras, numeros y guion bajo.',
  }
}

// Evita ejecutar llamadas Auth/API si faltan variables de entorno publicas de Vite.
export function assertSupabaseReady() {
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
    throw new Error('Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.')
  }
}
