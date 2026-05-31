import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createOrGetDirectConversation } from '../../../services/chatService'
import TaskCard from '../../tasks/components/TaskCard/TaskCard'
import TaskMap from '../../map/components/TaskMap/TaskMap'
import CategoryFilter from '../../../components/home/CategoryFilter'
import RadiusFilter from '../../../components/home/RadiusFilter'
import {
  buildSkillOptions,
  formatHourlyRate,
  formatResponseTime,
  getHelperStatusCopy,
  getLocationLabel,
  getProfileName,
} from '../../profile/utils/profileFormatters'
import { useHelperHomeData } from '../hooks/useHelperHomeData'
import HelperStatusHero from './HelperStatusHero'
import styles from '../styles/helperHome.module.css'

const TABS = [
  { id: 'opportunities', label: 'Oportunidades' },
  { id: 'map', label: 'Mapa' },
  { id: 'activity', label: 'Actividad' },
  { id: 'performance', label: 'Rendimiento' },
  { id: 'profile', label: 'Perfil' },
]

const DEFAULT_CENTER = { latitude: 41.6523, longitude: -0.9019, label: 'Tu zona' }

const SAMPLE_SKILLS = [
  { id: 'skill-babysitting', name: 'Babysitting', category: 'Cuidados' },
  { id: 'skill-furniture', name: 'Montaje de muebles', category: 'Hogar' },
  { id: 'skill-shopping', name: 'Compra urgente', category: 'Recados' },
]

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function formatTaskAge(task) {
  const date = new Date(task?.published_at || task?.updated_at || task?.created_at || Date.now())
  if (Number.isNaN(date.getTime())) return 'Hace poco'

  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000))
  if (minutes < 60) return `Hace ${Math.max(1, minutes)} min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Hace ${hours} h`

  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

function formatTaskLocation(task) {
  return task?.zone || task?.location_label || task?.location || 'Zona no indicada'
}

function buildCenter(location, profile) {
  const latitude = Number(location?.lat ?? profile?.lat ?? DEFAULT_CENTER.latitude)
  const longitude = Number(location?.lng ?? profile?.lng ?? DEFAULT_CENTER.longitude)

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return DEFAULT_CENTER
  }

  return {
    latitude,
    longitude,
    label: location?.label || getLocationLabel(profile) || DEFAULT_CENTER.label,
  }
}

function getVerificationCount(profile) {
  const verifications = profile?.profile_verifications || profile?.verifications || {}
  const values = [
    verifications.email_verified ?? profile?.verified_email,
    verifications.phone_verified ?? profile?.verified_phone,
    verifications.identity_verified ?? profile?.verified_identity ?? profile?.identity_verified,
    verifications.background_checked,
  ]

  return values.filter(Boolean).length
}

function getTrustScore(profile) {
  const rating = Number(profile?.rating ?? 0)
  const verificationCount = getVerificationCount(profile)
  const reviewCount = Number(profile?.reviews_count ?? 0)
  const ratingScore = clamp(Math.round((rating / 5) * 55), 0, 55)
  const verificationScore = clamp(verificationCount * 10, 0, 40)
  const reviewScore = clamp(Math.min(reviewCount, 5) * 2, 0, 10)

  return clamp(ratingScore + verificationScore + reviewScore, 0, 100)
}

function getResponseScore(profile) {
  const minutes = Number(profile?.response_time_minutes)
  if (!Number.isFinite(minutes) || minutes <= 0) return 72
  if (minutes <= 15) return 96
  if (minutes <= 30) return 90
  if (minutes <= 60) return 82
  if (minutes <= 180) return 72
  return 60
}

function getAcceptanceRate(tasks = []) {
  const total = tasks.length
  if (!total) return 0

  const completed = tasks.filter((task) => ['completed', 'closed'].includes(task.status)).length
  return Math.round((completed / total) * 100)
}

function getAverageCompletion(tasks = []) {
  const completed = tasks.filter((task) => ['completed', 'closed'].includes(task.status))
  if (completed.length === 0) return '0/mes'

  const timestamps = completed
    .map((task) => new Date(task.created_at || task.updated_at || task.published_at || Date.now()).getTime())
    .filter(Number.isFinite)

  if (timestamps.length === 0) return `${completed.length}/mes`

  const oldest = Math.min(...timestamps)
  const newest = Math.max(...timestamps)
  const months = Math.max(1, Math.ceil((newest - oldest) / (1000 * 60 * 60 * 24 * 30)))

  return `${(completed.length / months).toFixed(1)}/mes`
}

function getSkillTokens(profile, helperHomeProps) {
  const source = helperHomeProps.profileSkills || profile?.skills || profile?.helper_skills || profile?.profile_skills || []
  const options = buildSkillOptions(source)

  return options.length > 0 ? options : SAMPLE_SKILLS
}

