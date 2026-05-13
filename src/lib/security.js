// Limpieza basica para textos libres: compacta espacios y limita longitud.
// Nota: React ya escapa al renderizar, asi que esto NO sustituye DOMPurify si algun dia
// usas dangerouslySetInnerHTML. Aqui solo normalizamos para guardar/enviar a Supabase.
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

// Top passwords mas comunes filtradas. Lista minima local; en Supabase activa ademas
// "Leaked password protection" (HaveIBeenPwned) en Auth > Policies.
const COMMON_PASSWORDS = new Set([
  '123456789012', 'qwertyuiop12', 'password1234', 'iloveyou1234',
  'admin1234567', 'welcome12345', 'letmein12345', 'monkey123456',
  'football1234', 'dragon123456', 'sunshine1234', 'princess1234',
  'qwerty123456', 'abcdef123456', '111111111111', '000000000000',
  'contraseña12', 'contrasena12', 'mipassword12', 'usuario12345',
])

export const PASSWORD_MIN_LENGTH = 12

// Politica password: minimo 12 chars + al menos 3 de 4 clases + no estar en blocklist.
// La politica fuerte final tambien debe configurarse en Supabase Auth > Policies.
export function validatePassword(password) {
  const value = String(password ?? '')

  if (value.length < PASSWORD_MIN_LENGTH) {
    return { value, isValid: false, error: `La contrasena debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres.` }
  }

  if (value.length > 128) {
    return { value, isValid: false, error: 'La contrasena no puede superar 128 caracteres.' }
  }

  const classes = [
    /[a-z]/.test(value),
    /[A-Z]/.test(value),
    /\d/.test(value),
    /[^A-Za-z0-9]/.test(value),
  ].filter(Boolean).length

  if (classes < 3) {
    return {
      value,
      isValid: false,
      error: 'Usa al menos 3 de: minusculas, mayusculas, numeros, simbolos.',
    }
  }

  if (COMMON_PASSWORDS.has(value.toLowerCase())) {
    return { value, isValid: false, error: 'Esa contrasena aparece en listas filtradas. Elige otra.' }
  }

  return { value, isValid: true, error: null }
}

// Heuristico simple de fuerza para mostrar feedback visual en el formulario de registro.
// Devuelve {score 0-4, label}. No sustituye zxcvbn pero evita la dependencia.
export function estimatePasswordStrength(password) {
  const value = String(password ?? '')
  if (!value) return { score: 0, label: '' }

  let score = 0
  if (value.length >= 8) score += 1
  if (value.length >= 12) score += 1
  if (value.length >= 16) score += 1

  const variety = [
    /[a-z]/.test(value),
    /[A-Z]/.test(value),
    /\d/.test(value),
    /[^A-Za-z0-9]/.test(value),
  ].filter(Boolean).length
  if (variety >= 3) score += 1
  if (variety === 4 && value.length >= 14) score += 1

  if (COMMON_PASSWORDS.has(value.toLowerCase())) score = 0

  score = Math.min(4, score)
  const label = ['Muy debil', 'Debil', 'Aceptable', 'Buena', 'Excelente'][score]
  return { score, label }
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
