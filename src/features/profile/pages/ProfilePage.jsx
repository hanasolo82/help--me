import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../contexts/useAuth'
import { getAvatarInitial } from '../../../utils/avatar'
import { useFavoriteProfile } from '../hooks/useFavoriteProfile'
import { useProfilePageData } from '../hooks/useProfilePageData'
import SkillBadge from '../../skills/components/SkillBadge'
import SkillFilter from '../../skills/components/SkillFilter'
import RatingSummary from '../../reviews/components/RatingSummary'
import ReviewsList from '../../reviews/components/ReviewsList'
import VerificationBadges from '../../verification/components/VerificationBadges'
import WeeklyAvailabilityGrid from '../../availability/components/WeeklyAvailabilityGrid'
import SectionHeader from '../../../shared/ui/SectionHeader'
import styles from '../styles/profileNetwork.module.css'

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

function formatResponseTime(minutes) {
  const value = Number(minutes)
  if (!Number.isFinite(value) || value <= 0) return 'Respuesta flexible'
  if (value < 60) return `Responde en ${value} min`

  const hours = Math.round(value / 60)
  return `Responde en ${hours} h`
}

function formatHourlyRate(rate) {
  const value = Number(rate)
  if (!Number.isFinite(value) || value <= 0) return 'Precio a consultar'
  return `${value.toFixed(0)} €/h`
}

function getLocationLabel(profile) {
  if (!profile) return 'Zona aproximada'
  const parts = [profile.city, profile.country].filter(Boolean)
  if (parts.length > 0) return parts.join(' · ')
  if (profile.show_approx_location === false) return 'Zona oculta'
  return profile.neighborhood || 'Zona aproximada'
}

function getProfileName(profile) {
  return profile?.display_name || profile?.full_name || profile?.username || 'Vecino'
}

function buildSkillOptions(skills = []) {
  return skills.reduce((acc, skill) => {
    const skillObject = skill?.skill || skill
    if (!skillObject?.category) return acc
    if (acc.some((item) => item.category === skillObject.category)) return acc
    acc.push({ id: skillObject.category, category: skillObject.category, name: skillObject.category, icon: '🏷️' })
    return acc
  }, [])
}

function summarizeReviews(reviews = []) {
  if (reviews.length === 0) {
    return {
      average: 0,
      total: 0,
      completed: 0,
    }
  }

  const total = reviews.length
  const average = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / total

  return {
    average,
    total,
    completed: total,
  }
}

