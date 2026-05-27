import styles from '../SettingsPage.module.css'
import { useSettings } from './SettingsContext'
import SettingsCard from './SettingsCard'

export default function AppearanceSettings() {
  const { form, setField } = useSettings()

  return (
    <SettingsCard
      id="apariencia"
      eyebrow="Apariencia"
      title="Apariencia"
      description="Adapta HelpMe a tu entorno de trabajo."
    >
      <div className={styles.grid}>
        <div className={`${styles.premiumRow} ${styles.spanTwo}`}>
          <div>
            <strong>Usar apariencia del sistema</strong>
            <p>HelpMe seguirá automáticamente la configuración visual de tu dispositivo.</p>
          </div>
          <button type="button" className={styles.disabledPill} disabled>
            Preparado
          </button>
        </div>

        <div className={`${styles.field} ${styles.segmentedField}`}>
          <span>Selector manual</span>
          <div className={styles.segmentedControl} role="radiogroup" aria-label="Tema de la app">
            <button
              type="button"
              className={form.theme === 'light' ? styles.segmentedActive : styles.segmentedButton}
              onClick={() => setField('theme', 'light')}
              aria-pressed={form.theme === 'light'}
            >
              Claro
            </button>
            <button
              type="button"
              className={form.theme === 'dark' ? styles.segmentedActive : styles.segmentedButton}
              onClick={() => setField('theme', 'dark')}
              aria-pressed={form.theme === 'dark'}
            >
              Oscuro
            </button>
          </div>
        </div>

        <div className={`${styles.field} ${styles.spanTwo}`}>
          <span>Identidad visual</span>
          <p className={styles.helperText}>
            El color principal se mantiene fijo para conservar una experiencia reconocible y calmada.
          </p>
        </div>
      </div>
    </SettingsCard>
  )
}
