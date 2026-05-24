import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import { sanitizeText } from '../../lib/security'
import { signOut } from '../../services/authService'
import { ensureCurrentProfile, updateCurrentProfile } from '../../services/profilesService'
import { SettingsProvider } from './components/SettingsContext'
import SettingsLayout from './components/SettingsLayout'
import ProfileSettings from './components/ProfileSettings'
import AppearanceSettings from './components/AppearanceSettings'
import MapSettings from './components/MapSettings'
import NotificationSettings from './components/NotificationSettings'
import SecuritySettings from './components/SecuritySettings'
import styles from './SettingsPage.module.css'

const DEFAULT_FORM = {
  displayName: '',
  username: '',
  bio: '',
  avatarFile: null,
  mapAvatarUrl: '',
  theme: 'light',
  searchRadiusKm: '10',
  showApproxLocation: true,
  availabilityEnabled: true,
  notifyNearbyTasks: true,
  notifyMessages: true,
  notifyPayments: true,
}

function buildFormFromProfile(profile) {
  return {
    ...DEFAULT_FORM,
    displayName: profile?.display_name || profile?.full_name || '',
    username: profile?.username || '',
    bio: profile?.bio || '',
    mapAvatarUrl: profile?.map_avatar_url || '',
    theme: profile?.theme === 'dark' ? 'dark' : 'light',
    searchRadiusKm: String(profile?.search_radius_km ?? 10),
    showApproxLocation: profile?.show_approx_location ?? true,
    availabilityEnabled: profile?.availability_enabled ?? true,
    notifyNearbyTasks: profile?.notify_nearby_tasks ?? true,
    notifyMessages: profile?.notify_messages ?? true,
    notifyPayments: profile?.notify_payments ?? true,
  }
}

function useObjectUrl(file) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file])

  useEffect(() => {
    if (!url) return undefined

    return () => URL.revokeObjectURL(url)
  }, [url])

  return url
}

function calculateProfileCompletion(profile, form) {
  const hasDisplayName = Boolean(sanitizeText(form.displayName || profile?.display_name || profile?.full_name, 80))
  const hasUsername = Boolean(sanitizeText(form.username || profile?.username, 30))
  const hasBio = Boolean(sanitizeText(form.bio || profile?.bio, 160))
  const hasAvatar = Boolean(form.avatarFile || profile?.avatar_url)
  const hasMapAvatar = Boolean(form.mapAvatarUrl || profile?.map_avatar_url)

  return [hasDisplayName, hasUsername, hasBio, hasAvatar, hasMapAvatar].filter(Boolean).length * 20
}