function deriveAvailabilitySummary(availability = []) {
  if (availability.length === 0) return 'Sin horarios publicados'
  const days = new Set(availability.map((slot) => dayNames[slot.day_of_week]))
  return `Disponible en ${Array.from(days).slice(0, 3).join(', ')}`
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const params = useParams()
  const { user, profile: authProfile } = useAuth()
  const profileId = params.id || user?.id || authProfile?.id || null
  const [activeSkillId, setActiveSkillId] = useState('all')
  const { profile, skills, reviews, verifications, availability, favoriteState, isLoading, error, isOwnProfile } =
    useProfilePageData(profileId)
  const favoriteMutation = useFavoriteProfile(profile?.id)

  const displayName = getProfileName(profile)
  const locationLabel = getLocationLabel(profile)
  const skillCategories = useMemo(() => buildSkillOptions(skills), [skills])
  const profileSkills = useMemo(() => {
    if (activeSkillId === 'all') return skills
    return skills.filter((skill) => skill?.skill?.category === activeSkillId || skill?.skill?.id === activeSkillId)
  }, [activeSkillId, skills])
  const reviewSummary = useMemo(() => summarizeReviews(reviews), [reviews])
  const helperAvailable = profile?.helper_enabled ?? false
  const availabilitySummary = deriveAvailabilitySummary(availability)
  const primarySkills = profileSkills.slice(0, 6)

  function handleToggleFavorite() {
    favoriteMutation.mutate()
  }

  function handleInviteToTask() {
    navigate('/create', { state: { helperId: profile?.id } })
  }

  function handleContact() {
    navigate('/chats')
  }

  if (isLoading && !profile) {
    return (
      <main className="app-screen with-nav">
        <section className="detail-panel">
          <p className="eyebrow">Perfil</p>
          <h1>Cargando identidad local...</h1>
          <p className="muted">Estamos trayendo reputación, skills, disponibilidad y confianza.</p>
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
          <button type="button" className="secondary-action" onClick={() => navigate(-1)}>
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
        </section>
      </main>
    )
  }

  return (
    <main className={`app-screen ${isOwnProfile ? 'with-nav' : ''} ${styles.page}`.trim()}>
      <section className={styles.hero}>
        <div className={styles.heroCard}>
          <div className={styles.heroTop}>
            <div className={styles.avatar}>
              {profile.avatar_url ? <img src={profile.avatar_url} alt={displayName} /> : getAvatarInitial(displayName)}
            </div>
            <div className={styles.nameBlock}>
              <p className="eyebrow">{isOwnProfile ? 'Tu perfil' : 'Perfil verificado de la comunidad'}</p>
              <h1>{displayName}</h1>
              <p className={styles.handle}>@{profile.username}</p>
              <p className="muted">{profile.bio || 'Aún no ha compartido una bio.'}</p>
            </div>
          </div>

          <div className={styles.trustRow}>
            <span className={styles.trustPill}>📍 {locationLabel}</span>
          <span className={styles.trustPill}>⭐ {Number(profile.rating ?? 0).toFixed(1)}</span>
          <span className={styles.trustPill}>🧾 {reviewSummary.total || profile.reviews_count || 0} reviews</span>
          <span className={styles.trustPill}>✅ {Number(profile.completed_tasks ?? 0)} tareas</span>
          <span className={styles.trustPill}>💸 {formatHourlyRate(profile.hourly_rate)}</span>
          <span className={styles.trustPill}>{helperAvailable ? 'Helper activo' : 'Helper pausado'}</span>
        </div>

          <div className={styles.actionRow}>
            {isOwnProfile ? (
              <>
                <button type="button" className="primary-action" onClick={() => navigate('/settings')}>
                  Editar perfil
                </button>
                <button type="button" className="secondary-action" onClick={() => navigate('/settings')}>
                  Ajustes
                </button>
              </>
            ) : (
              <>
                <button type="button" className="primary-action" onClick={handleContact}>
                  Contactar
                </button>
                <button type="button" className="secondary-action" onClick={handleInviteToTask}>
                  Invitar a tarea
                </button>
                <button
                  type="button"
                  className="secondary-action"
                  onClick={handleToggleFavorite}
                  disabled={favoriteMutation.isPending}
                >
                  {favoriteState.isFavorite ? 'Quitar favorito' : 'Guardar favorito'}
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      <section className={styles.miniStats}>
        <article className={styles.miniStat}>
          <strong>{Number(profile.rating ?? 0).toFixed(1)}</strong>
          <span>Confianza media</span>
        </article>
        <article className={styles.miniStat}>
          <strong>{reviewSummary.total || profile.reviews_count || 0}</strong>
          <span>Reviews</span>
        </article>
        <article className={styles.miniStat}>
          <strong>{Number(profile.completed_tasks ?? 0)}</strong>
          <span>Tareas completadas</span>
        </article>
        <article className={styles.miniStat}>
          <strong>{formatResponseTime(profile.response_time_minutes)}</strong>
          <span>Respuesta</span>
        </article>
      </section>

      <section className={styles.section}>
        <SectionHeader
          eyebrow="Skills"
          title="Habilidades visibles y filtrables"
          lead="Haz más fácil elegir a la persona correcta mostrando experiencia real."
          titleClassName={styles.sectionTitle}
        />

        {skillCategories.length > 0 ? (
          <SkillFilter skills={skillCategories} activeSkillId={activeSkillId} onChange={setActiveSkillId} />
        ) : null}

        <div className={styles.skillGrid}>
          {primarySkills.length > 0 ? (
            primarySkills.map((skill) => (
              <SkillBadge
                key={`${skill.skill?.id || skill.id}-${skill.experience_level}`}
                skill={{
                  name: skill.skill?.name || skill.name,
                  icon: skill.skill?.icon || skill.icon,
                }}
                type="span"
              />
            ))
          ) : (
            <div className={styles.emptyState}>
              <strong>Aún no hay skills guardadas.</strong>
              <p className="muted">El onboarding avanzado podrá llenarlas más adelante.</p>
            </div>
          )}
        </div>
      </section>

      <section className={styles.section}>
        <SectionHeader
          eyebrow="Confianza"
          title="Verificaciones y reputación"
          lead="La identidad, el teléfono y el email empiezan a ser señales centrales del producto."
          titleClassName={styles.sectionTitle}
        />

        <VerificationBadges profile={profile} verifications={verifications} />
      </section>

      <section className={styles.section}>
        <SectionHeader
          eyebrow="Reviews"
          title="Opiniones reales de tareas completadas"
          lead="La reputación se construye con cada intercambio completado dentro de helpMe."
          titleClassName={styles.sectionTitle}
        />

        <RatingSummary profile={profile} reviews={reviews} />
        <ReviewsList reviews={reviews} />
      </section>

      <section className={styles.section}>
        <SectionHeader
          eyebrow="Disponibilidad"
          title="Horarios y actividad semanal"
          lead={availabilitySummary}
          titleClassName={styles.sectionTitle}
        />

        <WeeklyAvailabilityGrid slots={availability} availabilityEnabled={profile.availability_enabled} />
      </section>
    </main>
  )
}
