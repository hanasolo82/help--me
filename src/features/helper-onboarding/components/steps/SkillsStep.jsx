import { useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../../../contexts/useAuth'
import StepFrame from './StepFrame'
import styles from './SkillsStep.module.css'
import { getActiveSkills, replaceProfileSkills } from '../../services/helperSkillsService'
import { helperOnboardingKeys } from '../../utils/helperOnboardingKeys'

const MAX_SKILLS = 6

function updateJourneyDraft(setJourneyDraft, patch) {
  if (typeof setJourneyDraft !== 'function') return

  setJourneyDraft((current) => ({
    ...current,
    ...patch,
  }))
}

function buildCategoryOptions(skills = []) {
  const categories = []

  for (const skill of skills) {
    if (!skill?.category || categories.includes(skill.category)) continue
    categories.push(skill.category)
  }

  return categories
}

export default function SkillsStep({ onNext, onBack, journeyDraft, setJourneyDraft }) {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const profileId = profile?.id
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [selectedSkillIds, setSelectedSkillIds] = useState(() =>
    Array.isArray(journeyDraft?.selectedSkillIds) ? journeyDraft.selectedSkillIds.slice(0, MAX_SKILLS) : [],
  )
  const [feedback, setFeedback] = useState('')

  const skillsQuery = useQuery({
    queryKey: ['helper-skills', 'active'],
    queryFn: getActiveSkills,
    staleTime: 5 * 60 * 1000,
  })

  const mutation = useMutation({
    mutationFn: (skillIds) => replaceProfileSkills(profileId, skillIds),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: helperOnboardingKeys.skills(profileId) })
    },
  })

  const skills = useMemo(() => skillsQuery.data ?? [], [skillsQuery.data])
  const categories = useMemo(() => buildCategoryOptions(skills), [skills])
  const selectedCount = selectedSkillIds.length
  const selectedIdsSet = useMemo(() => new Set(selectedSkillIds), [selectedSkillIds])
  const primarySkillId = selectedSkillIds[0] ?? null

  const filteredSkills = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return skills.filter((skill) => {
      const matchesCategory = activeCategory === 'all' || skill.category === activeCategory
      const matchesSearch =
        !normalizedSearch ||
        skill.name.toLowerCase().includes(normalizedSearch) ||
        skill.category.toLowerCase().includes(normalizedSearch)

      return matchesCategory && matchesSearch
    })
  }, [activeCategory, searchTerm, skills])

  const groupedSkills = useMemo(() => {
    const map = new Map()

    for (const skill of filteredSkills) {
      const current = map.get(skill.category) ?? []
      current.push(skill)
      map.set(skill.category, current)
    }

    return Array.from(map.entries()).map(([category, items]) => ({
      category,
      items,
    }))
  }, [filteredSkills])

  const selectedSkills = useMemo(
    () => skills.filter((skill) => selectedIdsSet.has(skill.id)),
    [selectedIdsSet, skills],
  )

  useEffect(() => {
    if (!Array.isArray(journeyDraft?.selectedSkillIds) || journeyDraft.selectedSkillIds.length === 0) {
      return
    }

    setSelectedSkillIds((current) => {
      if (current.length > 0) return current
      return journeyDraft.selectedSkillIds.slice(0, MAX_SKILLS)
    })
  }, [journeyDraft?.selectedSkillIds])

  if (!profileId) {
    return <Navigate to="/onboarding" replace />
  }

  function persistSelection(nextSelection) {
    setSelectedSkillIds(nextSelection)
    updateJourneyDraft(setJourneyDraft, {
      selectedSkillIds: nextSelection,
    })
  }

  function toggleSkill(skill) {
    setFeedback('')

    if (selectedIdsSet.has(skill.id)) {
      const nextSelection = selectedSkillIds.filter((skillId) => skillId !== skill.id)
      persistSelection(nextSelection)
      return
    }

    if (selectedSkillIds.length >= MAX_SKILLS) {
      setFeedback('Puedes elegir hasta 6 habilidades.')
      return
    }

    persistSelection([...selectedSkillIds, skill.id])
  }

  async function handleContinue(event) {
    event.preventDefault()

    if (selectedSkillIds.length === 0) {
      setFeedback('Selecciona al menos una habilidad para continuar.')
      return
    }

    setFeedback('')

    try {
      await mutation.mutateAsync(selectedSkillIds)
      updateJourneyDraft(setJourneyDraft, {
        selectedSkillIds,
        primarySkillId,
      })
      onNext?.()
    } catch (error) {
      setFeedback(error?.message || 'No pudimos guardar tus habilidades ahora mismo.')
    }
  }

  return (
    <StepFrame
      kicker="Habilidades"
      title="Elige en qué puedes ayudar"
      lead="Selecciona las habilidades que mejor representan los servicios que puedes ofrecer. Las usaremos para mostrarte solicitudes relevantes y generar confianza en tu perfil."
      footer={
        <p className="muted">
          Puedes cambiarlas más adelante desde tu perfil. Te recomendamos elegir entre 3 y 6 habilidades
          principales.
        </p>
      }
      actions={
        <>
          <button type="button" className="secondary-action" onClick={onBack}>
            Atrás
          </button>
          <button
            type="button"
            className="primary-action"
            onClick={handleContinue}
            disabled={selectedSkillIds.length === 0 || mutation.isPending || skillsQuery.isPending}
          >
            {mutation.isPending ? 'Guardando...' : 'Continuar'}
          </button>
        </>
      }
    >
      <div className={styles.shell}>
        <section className={styles.summaryCard} aria-label="Resumen de habilidades seleccionadas">
          <div className={styles.summaryTop}>
            <div>
              <p className={styles.sectionKicker}>Selección</p>
              <h3>{selectedCount}/6 habilidades</h3>
            </div>

            <span className={styles.softPill}>{selectedCount === 0 ? 'Elige 1 mínimo' : 'Recomendadas 3-6'}</span>
          </div>

          <p className={styles.summaryText}>
            La primera habilidad seleccionada será la principal para tu perfil.
          </p>

          {selectedSkills.length > 0 ? (
            <div className={styles.selectedRow}>
              {selectedSkills.map((skill, index) => (
                <button
                  key={skill.id}
                  type="button"
                  className={`${styles.selectedChip} ${index === 0 ? styles.isPrimary : ''}`.trim()}
                  onClick={() => toggleSkill(skill)}
                  aria-label={`Quitar ${skill.name}`}
                >
                  <span className={styles.selectedChipContent}>
                    {skill.icon ? <span aria-hidden="true">{skill.icon}</span> : null}
                    <span>{skill.name}</span>
                  </span>
                  {index === 0 ? <span className={styles.primaryFlag}>Principal</span> : <span aria-hidden="true">×</span>}
                </button>
              ))}
            </div>
          ) : (
            <p className={styles.emptySelected}>Aún no has seleccionado ninguna habilidad.</p>
          )}
        </section>

        <div className={styles.toolbar}>
          <label className={styles.searchField}>
            <span className="muted">Buscar habilidades</span>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Ej. montaje de muebles, móvil, acompañamiento..."
            />
          </label>
        </div>

        <div className={styles.categoryChips} aria-label="Filtrar por categoría">
          <button
            type="button"
            className={`${styles.categoryChip} ${activeCategory === 'all' ? styles.categoryChipActive : ''}`.trim()}
            onClick={() => setActiveCategory('all')}
          >
            Todas
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={`${styles.categoryChip} ${activeCategory === category ? styles.categoryChipActive : ''}`.trim()}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        {skillsQuery.isError ? (
          <div className={styles.emptyState}>
            <p>No pudimos cargar tus habilidades activas ahora mismo.</p>
            <button type="button" className="secondary-action" onClick={() => skillsQuery.refetch()}>
              Reintentar
            </button>
          </div>
        ) : skillsQuery.isPending ? (
          <div className={styles.loadingState} aria-live="polite">
            <p>Cargando habilidades activas...</p>
          </div>
        ) : groupedSkills.length > 0 ? (
          <div className={styles.groups}>
            {groupedSkills.map((group) => (
              <section key={group.category} className={styles.group}>
                <div className={styles.groupHeader}>
                  <h4>{group.category}</h4>
                  <span>{group.items.length}</span>
                </div>

                <div className={styles.badgeGrid}>
                  {group.items.map((skill) => {
                    const isSelected = selectedIdsSet.has(skill.id)
                    const isPrimary = primarySkillId === skill.id

                    return (
                      <button
                        key={skill.id}
                        type="button"
                        className={`${styles.skillBadge} ${isSelected ? styles.skillBadgeSelected : ''} ${
                          isPrimary ? styles.skillBadgePrimary : ''
                        }`.trim()}
                        onClick={() => toggleSkill(skill)}
                        aria-pressed={isSelected}
                        aria-label={`${isSelected ? 'Quitar' : 'Añadir'} ${skill.name}`}
                      >
                        <span className={styles.skillBadgeContent}>
                          {skill.icon ? <span aria-hidden="true">{skill.icon}</span> : null}
                          <span>{skill.name}</span>
                        </span>
                        {isPrimary ? <span className={styles.primaryBadge}>Principal</span> : null}
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>No hay habilidades que coincidan con tu búsqueda.</p>
            <button type="button" className="secondary-action" onClick={() => setSearchTerm('')}>
              Limpiar búsqueda
            </button>
          </div>
        )}

        <p className={styles.feedback} aria-live="polite">
          {feedback || 'Puedes elegir hasta 6 habilidades. La primera será la principal en tu perfil.'}
        </p>
      </div>
    </StepFrame>
  )
}