export default function SettingsPage() {
  const { profile: authProfile, refreshProfile, user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(authProfile)
  const [form, setForm] = useState(() => buildFormFromProfile(authProfile))
  const [bootStatus, setBootStatus] = useState('loading')
  const [bootError, setBootError] = useState('')
  const [saveState, setSaveState] = useState('idle')
  const [feedback, setFeedback] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  const avatarPreview = useObjectUrl(form.avatarFile)
  const profileCompletion = calculateProfileCompletion(profile, form)
  const authProfileId = authProfile?.id || ''
  const isDarkTheme = form.theme === 'dark'

  useEffect(() => {
    if (!user?.id) return undefined

    let cancelled = false

    async function bootstrap() {
      setBootStatus('loading')
      setBootError('')

      try {
        const nextProfile = authProfileId === user.id ? authProfile : await ensureCurrentProfile()

        if (cancelled) return

        setProfile(nextProfile)
        setForm(buildFormFromProfile(nextProfile))
        setBootStatus('ready')
      } catch (error) {
        if (cancelled) return

        setBootStatus('error')
        setBootError(error?.message || 'No pudimos cargar tus ajustes.')
      }
    }

    bootstrap()

    return () => {
      cancelled = true
    }
  }, [authProfile, authProfileId, reloadKey, user?.id])

  async function handleSubmit(event) {
    event.preventDefault()
    setSaveState('saving')
    setFeedback(null)

    try {
      const nextProfile = await updateCurrentProfile({
        displayName: sanitizeText(form.displayName, 80),
        username: sanitizeText(form.username, 30).toLowerCase(),
        bio: sanitizeText(form.bio, 160),
        theme: form.theme,
        searchRadiusKm: form.searchRadiusKm,
        showApproxLocation: form.showApproxLocation,
        availabilityEnabled: form.availabilityEnabled,
        notifyNearbyTasks: form.notifyNearbyTasks,
        notifyMessages: form.notifyMessages,
        notifyPayments: form.notifyPayments,
        avatarFile: form.avatarFile,
        mapAvatarUrl: form.mapAvatarUrl || null,
      })

      setProfile(nextProfile)
      setForm(buildFormFromProfile(nextProfile))
      await refreshProfile()
      setSaveState('success')
      setFeedback({ type: 'success', text: 'Tus ajustes se han guardado correctamente.' })
    } catch (error) {
      setSaveState('error')
      setFeedback({ type: 'error', text: error?.message || 'No se pudieron guardar los cambios.' })
    }
  }

  async function handleSignOut() {
    await signOut({ scope: 'global' })
    window.location.replace('/')
  }

  const settingsValue = {
    form,
    profile,
    setField(field, value) {
      setForm((current) => ({
        ...current,
        [field]: value,
      }))
    },
    avatarPreview,
    onSignOut: handleSignOut,
  }

  const sidebarItems = [
    { id: 'datos-personales', label: 'Datos personales', meta: 'Perfil público' },
    { id: 'apariencia', label: 'Apariencia', meta: 'Tema y sensación' },
    { id: 'privacidad', label: 'Privacidad', meta: 'Visibilidad y alcance' },
    { id: 'notificaciones', label: 'Notificaciones', meta: 'Avisos y mensajes' },
    { id: 'seguridad', label: 'Inicio de sesión y seguridad', meta: 'Acceso y cuenta' },
    { id: 'pagos', label: 'Pagos', meta: 'Próximamente', disabled: true },
    { id: 'idioma-moneda', label: 'Idioma y moneda', meta: 'Próximamente', disabled: true },
    { id: 'perfil-ayudante', label: 'Perfil de ayudante', meta: 'Próximamente', disabled: true },
    { id: 'ayuda', label: 'Ayuda', meta: 'Próximamente', disabled: true },
  ]

  return (
    <SettingsProvider value={settingsValue}>
      <main className={`${styles.page} ${isDarkTheme ? styles.dark : ''} with-nav`}>
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className="eyebrow">Configuración</p>
            <h1>Ajustes de tu cuenta</h1>
            <p>Una navegación simple para editar tu cuenta sin mezclarla con el perfil público.</p>
          </div>
        </header>

        <form id="settings-form" className={styles.form} onSubmit={handleSubmit}>
          <SettingsLayout
            items={sidebarItems}
            onBack={() => navigate('/home')}
            busy={saveState === 'saving'}
          >
            <section className={styles.progressCard} aria-label="Progreso del perfil">
              <div>
                <p className={styles.progressKicker}>Perfil completado</p>
                <h2>Tu perfil está al {profileCompletion}%</h2>
              </div>
              <div className={styles.progressTrack} aria-hidden="true">
                <span className={styles.progressFill} style={{ width: `${profileCompletion}%` }} />
              </div>
            </section>

            {bootStatus === 'loading' && (
              <section className={styles.stateCard}>
                <p className="eyebrow">Cargando</p>
                <h2>Estamos preparando tus ajustes</h2>
                <p className="muted">Leemos tu profile y, si falta, lo creamos automáticamente.</p>
              </section>
            )}

            {bootStatus === 'error' && (
              <section className={`${styles.stateCard} ${styles.stateCardError}`}>
                <p className="eyebrow">Error</p>
                <h2>No hemos podido cargar tu perfil</h2>
                <p className="muted">{bootError}</p>
                <div className={styles.stateActions}>
                  <button className="secondary-action" type="button" onClick={() => setReloadKey((value) => value + 1)}>
                    Reintentar
                  </button>
                  <button className="primary-action" type="button" onClick={() => navigate('/home')}>
                    Volver a Home
                  </button>
                </div>
              </section>
            )}

            {feedback && (
              <section className={feedback.type === 'error' ? styles.bannerError : styles.bannerSuccess}>
                {feedback.text}
              </section>
            )}

            {bootStatus === 'ready' && (
              <>
                <ProfileSettings />
                <AppearanceSettings />
                <MapSettings />
                <NotificationSettings />
                <SecuritySettings />
              </>
            )}
          </SettingsLayout>
        </form>
      </main>
    </SettingsProvider>
  )
}
