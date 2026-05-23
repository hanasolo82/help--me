import { getUserFromAuthHeader } from '../services/supabase.service.js'

export async function requireAuth(req, res, next) {
  const { user, error } = await getUserFromAuthHeader(req.headers.authorization || '')

  if (error || !user) {
    return res.status(401).json({
      error: 'Unauthorized',
    })
  }

  req.user = user
  return next()
}
