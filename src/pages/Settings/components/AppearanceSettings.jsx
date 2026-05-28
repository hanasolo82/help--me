import { useState } from 'react'
import styles from '../SettingsPage.module.css'
import { useSettings } from './SettingsContext'
import SettingsCard from './SettingsCard'

export default function AppearanceSettings() {
  const { form, setField } = useSettings()
  const [useSystemTheme, setUseSystemTheme] = useState(false)

  function toggleSystemTheme() {
    setUseSystemTheme((current) => {
      const nextValue = !current

      if (!current && typeof window !== 'undefined') {
        const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
        setField('theme', prefersDark ? 'dark' : 'light')
      }

      return nextValue
    })
  }

  return (
    <SettingsCard
      id="apariencia"
      eyebrow="Apariencia"
      title="Apariencia"
      description="Adapta HelpMe a tu entorno de trabajo."
    >
      <div className={styles.grid}>
        <div className={`${styles.settingToggleRow} ${styles.spanTwo}`}>
          <div>
            <strong>Usar apariencia del sistema</strong>
          </div>
          <button
            type="button"
            className={useSystemTheme ? `${styles.switch} ${styles.switchOn}` : styles.switch}
            onClick={toggleSystemTheme}
            aria-pressed={useSystemTheme}
          >
            {useSystemTheme ? 'Sí' : 'No'}
          </button>
        </div>

        {!useSystemTheme ? (
          <div className={`${styles.field} ${styles.segmentedField}`}>
            <span>Tema</span>
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
        ) : null}
      </div>
    </SettingsCard>
  )
}
