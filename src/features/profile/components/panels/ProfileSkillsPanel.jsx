import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, X } from 'lucide-react'
import ProfileContentSection from '../ProfileContentSection'
import styles from '../../styles/profilePublicView.module.css'
import { useSkillsCatalog } from '../../../skills/hooks/useSkillsCatalog'
import { MAX_SKILLS, replaceOwnSkillsOrdered } from '../../api/profileEditApi'

function toSkillItem(entry) {
  const skill = entry?.skill || entry
  if (!skill?.id) return null

  return {
    id: skill.id,
    name: skill.name || 'Habilidad',
    icon: skill.icon || '',
    category: skill.category || '',
  }
}

function moveItem(list, index, direction) {
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= list.length) return list

  const next = [...list]
  const [item] = next.splice(index, 1)
  next.splice(nextIndex, 0, item)
  return next
}

// Lista ordenada por prioridad (la define el ayudante), en lugar de los chips
// con filtro: más fácil de escanear de un vistazo. En edición se puede añadir,
// quitar y reordenar (botones subir/bajar); el orden se persiste y el lector
// público lo devuelve tal cual.
export default function ProfileSkillsPanel({ profile, skills = [], isEditing = false }) {
  const queryClient = useQueryClient()
  const publishedItems = skills.map(toSkillItem).filter(Boolean)

  const [draftItems, setDraftItems] = useState(null)
  const isDirty = draftItems !== null
  const items = isDirty ? draftItems : publishedItems

  const catalogQuery = useSkillsCatalog()
  const catalog = catalogQuery.data ?? []
  const itemIds = new Set(items.map((item) => item.id))
  const addableSkills = catalog.filter((skill) => !itemIds.has(skill.id))

  const saveMutation = useMutation({
    mutationFn: (nextItems) => replaceOwnSkillsOrdered(profile?.id, nextItems.map((item) => item.id)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile-skills', profile?.id] })
      setDraftItems(null)
    },
  })

  function updateDraft(next) {
    setDraftItems(next)
  }

  function handleAdd(event) {
    const skillId = event.target.value
    event.target.value = ''
    if (!skillId) return

    const skill = catalog.find((entry) => entry.id === skillId)
    const item = toSkillItem(skill)
    if (!item || itemIds.has(item.id) || items.length >= MAX_SKILLS) return

    updateDraft([...items, item])
  }

  const lead = isEditing
    ? `Ordena tus habilidades por prioridad (máximo ${MAX_SKILLS}); la primera es tu especialidad principal.`
    : 'Ordenadas por prioridad: lo primero es en lo que más puede ayudar.'

  return (
    <ProfileContentSection
      id="habilidades"
      eyebrow="Habilidades"
      title="En qué puede ayudar"
      lead={lead}
    >
      {items.length > 0 ? (
        <ol className={styles.skillList} aria-label="Habilidades por orden de prioridad">
          {items.map((item, index) => (
            <li key={item.id} className={styles.skillItem}>
              <span className={styles.skillRank} aria-hidden="true">{index + 1}</span>
              {item.icon ? (
                <span className={styles.skillIcon} aria-hidden="true">{item.icon}</span>
              ) : null}
              <span className={styles.skillCopy}>
                <strong>{item.name}</strong>
                {item.category ? <small>{item.category}</small> : null}
              </span>

              {isEditing ? (
                <span className={styles.skillControls}>
                  <button
                    type="button"
                    className={styles.skillControl}
                    onClick={() => updateDraft(moveItem(items, index, -1))}
                    disabled={index === 0}
                    aria-label={`Subir ${item.name}`}
                    title="Subir"
                  >
                    <ArrowUp aria-hidden="true" strokeWidth={2.2} />
                  </button>
                  <button
                    type="button"
                    className={styles.skillControl}
                    onClick={() => updateDraft(moveItem(items, index, 1))}
                    disabled={index === items.length - 1}
                    aria-label={`Bajar ${item.name}`}
                    title="Bajar"
                  >
                    <ArrowDown aria-hidden="true" strokeWidth={2.2} />
                  </button>
                  <button
                    type="button"
                    className={`${styles.skillControl} ${styles.skillControlDanger}`}
                    onClick={() => updateDraft(items.filter((entry) => entry.id !== item.id))}
                    aria-label={`Quitar ${item.name}`}
                    title="Quitar"
                  >
                    <X aria-hidden="true" strokeWidth={2.2} />
                  </button>
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      ) : (
        <div className={styles.emptyState}>
          <strong>Aún no ha añadido habilidades.</strong>
          <p className="muted">El perfil público se irá enriqueciendo cuando el helper complete más datos.</p>
        </div>
      )}

      {isEditing ? (
        <div className={styles.editActions}>
          <label className={styles.skillAddField}>
            <span>Añadir habilidad</span>
            <select onChange={handleAdd} disabled={items.length >= MAX_SKILLS || catalogQuery.isPending} defaultValue="">
              <option value="" disabled>
                {items.length >= MAX_SKILLS
                  ? `Máximo ${MAX_SKILLS} habilidades`
                  : catalogQuery.isPending
                    ? 'Cargando catálogo…'
                    : 'Elige una habilidad…'}
              </option>
              {addableSkills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.icon ? `${skill.icon} ` : ''}{skill.name}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="primary-action"
            onClick={() => saveMutation.mutate(items)}
            disabled={!isDirty || saveMutation.isPending}
            aria-busy={saveMutation.isPending || undefined}
          >
            {saveMutation.isPending ? 'Guardando…' : 'Guardar habilidades'}
          </button>
          <button
            type="button"
            className="secondary-action"
            onClick={() => setDraftItems(null)}
            disabled={!isDirty || saveMutation.isPending}
          >
            Descartar cambios
          </button>
          {saveMutation.isError ? (
            <p className="auth-message error" role="alert">
              {saveMutation.error?.message || 'No hemos podido guardar las habilidades.'}
            </p>
          ) : null}
        </div>
      ) : null}
    </ProfileContentSection>
  )
}
