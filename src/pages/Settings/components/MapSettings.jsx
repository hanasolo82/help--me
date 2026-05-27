import { MAP_AVATAR_OPTIONS, MAP_AVATAR_SLOTS } from '../../../assets/map-avatars'
import styles from '../SettingsPage.module.css'
import { useSettings } from './SettingsContext'
import SettingsCard from './SettingsCard'

// Rellena la cuadricula hasta MAP_AVATAR_SLOTS aunque aun no esten todas las imagenes.
function buildSlotList() {
  const slots = [...MAP_AVATAR_OPTIONS]
  while (slots.length < MAP_AVATAR_SLOTS) {
    slots.push({ id: `placeholder-${slots.length + 1}`, url: null, placeholder: true })
  }
  return slots
}

export default function MapSettings() {
  const { form, setField } = useSettings()
  const slots = buildSlotList()
  const selectedId = form.mapAvatarUrl || ''

  return (
    <SettingsCard
      id="mapa-ubicacion"
      eyebrow="Mapa"
      title="Mapa y ubicación"
      description="Define cómo se carga el mapa y cómo se muestra tu ubicación."
    >
      <div className={styles.grid}>
        <div className={styles.spanTwo}>
          <div className={styles.field}>
            <span>Tu avatar en el mapa</span>
            <div className={styles.mapAvatarGrid} role="radiogroup" aria-label="Avatar del mapa">
              {slots.map((slot) => {
                const isSelected = !slot.placeholder && slot.id === selectedId
                const className = [
                  styles.mapAvatarOption,
                  isSelected ? styles.mapAvatarOptionActive : '',
                  slot.placeholder ? styles.mapAvatarOptionPlaceholder : '',
                ]
                  .filter(Boolean)
                  .join(' ')

                return (
                  <button
                    key={slot.id}
                    type="button"
                    className={className}
                    onClick={() => !slot.placeholder && setField('mapAvatarUrl', slot.id)}
                    aria-pressed={isSelected}
                    disabled={slot.placeholder}
                    title={slot.placeholder ? 'Pendiente' : slot.label}
                  >
                    {slot.url
                      ? <img src={slot.url} alt={`Avatar ${slot.label}`} />
                      : <span aria-hidden="true">·</span>}
                  </button>
                )
              })}
            </div>
            {selectedId && (
              <button
                type="button"
                className="link-button"
                onClick={() => setField('mapAvatarUrl', '')}
              >
                Quitar avatar del mapa
              </button>
            )}
          </div>
        </div>

        <label className={styles.field}>
          <span>Preferencia inicial de búsqueda</span>
          <input
            type="number"
            min="1"
            max="100"
            step="1"
            value={form.searchRadiusKm}
            onChange={(event) => setField('searchRadiusKm', event.target.value)}
          />
          <p className={styles.helperText}>Distancia actual en kilómetros. La opción sin límite se activará cuando esté lista.</p>
        </label>

        <div className={styles.field}>
          <span>Mostrar ubicación aproximada</span>
          <button
            type="button"
            className={form.showApproxLocation ? `${styles.switch} ${styles.switchOn}` : styles.switch}
            onClick={() => setField('showApproxLocation', !form.showApproxLocation)}
            aria-pressed={form.showApproxLocation}
          >
            <span>{form.showApproxLocation ? 'Sí' : 'No'}</span>
          </button>
          <p className={styles.helperText}>Mostraremos solo tu zona general, nunca una ubicación exacta.</p>
        </div>

        <div className={`${styles.premiumRow} ${styles.spanTwo}`}>
          <div>
            <strong>Actualizar ubicación automáticamente</strong>
            <p>Permite que HelpMe mantenga tu ubicación al día cuando cambies de zona.</p>
          </div>
          <button type="button" className={styles.disabledPill} disabled>
            Pendiente
          </button>
        </div>
      </div>
    </SettingsCard>
  )
}