function getCompatibilityScore(task, profile, distanceKm, radiusKm, skillTokens) {
  if (!task) return 0

  const taskCategory = String(task.category || '').toLowerCase()
  const hasSkillMatch = skillTokens.some((skill) => {
    const token = String(skill?.name || skill?.category || '').toLowerCase()
    return token && (token === taskCategory || token.includes(taskCategory) || taskCategory.includes(token))
  })

  const distanceValue = Number(distanceKm)
  const safeRadius = Number.isFinite(Number(radiusKm)) && Number(radiusKm) > 0 ? Number(radiusKm) : 10
  const distanceScore = Number.isFinite(distanceValue)
    ? clamp(Math.round(34 - (distanceValue / safeRadius) * 34), 0, 34)
    : 12

  const freshnessDate = new Date(task.published_at || task.created_at || Date.now())
  const freshnessHours = Math.max(0, (Date.now() - freshnessDate.getTime()) / 3600000)
  const freshnessScore = freshnessHours <= 12 ? 20 : freshnessHours <= 24 ? 16 : freshnessHours <= 72 ? 10 : 4

  const priceScore = Number(task.price ?? 0) > 0 ? 10 : 4
  const skillScore = hasSkillMatch ? 40 : 12
  const activeScore = profile?.availability_enabled === false ? -6 : 8

  return clamp(skillScore + distanceScore + freshnessScore + priceScore + activeScore, 0, 100)
}

function buildMockOpportunityEntries(center) {
  const items = [
    {
      id: 'demo-opportunity-babysitting',
      title: 'Babysitting',
      category: 'Cuidados',
      price: 18,
      distance: 2.1,
      urgencyLabel: 'Hoy 18:00',
      estimatedEarnings: '18 EUR',
      trustLabel: '4.9 confianza',
      urgencyTone: 'urgente',
      compatibilityScore: 94,
      zone: 'Centro',
      note: '2 niños · 3 horas · tarde',
      requester: 'Marta',
      verified: true,
      rating: 4.9,
      latOffset: 0.009,
      lngOffset: 0.011,
      ageMinutes: 18,
    },
    {
      id: 'demo-opportunity-mueble',
      title: 'Montaje mueble',
      category: 'Hogar',
      price: 24,
      distance: 4.5,
      urgencyLabel: 'Mañana',
      estimatedEarnings: '24 EUR',
      trustLabel: '4.8 confianza',
      urgencyTone: 'normal',
      compatibilityScore: 88,
      zone: 'Barrio oeste',
      note: 'IKEA · 1 módulo · 45 min',
      requester: 'Javier',
      verified: true,
      rating: 4.8,
      latOffset: -0.013,
      lngOffset: 0.007,
      ageMinutes: 120,
    },
    {
      id: 'demo-opportunity-compra',
      title: 'Compra urgente',
      category: 'Recados',
      price: 12,
      distance: 1.2,
      urgencyLabel: 'Ahora',
      estimatedEarnings: '12 EUR',
      trustLabel: '4.7 confianza',
      urgencyTone: 'urgent',
      compatibilityScore: 96,
      zone: 'Cercano',
      note: 'Lista corta · recogida inmediata',
      requester: 'Lucía',
      verified: false,
      rating: 4.7,
      latOffset: 0.004,
      lngOffset: -0.006,
      ageMinutes: 7,
    },
  ]

  return items.map((item) => {
    const createdAt = new Date(Date.now() - item.ageMinutes * 60000).toISOString()

    return {
      task: {
        id: item.id,
        title: item.title,
        description: item.note,
        category: item.category,
        price: item.price,
        status: 'open',
        created_by: `demo-requester-${item.id}`,
        published_at: createdAt,
        created_at: createdAt,
        updated_at: createdAt,
        lat: Number((center.latitude + item.latOffset).toFixed(6)),
        lng: Number((center.longitude + item.lngOffset).toFixed(6)),
        zone: item.zone,
        creator_profile: {
          display_name: item.requester,
          full_name: item.requester,
          username: item.requester.toLowerCase(),
          rating: item.rating,
          verified: item.verified,
          avatar_url: null,
        },
      },
      distance: item.distance,
      compatibilityScore: item.compatibilityScore,
      urgencyLabel: item.urgencyLabel,
      estimatedEarnings: item.estimatedEarnings,
      trustLabel: item.trustLabel,
      urgencyTone: item.urgencyTone,
      verified: item.verified,
    }
  })
}

