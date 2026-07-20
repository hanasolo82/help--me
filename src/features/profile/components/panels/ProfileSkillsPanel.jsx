import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react'
import ProfileContentSection from '../ProfileContentSection'
import styles from '../../styles/profilePublicView.module.css'
import { useSkillsCatalog } from '../../../skills/hooks/useSkillsCatalog'
import { MAX_SKILLS, replaceOwnSkillsOrdered } from '../../api/profileEditApi'
import { CategoryIcon, style as designStyle } from '../../../../design'
import {
  HELPER_SKILL_CATEGORIES,
  MAX_CUSTOM_SKILLS,
  MAX_SKILL_NAME_LENGTH,
  normalizeSkillName,
  normalizeSkillNameForComparison,
} from '../../../skills/config/skillCategories'

function toSkillItem(entry) {
  const skill = entry?.skill || entry
  if (!skill?.id) return null

  return {
    id: skill.id,
    name: skill.name || 'Habilidad',
    icon: skill.icon || '',
    category: skill.category || '',
    source: skill.source || entry?.source || (skill.is_custom ? 'custom' : 'catalog'),
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
  const [customName, setCustomName] = useState('')
  const [customCategory, setCustomCategory] = useState(HELPER_SKILL_CATEGORIES[0])
  const [customError, setCustomError] = useState('')
  const isDirty = draftItems !== null
  const items = isDirty ? draftItems : publishedItems

  const catalogQuery = useSkillsCatalog()
  const catalog = catalogQuery.data ?? []
  const itemIds = new Set(items.filter((item) => item.source === 'catalog').map((item) => item.id))
  const customSkillCount = items.filter((item) => item.source === 'custom').length
  const addableSkills = catalog.filter((skill) => !itemIds.has(skill.id))

  const saveMutation = useMutation({
    mutationFn: (nextItems) => replaceOwnSkillsOrdered(profile?.id, nextItems),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile-skills', profile?.id] })
      setDraftItems(null)
    },
  })

  function updateDraft(next) {
    setDraftItems(next)
    setCustomError('')
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

  function handleAddCustom(event) {
    event.preventDefault()

    const name = normalizeSkillName(customName)
    const comparableName = normalizeSkillNameForComparison(name)
    const hasDuplicate = items.some(
      (item) => normalizeSkillNameForComparison(item.name) === comparableName,
    )

    if (items.length >= MAX_SKILLS) {
      setCustomError(`Puedes publicar un máximo de ${MAX_SKILLS} habilidades.`)
      return
    }

    if (customSkillCount >= MAX_CUSTOM_SKILLS) {
      setCustomError(`Puedes añadir un máximo de ${MAX_CUSTOM_SKILLS} habilidades propias.`)
      return
    }

    if (name.length < 2 || name.length > MAX_SKILL_NAME_LENGTH) {
      setCustomError(`Escribe entre 2 y ${MAX_SKILL_NAME_LENGTH} caracteres.`)
      return
    }

    if (!HELPER_SKILL_CATEGORIES.includes(customCategory)) {
      setCustomError('Elige una categoría válida.')
      return
    }

    if (hasDuplicate) {
      setCustomError('Esta habilidad ya está en tu lista.')
      return
    }

    updateDraft([
      ...items,
      {
        id: `custom-draft-${Date.now()}-${items.length}`,
        name,
        icon: '',
        category: customCategory,
        source: 'custom',
      },
    ])
    setCustomName('')
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
        isEditing ? (
          <ol className={styles.skillList} aria-label="Habilidades por orden de prioridad">
            {items.map((item, index) => (
              <li key={item.id} className={styles.skillItem}>
                <span className={styles.skillRank} aria-hidden="true">{index + 1}</span>
                <span className={styles.skillIcon} aria-hidden="true">
                  <CategoryIcon category={item.category} size={designStyle.iconSize.tag} tone="light" />
                </span>
                <span className={styles.skillCopy}>
                  <strong>{item.name}</strong>
                  {item.category ? (
                    <small>{item.source === 'custom' ? `Propia · ${item.category}` : item.category}</small>
                  ) : null}
                </span>

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
              </li>
            ))}
          </ol>
        ) : (
          <ol className={`${styles.skillList} ${styles.publicSkillList}`} aria-label="Habilidades por orden de prioridad">
            {items.map((item, index) => (
              <li key={item.id} className={styles.skillItem}>
                <span className={styles.skillRank} aria-hidden="true">{index + 1}</span>
                <span className={styles.skillIcon} aria-hidden="true">
                  <CategoryIcon category={item.category} size={designStyle.iconSize.tag} tone="light" />
                </span>
                <span className={styles.skillCopy}>
                  <strong>{item.name}</strong>
                  {item.category ? <small>{item.category}</small> : null}
                </span>
              </li>
            ))}
          </ol>
        )
      ) : (
        <div className={styles.emptyState}>
          <strong>Aún no ha añadido habilidades.</strong>
          <p className="muted">El perfil público se irá enriqueciendo cuando el helper complete más datos.</p>
        </div>
      )}

      {isEditing ? (
        <div className={styles.skillEditor}>
          <label className={styles.skillAddField}>
            <span>Añadir habilidad sugerida</span>
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

          <form className={styles.customSkillForm} onSubmit={handleAddCustom}>
            <p className={styles.customSkillTitle}>Añadir habilidad propia</p>
            <div className={styles.customSkillFields}>
              <label>
                <span>Habilidad</span>
                <input
                  value={customName}
                  onChange={(event) => {
                    setCustomName(event.target.value.slice(0, MAX_SKILL_NAME_LENGTH))
                    setCustomError('')
                  }}
                  placeholder="Ej. Cortar pelo"
                  maxLength={MAX_SKILL_NAME_LENGTH}
                  disabled={items.length >= MAX_SKILLS || customSkillCount >= MAX_CUSTOM_SKILLS}
                />
              </label>

              <label>
                <span>Categoría</span>
                <select
                  value={customCategory}
                  onChange={(event) => {
                    setCustomCategory(event.target.value)
                    setCustomError('')
                  }}
                  disabled={items.length >= MAX_SKILLS || customSkillCount >= MAX_CUSTOM_SKILLS}
                >
                  {HELPER_SKILL_CATEGORIES.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>

              <button
                type="submit"
                className="secondary-action"
                disabled={items.length >= MAX_SKILLS || customSkillCount >= MAX_CUSTOM_SKILLS}
              >
                <Plus aria-hidden="true" strokeWidth={2.2} />
                Añadir
              </button>
            </div>
            {customError ? <p className="auth-message error" role="alert">{customError}</p> : null}
          </form>

          <p className={styles.skillLimitCopy}>
            {items.length} de {MAX_SKILLS} habilidades · {customSkillCount} propias
          </p>

          <div className={styles.editActions}>
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
              onClick={() => {
                setDraftItems(null)
                setCustomName('')
                setCustomError('')
              }}
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
        </div>
      ) : null}
    </ProfileContentSection>
  )
}
