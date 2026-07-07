import { useState } from 'react'
import styles from '../SettingsPage.module.css'
import { useSettings } from './SettingsContext'
import SettingsCard from './SettingsCard'

const THEME_OPTIONS = [
  {
    id: 'light',
    label: 'Claro',
    description: 'Fondo crema y tarjetas blancas.',
  },
  {
    id: 'dark',
    label: 'Oscuro',
    description: 'Superficies oscuras, ideal de noche.',
  },
]

// Miniatura del tema dibujada con CSS: una ventana en miniatura con cabecera,
// tarjeta y botón para previsualizar cómo se ve la app en cada tema.
function ThemePreviewThumb({ themeId }) {
  const themeClass = themeId === 'dark' ? styles.themeThumbDark : styles.themeThumbLight

  return (
    <span className={`${styles.themeThumb} ${themeClass}`} aria-hidden="true">
      <span className={styles.themeThumbHeader}>
        <span className={styles.themeThumbDot} />
        <span className={styles.themeThumbLine} />
      </span>
      <span className={styles.themeThumbCard}>
        <span className={styles.themeThumbLine} />
        <span className={`${styles.themeThumbLine} ${styles.themeThumbLineShort}`} />
        <span className={styles.themeThumbButton} />
      </span>
    </span>
  )
}

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
      description="Elige cómo se ve HelpMe. El cambio se aplica al guardar."
    >
      <div className={styles.grid}>
        <div className={`${styles.settingToggleRow} ${styles.spanTwo}`}>
          <div>
            <strong>Usar apariencia del sistema</strong>
            <p className="muted">Sigue automáticamente el modo claro/oscuro de tu dispositivo.</p>
          </div>
          <button
            type="button"
            className={useSystemTheme ? `${styles.settingsSwitch} ${styles.settingsSwitchOn}` : styles.settingsSwitch}
            onClick={toggleSystemTheme}
            role="switch"
            aria-checked={useSystemTheme}
            aria-label="Usar apariencia del sistema"
          >
            <span className={styles.settingsSwitchThumb} aria-hidden="true" />
          </button>
        </div>

        <div
          className={`${styles.themePreviewGrid} ${styles.spanTwo} ${useSystemTheme ? styles.themePreviewGridDisabled : ''}`.trim()}
          role="radiogroup"
          aria-label="Tema de la app"
        >
          {THEME_OPTIONS.map((option) => {
            const selected = form.theme === option.id

            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={useSystemTheme}
                className={selected ? `${styles.themePreview} ${styles.themePreviewActive}` : styles.themePreview}
                onClick={() => setField('theme', option.id)}
              >
                <ThemePreviewThumb themeId={option.id} />
                <span className={styles.themePreviewCopy}>
                  <strong>{option.label}</strong>
                  <span>{option.description}</span>
                </span>
                <span className={styles.themePreviewCheck} aria-hidden="true">
                  {selected ? '✓' : ''}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </SettingsCard>
  )
}