function buildOpportunityEntries(entries = [], currentUserId, profile, radiusKm, skillTokens, center) {
  const normalized = entries
    .map((entry) => {
      const task = entry?.task || entry
      if (!task || task.status !== 'open' || task.created_by === currentUserId) return null

      const distanceValue = Number(entry?.distance ?? entry?.distance_km ?? null)
      const distance = Number.isFinite(distanceValue) ? distanceValue : null
      const compatibilityScore = Number(entry?.compatibilityScore ?? getCompatibilityScore(task, profile, distance, radiusKm, skillTokens))
      const urgencyLabel = entry?.urgencyLabel || formatTaskAge(task)
      const estimatedEarnings = entry?.estimatedEarnings || `${Number(task.price ?? 0)} EUR`
      const trustLabel =
        entry?.trustLabel ||
        `${Number(task.creator_profile?.rating ?? profile?.rating ?? 0).toFixed(1)} confianza`

      return {
        task,
        distance,
        compatibilityScore,
        urgencyLabel,
        estimatedEarnings,
        trustLabel,
        urgencyTone: entry?.urgencyTone || (urgencyLabel === 'Ahora' ? 'urgent' : 'neutral'),
        verified: Boolean(entry?.verified ?? task.creator_profile?.verified),
      }
    })
    .filter(Boolean)

  if (normalized.length > 0) {
    return normalized.sort((left, right) => {
      if (right.compatibilityScore !== left.compatibilityScore) {
        return right.compatibilityScore - left.compatibilityScore
      }

      const leftDistance = Number(left.distance)
      const rightDistance = Number(right.distance)
      const hasLeftDistance = Number.isFinite(leftDistance)
      const hasRightDistance = Number.isFinite(rightDistance)

      if (hasLeftDistance && hasRightDistance && leftDistance !== rightDistance) {
        return leftDistance - rightDistance
      }

      if (hasLeftDistance !== hasRightDistance) {
        return hasLeftDistance ? -1 : 1
      }

      const leftDate = new Date(left.task.published_at || left.task.updated_at || left.task.created_at || 0).getTime()
      const rightDate = new Date(right.task.published_at || right.task.updated_at || right.task.created_at || 0).getTime()
      if (leftDate !== rightDate) {
        return rightDate - leftDate
      }

      return String(left.task.id || '').localeCompare(String(right.task.id || ''))
    })
  }

  return buildMockOpportunityEntries(center)
}

function buildActivityFeed({ upcomingTasks, activityTasks, chats, selectedOpportunity }) {
  const feed = []

  if (upcomingTasks.length > 0) {
    const task = upcomingTasks[0]
    feed.push({
      id: `upcoming-${task.id}`,
      title: 'Tarea aceptada',
      subtitle: `${task.title} · ${task.category}`,
      meta: formatTaskAge(task),
      tone: 'active',
    })
  } else {
    feed.push({
      id: 'sample-upcoming',
      title: 'Tarea aceptada',
      subtitle: 'Montaje mueble · Barrio oeste',
      meta: 'Mañana · 10:30',
      tone: 'active',
    })
  }

  if (chats.length > 0) {
    const chat = chats[0]
    const chatName = chat.other_user?.display_name || chat.other_user?.full_name || chat.other_user?.username || 'Conversación'
    feed.push({
      id: `chat-${chat.id}`,
      title: 'Mensaje reciente',
      subtitle: `${chatName} · ${chat.latest_message?.content || 'Sin mensaje reciente'}`,
      meta: chat.last_message_at ? formatTaskAge({ created_at: chat.last_message_at }) : 'Hace poco',
      tone: 'neutral',
    })
  } else {
    feed.push({
      id: 'sample-chat',
      title: 'Mensaje reciente',
      subtitle: 'Marta · ¿Podrías llegar antes de las 18:00?',
      meta: 'Hace 22 min',
      tone: 'neutral',
    })
  }

  if (activityTasks.some((task) => ['completed', 'closed'].includes(task.status))) {
    const completedTask = activityTasks.find((task) => ['completed', 'closed'].includes(task.status))
    feed.push({
      id: `completed-${completedTask.id}`,
      title: 'Ayuda completada',
      subtitle: `${completedTask.title} · ${completedTask.category}`,
      meta: formatTaskAge(completedTask),
      tone: 'done',
    })
  } else {
    feed.push({
      id: 'sample-completed',
      title: 'Ayuda completada',
      subtitle: 'Compra urgente · Recados',
      meta: 'Ayer · 19:40',
      tone: 'done',
    })
  }

  if (selectedOpportunity) {
    feed.push({
      id: `selected-${selectedOpportunity.task.id}`,
      title: 'Oportunidad en revisión',
      subtitle: `${selectedOpportunity.task.title} · ${selectedOpportunity.compatibilityScore}% match`,
      meta: selectedOpportunity.urgencyLabel,
      tone: 'neutral',
    })
  } else {
    feed.push({
      id: 'sample-selection',
      title: 'Oportunidad en revisión',
      subtitle: 'Babysitting · 94% match',
      meta: 'Hoy 18:00',
      tone: 'neutral',
    })
  }

  return feed.slice(0, 4)
}

function buildPerformanceCards({ profile, helperTasks, openTaskCount, compatibilityAverage }) {
  const responseScore = getResponseScore(profile)
  const acceptanceRate = getAcceptanceRate(helperTasks)
  const completionAverage = getAverageCompletion(helperTasks)
  const trustScore = getTrustScore(profile)

  return [
    {
      label: 'Response rate',
      value: `${responseScore}%`,
      meta: '+12% últimos 7 días',
    },
    {
      label: 'Acceptance rate',
      value: `${acceptanceRate}%`,
      meta: 'comparativa semanal',
    },
    {
      label: 'Average completion',
      value: completionAverage,
      meta: 'últimos 30 días',
    },
    {
      label: 'Trust score',
      value: `${trustScore}%`,
      meta: `${openTaskCount} oportunidades cercanas`,
    },
    {
      label: 'Match medio',
      value: `${compatibilityAverage}%`,
      meta: 'tareas abiertas',
    },
    {
      label: 'Respuesta',
      value: formatResponseTime(profile?.response_time_minutes),
      meta: 'velocidad percibida',
    },
  ]
}

