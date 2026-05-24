import styles from '../SettingsPage.module.css'
import { useSettings } from './SettingsContext'
import SettingsCard from './SettingsCard'

export default function AppearanceSettings() {
  const { form, setField } = useSettings()

  return (
    <SettingsCard
      id="apariencia"
      eyebrow="Apariencia"
      title="Look & feel"
      description="Ajusta el tema visual que se aplica a toda tu sesion."
    >
      <div className={styles.grid}>
        <div className={`${styles.field} ${styles.segmentedField}`}>
          <span>Tema</span>
          <div className={styles.segmentedControl} role="radiogroup" aria-label="Tema de la app">
            <button
              type="button"
              className={form.theme === 'light' ? styles.segmentedActive : styles.segmentedButton}
              onClick={() => setField('theme', 'light')}
              aria-pressed={form.theme === 'light'}
            >
              Light
            </button>
            <button
              type="button"
              className={form.theme === 'dark' ? styles.segmentedActive : styles.segmentedButton}
              onClick={() => setField('theme', 'dark')}
              aria-pressed={form.theme === 'dark'}
            >
              Dark
            </button>
          </div>
        </div>

        <div className={`${styles.field} ${styles.spanTwo}`}>
          <span>Color principal</span>
          <p className={styles.helperText}>
            El color principal de la app se mantiene fijo para evitar conflictos visuales en la interfaz.
          </p>
        </div>
      </div>
    </SettingsCard>
  )
}
