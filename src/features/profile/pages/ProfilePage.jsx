import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../contexts/useAuth'
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
        helperAvailable={helperAvailable}
      />
    </main>
  )
}