function buildProfileSuggestions({ profile, radiusKm, skillTokens }) {
  const suggestions = []

  if (profile?.availability_enabled === false) {
    suggestions.push('Completar disponibilidad nocturna podría aumentar coincidencias +14%')
  } else {
    suggestions.push('Mantener disponibilidad activa mejora el flujo de oportunidades')
  }

  if (skillTokens.length < 3) {
    suggestions.push('Añadir 2 skills elevaría tu match estimado +11%')
  } else {
    suggestions.push('Tus skills actuales ya cubren varias categorías cercanas')
  }

  if (radiusKm < 15) {
    suggestions.push('Amplía tu radio a 15 km para desbloquear más coincidencias')
  } else {
    suggestions.push('Tu radio ya prioriza cercanía y velocidad de decisión')
  }

  if (profile?.show_approx_location === false) {
    suggestions.push('Mostrar zona aproximada puede subir respuestas +8%')
  } else {
    suggestions.push('Tu zona aproximada ya ayuda a contextualizar mejor las solicitudes')
  }

  return suggestions.slice(0, 4)
}

function getInfoPillClassName(tone) {
  const toneClass = {
    urgent: styles.infoPillUrgent,
    match: styles.infoPillMatch,
    verified: styles.infoPillVerified,
  }[tone]

  return [styles.infoPill, toneClass].filter(Boolean).join(' ')
}

function getTimelineToneClassName(tone) {
  if (tone === 'active') return styles.timelineDotActive
  if (tone === 'done') return styles.timelineDotDone
  return ''
}

function OpportunityRow({ item, selected, onSelect }) {
  const { task, distance, compatibilityScore, urgencyLabel, estimatedEarnings, trustLabel, urgencyTone, verified } = item
  const isUrgent = urgencyTone === 'urgent' || urgencyTone === 'urgente' || urgencyLabel === 'Ahora'
  const isHighMatch = Number(compatibilityScore) >= 90
  const isVerified = Boolean(verified ?? task.creator_profile?.verified)

  return (
    <button
      type="button"
      className={selected ? styles.opportunityRowActive : styles.opportunityRow}
      onClick={() => onSelect(task.id)}
      aria-pressed={selected}
    >
      <div className={styles.opportunityRowTop}>
        <strong>{task.title}</strong>
        <span>{estimatedEarnings}</span>
      </div>
      <p className={styles.opportunityRowMeta}>
        {task.category} · {formatTaskLocation(task)}
      </p>
      <div className={styles.opportunityRowFooter}>
        <span className={styles.infoPill}>{Number.isFinite(Number(distance)) ? `${distance} km` : 'Sin distancia'}</span>
        <span className={getInfoPillClassName(isUrgent ? 'urgent' : null)}>{urgencyLabel}</span>
        <span className={getInfoPillClassName(isVerified ? 'verified' : null)}>{trustLabel}</span>
        <span className={getInfoPillClassName(isHighMatch ? 'match' : null)}>{compatibilityScore}% match</span>
      </div>
    </button>
  )
}

function TimelineItem({ title, subtitle, meta, tone = 'neutral' }) {
  return (
    <article className={styles.timelineItem}>
      <div className={styles.timelineDotWrap}>
        <span className={`${styles.timelineDot} ${getTimelineToneClassName(tone)}`} aria-hidden="true" />
      </div>
      <div className={styles.timelineCopy}>
        <strong>{title}</strong>
        <p>{subtitle}</p>
        {meta ? <span>{meta}</span> : null}
      </div>
    </article>
  )
}

function MetricCard({ label, value, meta }) {
  return (
    <article className={styles.metricCard}>
      <span className={styles.metricLabel}>{label}</span>
      <strong className={styles.metricValue}>{value}</strong>
      <span className={styles.metricMeta}>{meta}</span>
    </article>
  )
}

