import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import { sanitizeText } from '../../lib/security'
import { ensureCurrentProfile, updateCurrentProfile } from '../../services/profilesService'
import { SettingsProvider } from './components/SettingsContext'
import SettingsLayout from './components/SettingsLayout'
import ProfileSettings from './components/ProfileSettings'
import PaymentsSettings from './components/PaymentsSettings'
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
  theme: 'light',
  showApproxLocation: true,
  visibleZoneName: '',
  habitualLocationLabel: '',
  lat: null,
  lng: null,
  city: '',
  neighborhood: '',
  country: '',
  availabilityEnabled: true,
  acceptsDirectRequests: false,
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
    theme: profile?.theme === 'dark' ? 'dark' : 'light',
    showApproxLocation: profile?.show_approx_location ?? true,
    visibleZoneName: profile?.visible_zone_name || '',
    habitualLocationLabel: profile?.visible_zone_name || profile?.location_label || profile?.neighborhood || profile?.city || '',
    lat: Number.isFinite(Number(profile?.lat)) ? Number(profile.lat) : null,
    lng: Number.isFinite(Number(profile?.lng)) ? Number(profile.lng) : null,
    city: profile?.city || '',
    neighborhood: profile?.neighborhood || '',
    country: profile?.country || '',
    availabilityEnabled: profile?.availability_enabled ?? true,
    acceptsDirectRequests: profile?.accepts_direct_requests ?? false,
    notifyNearbyTasks: profile?.notify_nearby_tasks ?? true,
    notifyMessages: profile?.notify_messages ?? true,
    notifyPayments: profile?.notify_payments ?? true,
  }
}

function buildFormSnapshotKey(form) {
  return JSON.stringify({
    displayName: sanitizeText(form?.displayName, 80),
    username: sanitizeText(form?.username, 30).toLowerCase(),
    bio: sanitizeText(form?.bio, 160),
    theme: form?.theme === 'dark' ? 'dark' : 'light',
    showApproxLocation: Boolean(form?.showApproxLocation),
    visibleZoneName: sanitizeText(form?.visibleZoneName, 80),
    habitualLocationLabel: sanitizeText(form?.habitualLocationLabel, 160),
    lat: Number.isFinite(Number(form?.lat)) ? Number(form.lat) : null,
    lng: Number.isFinite(Number(form?.lng)) ? Number(form.lng) : null,
    city: sanitizeText(form?.city, 80),
    neighborhood: sanitizeText(form?.neighborhood, 80),
    country: sanitizeText(form?.country, 80),
    availabilityEnabled: Boolean(form?.availabilityEnabled),
    acceptsDirectRequests: Boolean(form?.acceptsDirectRequests),
    notifyNearbyTasks: Boolean(form?.notifyNearbyTasks),
    notifyMessages: Boolean(form?.notifyMessages),
    notifyPayments: Boolean(form?.notifyPayments),
    hasAvatarFile: Boolean(form?.avatarFile),
  })
}

function useObjectUrl(file) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file])

  useEffect(() => {
    if (!url) return undefined

    return () => URL.revokeObjectURL(url)
  }, [url])

  return url
}

