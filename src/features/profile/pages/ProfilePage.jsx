import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../contexts/useAuth'
import { canStartDirectConversation, createOrGetDirectConversation } from '../../chat/api/chatApi'
import { useProfilePageData } from '../hooks/useProfilePageData'
import ProfilePublicView from '../components/ProfilePublicView'
import { resolveReturnTo } from '../../../shared/utils/navigation'

export default function ProfilePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  const { user, profile: authProfile } = useAuth()
  const profileId = params.id || user?.id || authProfile?.id || null
  const [isEditing, setIsEditing] = useState(false)
  const [contactError, setContactError] = useState('')
  const [directMessageState, setDirectMessageState] = useState({ profileId: null, status: 'idle' })
  const returnTo = resolveReturnTo(location.state?.returnTo, '/home')

  const {
    profile,
    skills,
    reviews,
    verifications,
    availability,
    isLoading,
    error,
    isOwnProfile,
  } = useProfilePageData(profileId)

  useEffect(() => {
    let cancelled = false

    if (!profile?.id || isOwnProfile || profile.id === user?.id) return undefined

    canStartDirectConversation(profile.id)
      .then((available) => {
        if (!cancelled) {
          setDirectMessageState({ profileId: profile.id, status: available ? 'available' : 'unavailable' })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDirectMessageState({ profileId: profile.id, status: 'unavailable' })
        }
      })

    return () => {
      cancelled = true
    }
  }, [isOwnProfile, profile?.id, user?.id])

  // Índice de anclas del perfil single-page (el orden refleja el flujo real).
  // "Contacto" solo existe para visitantes: nadie se contacta a sí mismo.
  const sections = useMemo(
    () => [
      { id: 'resumen', label: 'Sobre mí' },
      { id: 'disponibilidad', label: 'Disponibilidad' },
      { id: 'habilidades', label: 'Habilidades' },
      { id: 'confianza', label: 'Confianza' },
      { id: 'opiniones', label: 'Opiniones' },
      ...(isOwnProfile ? [] : [{ id: 'contacto', label: 'Contacto' }]),
    ],
    [isOwnProfile],
  )
  function handlePrimaryAction() {
    if (!profile?.id) return

    setContactError('')
    navigate('/home', {
      state: {
        mode: 'need',
        directHelper: {
          ...profile,
          skills: skills.map((entry) => entry?.skill || entry).filter(Boolean),
        },
      },
    })
  }

  async function handleDirectMessage() {
    if (!profile?.id || directMessageState.status === 'opening') return

    setContactError('')
    setDirectMessageState({ profileId: profile.id, status: 'opening' })

    try {
      const conversationId = await createOrGetDirectConversation(profile.id)
      navigate('/messages', { state: { conversationId } })
    } catch {
      setDirectMessageState({ profileId: profile.id, status: 'unavailable' })
      setContactError('No se puede iniciar una conversación directa con este helper ahora.')
    }
  }

  if (isLoading && !profile) {
    return (
      <main className="app-screen with-nav">
        <section className="detail-panel">
          <p className="eyebrow">Perfil</p>
          <h1>Cargando identidad pública...</h1>
          <p className="muted">Estamos trayendo reputación, skills, disponibilidad y confianza.</p>
          <button type="button" className="secondary-action" onClick={() => navigate(returnTo)}>
            Volver
          </button>
        </section>
      </main>
    )
  }

  if (error) {
    return (
      <main className="app-screen with-nav">
        <section className="detail-panel">
          <p className="eyebrow">Perfil</p>
          <h1>No pudimos cargar este perfil</h1>
          <p className="muted">{error.message || 'Intenta de nuevo más tarde.'}</p>
          <button type="button" className="secondary-action" onClick={() => navigate(returnTo)}>
            Volver
          </button>
        </section>
      </main>
    )
  }

  if (!profile) {
    return (
      <main className="app-screen with-nav">
        <section className="detail-panel">
          <p className="eyebrow">Perfil</p>
          <h1>Perfil no encontrado</h1>
          <p className="muted">Puede que el usuario todavía no haya completado su onboarding.</p>
          <button type="button" className="secondary-action" onClick={() => navigate(returnTo)}>
            Volver
          </button>
        </section>
      </main>
    )
  }

  const helperAvailable = profile?.helper_status === 'active'
  const directMessageStatus = directMessageState.profileId === profile.id ? directMessageState.status : 'loading'
  const showDirectMessageAction = helperAvailable && directMessageStatus === 'available'
  return (
    <main className="app-screen with-nav">
      {contactError ? (
        <p className="auth-message error" role="alert">
          {contactError}
        </p>
      ) : null}
      <ProfilePublicView
        profile={profile}
        reviews={reviews}
        skills={skills}
        verifications={verifications}
        availability={availability}
        sections={sections}
        isOwnProfile={isOwnProfile}
        isEditing={isOwnProfile && isEditing}
        onToggleEdit={() => setIsEditing((current) => !current)}
        onEditIdentity={() => navigate('/settings#perfil')}
        onBack={() => navigate(returnTo)}
        onPrimaryAction={handlePrimaryAction}
        primaryActionLabel="Proponer una tarea"
        showPrimaryAction={helperAvailable && profile?.accepts_direct_requests === true}
        onSecondaryAction={handleDirectMessage}
        secondaryActionLabel="Enviar mensaje"
        showSecondaryAction={showDirectMessageAction}
        helperAvailable={helperAvailable}
      />
    </main>
  )
}
