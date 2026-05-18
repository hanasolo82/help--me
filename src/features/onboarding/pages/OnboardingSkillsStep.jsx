import { Navigate, useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuth } from '../../../contexts/useAuth'
import { getSkillsCatalog } from '../../profile/api/profileApi'
import { replaceProfileSkills } from '../api/onboardingApi'
import { useOnboardingOutlet } from '../hooks/useOnboardingOutlet'
import OnboardingFrame from '../components/OnboardingFrame'
import SkillBadge from '../../skills/components/SkillBadge'
import styles from '../styles/onboarding.module.css'

const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Inicial' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avanzado' },
  { value: 'expert', label: 'Experto' },
]

export default function OnboardingSkillsStep() {
  const navigate = useNavigate()
  const { profile, refreshProfile } = useAuth()
  const { draft, setDraft } = useOnboardingOutlet()
  const profileId = profile?.id

  const skillsQuery = useQuery({
    queryKey: ['skills-catalog'],
    queryFn: getSkillsCatalog,
    staleTime: 5 * 60 * 1000,
  })

  const mutation = useMutation({
    mutationFn: (rows) => replaceProfileSkills(profileId, rows),
    onSuccess: async (_data, rows) => {
      setDraft((current) => ({
        ...current,
        selectedSkillRows: rows,
      }))
      await refreshProfile()
      navigate('/onboarding/location')
    },
  })

  const selectedSkillIds = useMemo(
    () => new Set((draft.selectedSkillRows ?? []).map((row) => row.skill_id)),
    [draft.selectedSkillRows],
  )

  if (!profileId) {
    return <Navigate to="/onboarding" replace />
  }

  function toggleSkill(skill) {
    setDraft((current) => {
      const exists = (current.selectedSkillRows ?? []).some((row) => row.skill_id === skill.id)

      if (exists) {
        return {
          ...current,
          selectedSkillRows: current.selectedSkillRows.filter((row) => row.skill_id !== skill.id),
        }
      }

      return {
        ...current,
        selectedSkillRows: [
          ...(current.selectedSkillRows ?? []),
          {
            skill_id: skill.id,
            experience_level: 'beginner',
            years_experience: 0,
          },
        ],
      }
    })
  }

  function updateSkillRow(skillId, field, value) {
    setDraft((current) => ({
      ...current,
      selectedSkillRows: current.selectedSkillRows.map((row) =>
        row.skill_id === skillId
          ? {
              ...row,
              [field]: field === 'years_experience' ? Number(value) : value,
            }
          : row,
      ),
    }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    mutation.mutate(draft.selectedSkillRows ?? [])
  }

  return (
    <OnboardingFrame
      title="Elige tus skills"
      lead="Mostramos experiencia real para que el perfil se sienta más confiable y útil."
      footer={<p className={styles.smallNote}>Estos datos alimentan filtros, mapa y perfil público.</p>}
    >
      <form className={styles.stepBody} onSubmit={handleSubmit}>
        {skillsQuery.isPending ? (
          <p className="muted">Cargando skills...</p>
        ) : (
          <div className={styles.skillsList}>
            {(skillsQuery.data ?? []).map((skill) => {
              const selectedRow = (draft.selectedSkillRows ?? []).find((row) => row.skill_id === skill.id)
              const isSelected = selectedSkillIds.has(skill.id)

              return (
                <article key={skill.id} className={styles.skillRow}>
                  <div className={styles.skillMeta}>
                    <SkillBadge skill={skill} active={isSelected} onClick={() => toggleSkill(skill)} />
                    <span className="muted">{skill.category}</span>
                  </div>

                  {isSelected ? (
                    <div className={styles.split}>
                      <label className="field">
                        <span>Nivel</span>
                        <select
                          value={selectedRow?.experience_level || 'beginner'}
                          onChange={(event) => updateSkillRow(skill.id, 'experience_level', event.target.value)}
                        >
                          {EXPERIENCE_LEVELS.map((level) => (
                            <option key={level.value} value={level.value}>
                              {level.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="field">
                        <span>Años de experiencia</span>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={selectedRow?.years_experience ?? 0}
                          onChange={(event) => updateSkillRow(skill.id, 'years_experience', event.target.value)}
                        />
                      </label>
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        )}

        <div className={styles.actions}>
          <button type="button" className="secondary-action" onClick={() => navigate('/onboarding')}>
            Volver
          </button>
          <button className="primary-action" disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando...' : 'Continuar'}
          </button>
        </div>
      </form>
    </OnboardingFrame>
  )
}
