import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import AvailabilityMatrix from '../../../availability/components/AvailabilityMatrix'
import ProfileContentSection from '../ProfileContentSection'
import styles from '../../styles/profilePublicView.module.css'
import { slotsToCellSet, cellKey } from '../../../availability/timeSlots'
import { replaceOwnAvailabilityCells } from '../../api/profileEditApi'
import { deriveAvailabilitySummary, deriveAvailabilityUpdatedAt } from '../../utils/profileFormatters'

// Bloque de disponibilidad prominente (estilo Babysits): matriz franjas × días
// visible sin contacto previo. En modo edición las celdas se marcan/desmarcan
// y se persisten con Guardar (la fecha de "Actualizado" sale del updated_at).
export default function ProfileAvailabilityPanel({ profile, availability = [], isEditing = false }) {
  const queryClient = useQueryClient()
  const publishedCells = slotsToCellSet(availability)
  const updatedAtLabel = deriveAvailabilityUpdatedAt(availability)

  const [draftCells, setDraftCells] = useState(null)
  const isDirty = draftCells !== null
  const cells = isDirty ? draftCells : publishedCells

  const saveMutation = useMutation({
    mutationFn: (nextCells) => replaceOwnAvailabilityCells(profile?.id, nextCells),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile-availability', profile?.id] }),
        queryClient.invalidateQueries({ queryKey: ['profile', profile?.id] }),
      ])
      setDraftCells(null)
    },
  })

  function handleToggleCell(day, slotId) {
    const base = new Set(isDirty ? draftCells : publishedCells)
    const key = cellKey(day, slotId)

    if (base.has(key)) {
      base.delete(key)
    } else {
      base.add(key)
    }

    setDraftCells(base)
  }

  const paused = profile?.availability_enabled === false
  const lead = isEditing
    ? 'Marca las franjas en las que sueles estar disponible. Los cambios se publican al guardar.'
    : paused
      ? 'El helper ha pausado temporalmente su disponibilidad pública.'
      : deriveAvailabilitySummary(availability)

  return (
    <ProfileContentSection
      id="disponibilidad"
      eyebrow="Disponibilidad"
      title="Disponibilidad habitual"
      lead={lead}
    >
      {!isEditing && availability.length === 0 ? (
        <div className={styles.emptyState}>
          <strong>Disponibilidad no publicada</strong>
          <p className="muted">Todavía no se ha compartido una matriz semanal.</p>
        </div>
      ) : (
        <AvailabilityMatrix
          cells={cells}
          editable={isEditing}
          onToggleCell={handleToggleCell}
          updatedAtLabel={isEditing ? '' : updatedAtLabel}
        />
      )}

      {isEditing ? (
        <div className={styles.editActions}>
          <button
            type="button"
            className="primary-action"
            onClick={() => saveMutation.mutate(cells)}
            disabled={!isDirty || saveMutation.isPending}
            aria-busy={saveMutation.isPending || undefined}
          >
            {saveMutation.isPending ? 'Guardando…' : 'Guardar disponibilidad'}
          </button>
          <button
            type="button"
            className="secondary-action"
            onClick={() => setDraftCells(null)}
            disabled={!isDirty || saveMutation.isPending}
          >
            Descartar cambios
          </button>
          {saveMutation.isError ? (
            <p className="auth-message error" role="alert">
              {saveMutation.error?.message || 'No hemos podido guardar la disponibilidad.'}
            </p>
          ) : null}
        </div>
      ) : null}
    </ProfileContentSection>
  )
}
