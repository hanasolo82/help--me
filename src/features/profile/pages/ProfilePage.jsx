import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../contexts/useAuth'
import { useFavoriteProfile } from '../hooks/useFavoriteProfile'
import { useProfilePageData } from '../hooks/useProfilePageData'
import ProfilePublicView from '../components/ProfilePublicView'
import { buildSkillOptions } from '../utils/profileFormatters'
import { resolveReturnTo } from '../../../shared/utils/navigation'

export default function ProfilePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  const { user, profile: authProfile } = useAuth()
  const profileId = params.id || user?.id || authProfile?.id || null
  const [activeSkillId, setActiveSkillId] = useState('all')
  const [contactError, setContactError] = useState('')
  const returnTo = resolveReturnTo(location.state?.returnTo, '/home')

  const {
    profile,
    skills,
    reviews,
    verifications,
    availability,
    favoriteState,
    isLoading,
    error,
    isOwnProfile,
  } = useProfilePageData(profileId)

  const favoriteMutation = useFavoriteProfile(profile?.id)
  const skillCategories = useMemo(() => buildSkillOptions(skills), [skills])
  const filteredSkills = useMemo(() => {
    if (activeSkillId === 'all') return skills

    return skills.filter((skill) => skill?.skill?.category === activeSkillId || skill?.skill?.id === activeSkillId)
  }, [activeSkillId, skills])

  const sections = useMemo(
    () => [
      { id: 'resumen', label: 'Sobre mí' },
      { id: 'habilidades', label: 'Habilidades' },
      { id: 'confianza', label: 'Confianza' },
      { id: 'opiniones', label: 'Opiniones' },
      { id: 'disponibilidad', label: 'Disponibilidad' },
    ],
    [],
  )
  const hasTaskContext = /^\/task\/[^/?#]+(?:[/?#]|$)/.test(returnTo)

  function handleToggleFavorite() {
    favoriteMutation.mutate()
  }

  function handlePrimaryAction() {
    if (!profile?.id) return

    setContactError('')
    navigate('/create', {
      state: {
        helperId: profile.id,
        returnTo: location.pathname,
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
  const favoriteLabel = favoriteState?.isFavorite ? 'Quitar favorito' : 'Guardar favorito'

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
        skills={skillCategories}
        filteredSkills={filteredSkills}
        verifications={verifications}
        availability={availability}
        sections={sections}
        activeSkillId={activeSkillId}
        onSkillChange={setActiveSkillId}
        isOwnProfile={isOwnProfile}
        onEditProfile={() => navigate('/settings#perfil')}
        onBack={() => navigate(returnTo)}
        onPrimaryAction={handlePrimaryAction}
        primaryActionLabel="Pedir ayuda"
        showPrimaryAction={!hasTaskContext}
        onToggleFavorite={handleToggleFavorite}
        favoriteState={favoriteState}
        favoriteLabel={favoriteLabel}
        isFavoriteLoading={favoriteMutation.isPending}
        helperAvailable={helperAvailable}
      />
    </main>
  )
}