export default function SettingsPage() {
  const { profile: authProfile, refreshProfile, user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(authProfile)
  const [form, setForm] = useState(() => buildFormFromProfile(authProfile))
  const [savedSnapshotKey, setSavedSnapshotKey] = useState(() => buildFormSnapshotKey(buildFormFromProfile(authProfile)))
  const [bootStatus, setBootStatus] = useState('loading')
  const [bootError, setBootError] = useState('')
  const [saveState, setSaveState] = useState('idle')
  const [feedback, setFeedback] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const navigateTimerRef = useRef(null)
  const feedbackTimerRef = useRef(null)

  const avatarPreview = useObjectUrl(form.avatarFile)
  const authProfileId = authProfile?.id || ''
  const isDarkTheme = form.theme === 'dark'
  const currentSnapshotKey = buildFormSnapshotKey(form)
  const isDirty = currentSnapshotKey !== savedSnapshotKey

  function clearFeedbackTimer() {
    if (feedbackTimerRef.current) {
      window.clearTimeout(feedbackTimerRef.current)
      feedbackTimerRef.current = null
    }
  }

  function clearNavigateTimer() {
    if (navigateTimerRef.current) {
      window.clearTimeout(navigateTimerRef.current)
      navigateTimerRef.current = null
    }
  }

  function showFeedback(nextFeedback) {
    clearFeedbackTimer()
    setFeedback(nextFeedback)

    const delay = nextFeedback.type === 'error' ? 4200 : 2200
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedback(null)
      feedbackTimerRef.current = null
    }, delay)
  }

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
        setSavedSnapshotKey(buildFormSnapshotKey(buildFormFromProfile(nextProfile)))
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

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        window.clearTimeout(feedbackTimerRef.current)
      }

      if (navigateTimerRef.current) {
        window.clearTimeout(navigateTimerRef.current)
      }
    }
  }, [])

  async function saveChanges() {
    if (saveState === 'saving') {
      return false
    }

    setSaveState('saving')
    clearNavigateTimer()
    clearFeedbackTimer()
    setFeedback(null)

    try {
      const nextProfile = await updateCurrentProfile({
        displayName: sanitizeText(form.displayName, 80),
        username: sanitizeText(form.username, 30).toLowerCase(),
        bio: sanitizeText(form.bio, 160),
        theme: form.theme,
        show_approx_location: Boolean(form.showApproxLocation),
        visible_zone_name: sanitizeText(form.visibleZoneName || form.habitualLocationLabel, 80),
        allowExactLocationUpdate: true,
        lat: Number.isFinite(Number(form.lat)) ? Number(form.lat) : null,
        lng: Number.isFinite(Number(form.lng)) ? Number(form.lng) : null,
        city: sanitizeText(form.city, 80),
        neighborhood: sanitizeText(form.neighborhood, 80),
        country: sanitizeText(form.country, 80),
        availabilityEnabled: form.availabilityEnabled,
        acceptsDirectRequests: form.acceptsDirectRequests,
        notifyNearbyTasks: form.notifyNearbyTasks,
        notifyMessages: form.notifyMessages,
        notifyPayments: form.notifyPayments,
        avatarFile: form.avatarFile,
      })

      setProfile(nextProfile)
      const nextForm = buildFormFromProfile(nextProfile)
      setForm(nextForm)

      const refreshedProfile = await refreshProfile()
      if (!refreshedProfile) {
        throw new Error('No se pudieron guardar los cambios')
      }

      const refreshedForm = buildFormFromProfile(refreshedProfile)
      setProfile(refreshedProfile)
      setForm(refreshedForm)
      setSavedSnapshotKey(buildFormSnapshotKey(refreshedForm))
      setSaveState('idle')
      showFeedback({ type: 'success', text: 'Guardado' })
      return true
    } catch (error) {
      console.error(error)
      setSaveState('idle')
      showFeedback({ type: 'error', text: 'No se pudieron guardar los cambios' })
      return false
    }
  }

  async function handleBack() {
    clearNavigateTimer()
    clearFeedbackTimer()

    if (saveState === 'saving') {
      return
    }

    if (!isDirty) {
      navigate('/home')
      return
    }

    const saved = await saveChanges()
    if (!saved) {
      return
    }

    navigateTimerRef.current = window.setTimeout(() => {
      navigate('/home')
    }, 550)
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
    user,
  }

  const sidebarItems = [
    { id: 'perfil', label: 'Perfil', meta: 'Identidad visible' },
    { id: 'mapa-ubicacion', label: 'Mapa y ubicación', meta: 'Zona visible y privacidad' },
    { id: 'notificaciones', label: 'Notificaciones', meta: 'Avisos y mensajes' },
    { id: 'pagos', label: 'Pagos', meta: 'Cobros e ingresos' },
    { id: 'apariencia', label: 'Apariencia', meta: 'Tema visual' },
    { id: 'seguridad', label: 'Seguridad', meta: 'Acceso y sesión' },
  ]

  return (
    <SettingsProvider value={settingsValue}>
      <main className={`${styles.page} ${isDarkTheme ? styles.dark : ''} with-nav`}>
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <h1>Ajustes</h1>
            <p>Gestiona cómo te presentas, cómo usas HelpMe y qué queda preparado para crecer contigo.</p>
          </div>
          <button
            type="button"
            className={`icon-button ${styles.heroBack}`}
            onClick={handleBack}
            disabled={saveState === 'saving'}
            aria-label={saveState === 'saving' ? 'Guardando ajustes' : 'Volver'}
          >
            ←
          </button>
        </header>

        <form className={styles.form} onSubmit={(event) => event.preventDefault()}>
          <SettingsLayout items={sidebarItems}>
            {bootStatus === 'loading' && (
              <section className={styles.stateCard}>
                <p className="eyebrow">Cargando</p>
                <h2>Estamos preparando tus ajustes</h2>
                <p className="muted">Cargamos tu experiencia para que puedas revisarla con calma.</p>
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
              <section
                className={feedback.type === 'error' ? styles.bannerError : styles.bannerSuccess}
                role={feedback.type === 'error' ? 'alert' : 'status'}
                aria-live={feedback.type === 'error' ? 'assertive' : 'polite'}
              >
                {feedback.text}
              </section>
            )}

            {bootStatus === 'ready' && (
              <>
                <ProfileSettings />
                <MapSettings />
                <NotificationSettings />
                <PaymentsSettings />
                <AppearanceSettings />
                <SecuritySettings />
              </>
            )}
          </SettingsLayout>
        </form>
      </main>
    </SettingsProvider>
  )
}