export default function HelperHome({ profile, helperHomeProps = {} }) {
  const navigate = useNavigate()
  const { upcomingTasks, activityTasks } = useHelperHomeData(profile?.id)
  const [activeTab, setActiveTab] = useState('opportunities')
  const [selectedTaskId, setSelectedTaskId] = useState(null)

  const profileName = getProfileName(profile)
  const profileLocation = getLocationLabel(profile)
  const helperStatusCopy = getHelperStatusCopy(profile)
  const center = buildCenter(helperHomeProps.location, profile)
  const radiusKm = Number.isFinite(Number(helperHomeProps.radiusKm))
    ? Number(helperHomeProps.radiusKm)
    : Number.isFinite(Number(helperHomeProps.radius))
      ? Number(helperHomeProps.radius)
      : Number(profile?.search_radius_km) || 10

  const skillTokens = useMemo(() => getSkillTokens(profile, helperHomeProps), [helperHomeProps, profile])

  const opportunityEntries = useMemo(
    () =>
      buildOpportunityEntries(
        helperHomeProps.visibleTasks || [],
        helperHomeProps.currentUserId,
        profile,
        radiusKm,
        skillTokens,
        center,
      ),
    [center, helperHomeProps.currentUserId, helperHomeProps.visibleTasks, profile, radiusKm, skillTokens],
  )

  const displaySkills = useMemo(() => getSkillTokens(profile, helperHomeProps), [helperHomeProps, profile])

  const opportunityDistances = useMemo(
    () =>
      opportunityEntries.reduce((acc, entry) => {
        if (Number.isFinite(Number(entry.distance))) {
          acc[entry.task.id] = entry.distance
        }
        return acc
      }, {}),
    [opportunityEntries],
  )

  const resolvedSelectedTaskId =
    opportunityEntries.length === 0
      ? null
      : opportunityEntries.some((entry) => entry.task.id === selectedTaskId)
        ? selectedTaskId
        : opportunityEntries[0].task.id

  const selectedOpportunity =
    opportunityEntries.find((entry) => entry.task.id === resolvedSelectedTaskId) || opportunityEntries[0] || null
  const selectedTask = selectedOpportunity?.task || null
  const selectedDistance = selectedOpportunity?.distance ?? null
  const selectedCompatibilityScore = selectedOpportunity?.compatibilityScore ?? 0
  const openTaskCount = opportunityEntries.length
  const compatibilityAverage = opportunityEntries.length
    ? Math.round(opportunityEntries.reduce((sum, entry) => sum + entry.compatibilityScore, 0) / opportunityEntries.length)
    : 0

  const recentChats = useMemo(
    () =>
      [...(helperHomeProps.chats || [])].sort(
        (left, right) =>
          new Date(right.last_message_at || right.created_at || 0).getTime() -
          new Date(left.last_message_at || left.created_at || 0).getTime(),
      ),
    [helperHomeProps.chats],
  )

  const activityFeed = useMemo(
    () =>
      buildActivityFeed({
        upcomingTasks,
        activityTasks,
        chats: recentChats,
        selectedOpportunity,
      }),
    [activityTasks, recentChats, selectedOpportunity, upcomingTasks],
  )

  const performanceCards = useMemo(
    () => buildPerformanceCards({ profile, helperTasks: activityTasks || [], openTaskCount, compatibilityAverage }),
    [activityTasks, compatibilityAverage, openTaskCount, profile],
  )

  const profileSuggestions = useMemo(
    () => buildProfileSuggestions({ profile, radiusKm, skillTokens }),
    [profile, radiusKm, skillTokens],
  )

  const recommendationChips = useMemo(() => {
    const chips = []

    if (profile?.availability_enabled === false) {
      chips.push('Ajusta disponibilidad')
    }

    if (radiusKm < 15) {
      chips.push('Amplía radio')
    }

    if (displaySkills.length < 3) {
      chips.push('Completa skill faltante')
    }

    if (profile?.availability_enabled !== false && opportunityEntries.length > 0) {
      chips.push('Mejora compatibilidad')
    }

    return [...new Set(chips)].slice(0, 4)
  }, [displaySkills.length, opportunityEntries.length, profile?.availability_enabled, radiusKm])

  const mapTasks = opportunityEntries.map((entry) => entry.task)
  const canContact = Boolean(selectedTask && selectedTask.status === 'open' && selectedTask.created_by !== helperHomeProps.currentUserId)

  async function handleContact(task) {
    if (!task || task.status !== 'open' || task.created_by === helperHomeProps.currentUserId) {
      return
    }

    try {
      const conversationId = await createOrGetDirectConversation(task.created_by)
      navigate(`/chat/${conversationId}`)
    } catch (error) {
      console.error('[HelperHome] could not open contact chat', error)
    }
  }

  function handleOpenTask(task) {
    navigate(`/task/${task.id}`)
  }

  function handleOpenMapForTask(task) {
    setSelectedTaskId(task.id)
    setActiveTab('map')
  }

  function handleOpenSettings() {
    if (helperHomeProps.onOpenSettings) {
      helperHomeProps.onOpenSettings()
      return
    }

    navigate('/settings')
  }

  const selectedTaskDetails = selectedTask
    ? [
        {
          label: 'Compatibilidad',
          value: `${selectedCompatibilityScore}%`,
          meta: selectedCompatibilityScore >= 90 ? 'muy alta' : 'revisar',
        },
        {
          label: 'Earnings',
          value: `${Number(selectedTask.price ?? 0)} EUR`,
          meta: 'estimado',
        },
        {
          label: 'Urgencia',
          value: selectedOpportunity?.urgencyLabel || formatTaskAge(selectedTask),
          meta: 'decisión rápida',
        },
        {
          label: 'Confianza',
          value: selectedOpportunity?.trustLabel || `${Number(selectedTask.creator_profile?.rating ?? 0).toFixed(1)}/5`,
          meta: selectedTask.creator_profile?.verified ? 'verificado' : 'pendiente',
        },
      ]
    : []

  return (
    <section className={styles.home}>
      <HelperStatusHero
        profile={profile}
        openTaskCount={openTaskCount}
        radiusKm={radiusKm}
        compatibilityScore={compatibilityAverage}
        onToggleAvailability={handleOpenSettings}
      />

      <nav className={styles.tabs} role="tablist" aria-label="Secciones del helper home">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={isActive ? styles.tabActive : styles.tab}
              onClick={() => setActiveTab(tab.id)}
            >
              {isActive ? <span className={styles.tabIndicator} aria-hidden="true" /> : null}
              <span className={styles.tabLabel}>{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {activeTab === 'opportunities' ? (
        <section className={styles.opportunityWorkspace} aria-label="Oportunidades">
          <aside className={styles.columnPanel}>
            <div className={styles.paneHeader}>
              <div>
                <p className="eyebrow">Solicitudes abiertas</p>
                <h3>Oportunidades compatibles</h3>
                <p className="muted">Selecciona una solicitud para decidir más rápido.</p>
              </div>
            </div>

            <div className={styles.filtersBar}>
              <div className={styles.filtersInner}>
                <CategoryFilter
                  category={helperHomeProps.category}
                  onChange={helperHomeProps.onCategoryChange}
                  options={helperHomeProps.categories || []}
                />
                <RadiusFilter
                  radius={helperHomeProps.radius}
                  onChange={helperHomeProps.onRadiusChange}
                  options={helperHomeProps.radiusOptions || []}
                />
              </div>
              <div className={styles.filtersCount}>
                <strong>{openTaskCount} solicitudes</strong>
                <span>{compatibilityAverage}% match medio</span>
              </div>
            </div>

            <div className={styles.recommendationChips}>
              {recommendationChips.map((chip) => (
                <span key={chip} className={styles.recommendationChip}>
                  {chip}
                </span>
              ))}
            </div>

            <div className={styles.opportunityList}>
              {opportunityEntries.map((entry) => (
                <OpportunityRow
                  key={entry.task.id}
                  item={entry}
                  selected={resolvedSelectedTaskId === entry.task.id}
                  onSelect={setSelectedTaskId}
                />
              ))}
            </div>
          </aside>

          <section className={`${styles.columnPanel} ${styles.selectedRequestPanel}`}>
            <div className={styles.paneHeader}>
              <div>
                <p className="eyebrow">Detalle</p>
                <h3>Solicitud seleccionada</h3>
                <p className="muted">{selectedTask ? helperStatusCopy : 'Toca una tarea para cargar su detalle.'}</p>
              </div>
            </div>

            {selectedTask ? (
              <>
                <div className={styles.profileSummaryList}>
                  {selectedTaskDetails.map((item) => (
                    <div key={item.label}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>

                <div key={selectedTask.id} className={styles.selectionShell}>
                  <TaskCard
                    task={selectedTask}
                    distanceKm={selectedDistance}
                    showDistance
                    expanded
                    primaryActionLabel="Contactar"
                    primaryActionVariant="primary"
                    primaryActionDisabled={!canContact}
                    onPrimaryAction={() => handleContact(selectedTask)}
                    secondaryActionLabel="Ver solicitud"
                    secondaryActionVariant="secondary"
                    onSecondaryAction={() => handleOpenTask(selectedTask)}
                    helperActions={[
                      {
                        label: 'Ver en mapa',
                        variant: 'secondary',
                        onClick: () => handleOpenMapForTask(selectedTask),
                      },
                    ]}
                  />
                </div>
              </>
            ) : (
              <div className={styles.profileCard}>
                <strong>Babysitting · 94% match</strong>
                <p>2.1 km · Hoy 18:00 · 18 EUR</p>
                <span>Selecciona una tarea para ver decisión rápida.</span>
              </div>
            )}
          </section>

          <aside className={`${styles.columnPanel} ${styles.decisionPanel}`}>
            <div className={styles.paneHeader}>
              <div>
                <p className="eyebrow">Decisión</p>
                <h3>Inteligencia rápida</h3>
              </div>
            </div>

            {selectedTask ? (
              <div className={styles.intelligenceStack}>
                <article className={styles.intelligenceHero}>
                  <span className={styles.intelligenceScore}>{selectedCompatibilityScore}%</span>
                  <strong>{selectedCompatibilityScore >= 90 ? 'Alta compatibilidad' : selectedCompatibilityScore >= 75 ? 'Buena compatibilidad' : 'Match a revisar'}</strong>
                  <p>
                    {formatTaskLocation(selectedTask)} · {selectedOpportunity?.urgencyLabel || formatTaskAge(selectedTask)}
                  </p>
                </article>

                <div className={styles.intelligenceList}>
                  <div className={styles.intelligenceItem}>
                    <span>Estado</span>
                    <strong>{selectedTask.status === 'open' ? 'Abierta y disponible' : selectedTask.status}</strong>
                  </div>
                  <div className={styles.intelligenceItem}>
                    <span>Ganancia</span>
                    <strong>{selectedOpportunity?.estimatedEarnings || `${Number(selectedTask.price ?? 0)} EUR`}</strong>
                  </div>
                  <div className={styles.intelligenceItem}>
                    <span>Confianza</span>
                    <strong>{selectedOpportunity?.trustLabel || `${Number(selectedTask.creator_profile?.rating ?? 0).toFixed(1)} confianza`}</strong>
                  </div>
                  <div className={styles.intelligenceItem}>
                    <span>Recomendación</span>
                    <strong>{canContact ? 'Contactar ahora' : 'Abrir detalle'}</strong>
                  </div>
                </div>

                <div className={styles.recommendationChips}>
                  {recommendationChips.map((chip) => (
                    <span key={chip} className={styles.recommendationChip}>
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className={styles.profileCard}>
                <strong>Babysitting · 94% match</strong>
                <p>18 EUR · Hoy 18:00 · 4.9 confianza</p>
                <span>La tarjeta de inteligencia siempre muestra una oportunidad viva.</span>
              </div>
            )}
          </aside>
        </section>
      ) : null}

      {activeTab === 'map' ? (
        <section className={styles.mapWorkspace} aria-label="Mapa de oportunidades">
          <div className={styles.mapPane}>
            <div className={styles.paneHeader}>
              <div>
                <p className="eyebrow">Mapa</p>
                <h3>Solicitudes activas cerca de ti</h3>
                <p className="muted">El mapa ayuda a descubrir tareas; el panel guía la decisión.</p>
              </div>
            </div>

            <TaskMap
              tasks={mapTasks}
              userLocation={center}
              radiusKm={radiusKm}
              distances={opportunityDistances}
              userAvatarUrl={helperHomeProps.userAvatarUrl}
              userInitial={helperHomeProps.userInitial}
              onTaskSelect={(taskId) => {
                const nextTask = opportunityEntries.find((entry) => entry.task.id === taskId)
                if (nextTask) {
                  setSelectedTaskId(nextTask.task.id)
                }
              }}
            />
          </div>

          <aside className={styles.mapDrawer}>
            <section className={styles.columnPanel}>
              <div className={styles.paneHeader}>
                <div>
                  <p className="eyebrow">Detalle</p>
                  <h3>Solicitud activa</h3>
                </div>
              </div>

              {selectedTask ? (
                <>
                  <div className={styles.profileSummaryList}>
                    {selectedTaskDetails.map((item) => (
                      <div key={item.label}>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>

                  <div key={selectedTask.id} className={styles.selectionShell}>
                    <TaskCard
                      task={selectedTask}
                      distanceKm={selectedDistance}
                      showDistance
                      expanded
                      primaryActionLabel="Ver solicitud"
                      primaryActionVariant="primary"
                      onPrimaryAction={() => handleOpenTask(selectedTask)}
                      secondaryActionLabel="Contactar"
                      secondaryActionVariant="secondary"
                      secondaryActionDisabled={!canContact}
                      onSecondaryAction={() => handleContact(selectedTask)}
                    />
                  </div>
                </>
              ) : (
                <div className={styles.profileCard}>
                  <strong>Compra urgente · 96% match</strong>
                  <p>1.2 km · Ahora · 12 EUR</p>
                  <span>Selecciona un marker para cargar su detalle.</span>
                </div>
              )}
            </section>

            <section className={styles.columnPanel}>
              <div className={styles.paneHeader}>
                <div>
                  <p className="eyebrow">Contexto</p>
                  <h3>Filtro actual</h3>
                </div>
              </div>

              <div className={styles.profileSummaryList}>
                <div>
                  <span>Radio</span>
                  <strong>{radiusKm} km</strong>
                </div>
                <div>
                  <span>Oportunidades</span>
                  <strong>{openTaskCount}</strong>
                </div>
                <div>
                  <span>Compatibilidad media</span>
                  <strong>{compatibilityAverage}%</strong>
                </div>
                <div>
                  <span>Destino</span>
                  <strong>{center.label}</strong>
                </div>
              </div>
            </section>
          </aside>
        </section>
      ) : null}

      {activeTab === 'activity' ? (
        <section className={styles.activityWorkspace} aria-label="Actividad">
          <div className={styles.columnPanel}>
            <div className={styles.paneHeader}>
              <div>
                <p className="eyebrow">Actividad</p>
                <h3>Timeline operativa</h3>
                <p className="muted">Aceptado, mensaje, completado y siguiente oportunidad.</p>
              </div>
            </div>

            <div className={styles.timeline}>
              {activityFeed.map((item) => (
                <TimelineItem key={item.id} title={item.title} subtitle={item.subtitle} meta={item.meta} tone={item.tone} />
              ))}
            </div>
          </div>

          <div className={styles.sideStack}>
            <section className={styles.columnPanel}>
              <div className={styles.paneHeader}>
                <div>
                  <p className="eyebrow">Mensajes</p>
                  <h3>Conversación reciente</h3>
                </div>
              </div>

              <div className={styles.profileCard}>
                <strong>{recentChats[0]?.other_user?.display_name || 'Marta'}</strong>
                <p>{recentChats[0]?.latest_message?.content || '¿Podrías llegar antes de las 18:00?'}</p>
                <span>{recentChats[0]?.last_message_at ? formatTaskAge({ created_at: recentChats[0].last_message_at }) : 'Hace 22 min'}</span>
              </div>
            </section>

            <section className={styles.columnPanel}>
              <div className={styles.paneHeader}>
                <div>
                  <p className="eyebrow">Siguiente</p>
                  <h3>Próxima tarea</h3>
                </div>
              </div>

              <div className={styles.profileCard}>
                <strong>{upcomingTasks[0]?.title || 'Montaje mueble'}</strong>
                <p>{upcomingTasks[0]?.category || 'Hogar'} · {upcomingTasks[0] ? formatTaskLocation(upcomingTasks[0]) : 'Barrio oeste'}</p>
                <span>{upcomingTasks[0] ? formatTaskAge(upcomingTasks[0]) : 'Mañana · 10:30'}</span>
              </div>
            </section>
          </div>
        </section>
      ) : null}

      {activeTab === 'performance' ? (
        <section className={styles.performanceWorkspace} aria-label="Rendimiento">
          <div className={styles.performanceGrid}>
            {performanceCards.map((card) => (
              <MetricCard key={card.label} label={card.label} value={card.value} meta={card.meta} />
            ))}
          </div>

          <div className={styles.sideStack}>
            <section className={styles.columnPanel}>
              <div className={styles.paneHeader}>
                <div>
                  <p className="eyebrow">Lectura rápida</p>
                  <h3>Qué está empujando actividad</h3>
                </div>
              </div>

              <div className={styles.profileSummaryList}>
                <div>
                  <span>Solicitudes cercanas</span>
                  <strong>{openTaskCount}</strong>
                </div>
                <div>
                  <span>Match medio</span>
                  <strong>{compatibilityAverage}%</strong>
                </div>
                <div>
                  <span>Verificaciones</span>
                  <strong>{getVerificationCount(profile)}</strong>
                </div>
                <div>
                  <span>Tarifa</span>
                  <strong>{formatHourlyRate(profile?.hourly_rate)}</strong>
                </div>
              </div>
            </section>

            <section className={styles.columnPanel}>
              <div className={styles.paneHeader}>
                <div>
                  <p className="eyebrow">Tendencia</p>
                  <h3>Comparativa semanal</h3>
                </div>
              </div>

              <div className={styles.recommendationChips}>
                <span className={styles.recommendationChip}>+12% últimos 7 días</span>
                <span className={styles.recommendationChip}>4 coincidencias nuevas</span>
                <span className={styles.recommendationChip}>2 tareas en revisión</span>
                <span className={styles.recommendationChip}>1 contacto pendiente</span>
              </div>
            </section>
          </div>
        </section>
      ) : null}

      {activeTab === 'profile' ? (
        <section className={styles.profileWorkspace} aria-label="Perfil">
          <div className={styles.profileGrid}>
            <article className={styles.profileCard}>
              <strong>Disponibilidad</strong>
              <p>{profile?.availability_enabled === false ? 'Disponibilidad pausada' : 'Disponible para recibir solicitudes'}</p>
              <span>{profile?.availability_enabled === false ? 'Completar disponibilidad nocturna podría aumentar coincidencias +14%' : `Radio actual: ${radiusKm} km`}</span>
            </article>

            <article className={styles.profileCard}>
              <strong>Skills</strong>
              <div className={styles.chipList}>
                {displaySkills.slice(0, 6).map((skill) => (
                  <span key={skill.id || skill.name || skill.category} className={styles.chip}>
                    {skill.name || skill.category}
                  </span>
                ))}
              </div>
              <span>{displaySkills.length < 3 ? 'Añadir 2 skills elevaría tu match estimado +11%' : 'Tus skills actuales ya cubren varias categorías'}</span>
            </article>

            <article className={styles.profileCard}>
              <strong>Verificaciones</strong>
              <p>{getVerificationCount(profile) > 0 ? `${getVerificationCount(profile)} señales activas de confianza` : 'Verificaciones pendientes'}</p>
              <span>{profile?.verified ? 'Perfil verificado' : 'Refuerza tu confianza pública'}</span>
            </article>

            <article className={styles.profileCard}>
              <strong>Perfil público</strong>
              <p>
                {profileName} · {profileLocation}
              </p>
              <span>{helperStatusCopy}</span>
            </article>
          </div>

          <div className={styles.sideStack}>
            <section className={styles.columnPanel}>
              <div className={styles.paneHeader}>
                <div>
                  <p className="eyebrow">Optimización</p>
                  <h3>Acciones que suben visibilidad</h3>
                </div>
              </div>

              <div className={styles.profileActionStack}>
                <button type="button" className="primary-action" onClick={handleOpenSettings}>
                  Ajustar disponibilidad
                </button>
                <button type="button" className="secondary-action" onClick={() => navigate('/profile')}>
                  Ver perfil
                </button>
                <button type="button" className="secondary-action" onClick={() => navigate('/settings')}>
                  Completar datos
                </button>
              </div>
            </section>

            <section className={styles.columnPanel}>
              <div className={styles.paneHeader}>
                <div>
                  <p className="eyebrow">Sugerencias</p>
                  <h3>Qué conviene mejorar ahora</h3>
                </div>
              </div>

              <div className={styles.timeline}>
                {profileSuggestions.map((suggestion, index) => (
                  <TimelineItem
                    key={suggestion}
                    title={`Recomendación ${index + 1}`}
                    subtitle={suggestion}
                    meta={index === 0 ? 'prioridad alta' : 'siguiente paso'}
                    tone={index === 0 ? 'active' : 'neutral'}
                  />
                ))}
              </div>
            </section>
          </div>
        </section>
      ) : null}
    </section>
  )
}
