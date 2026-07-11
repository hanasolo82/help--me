import { supabase } from '../lib/supabaseClient'

// Datos fiscales del usuario para los justificantes de /pagos. Una fila por
// usuario en billing_profiles; la RLS solo deja leer/escribir la propia.

async function getSessionUserId() {
  if (!supabase) {
    throw new Error('No hay una sesión de Supabase configurada.')
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError) {
    throw new Error(sessionError.message || 'No pudimos leer tu sesión.')
  }

  const uid = sessionData?.session?.user?.id

  if (!uid) {
    throw new Error('Necesitas iniciar sesión para gestionar tus datos de facturación.')
  }

  return uid
}

/** Perfil de facturación del usuario actual, o null si aún no lo ha guardado. */
export async function getMyBillingProfile({ signal } = {}) {
  const uid = await getSessionUserId()

  let query = supabase
    .from('billing_profiles')
    .select('*')
    .eq('user_id', uid)
    .maybeSingle()

  if (signal) {
    query = query.abortSignal(signal)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return data ?? null
}

/** Crea o actualiza el perfil de facturación del usuario actual. */
export async function saveMyBillingProfile(values = {}) {
  const uid = await getSessionUserId()

  const { data, error } = await supabase
    .from('billing_profiles')
    .upsert(
      {
        user_id: uid,
        legal_name: values.legal_name ?? '',
        tax_id: values.tax_id ?? '',
        address_line: values.address_line ?? '',
        postal_code: values.postal_code ?? '',
        city: values.city ?? '',
        country: values.country ?? 'ES',
        invoice_prefix: values.invoice_prefix ?? 'HM',
      },
      { onConflict: 'user_id' },
    )
    .select()
    .single()

  if (error) {
    throw error
  }

  return data
}
