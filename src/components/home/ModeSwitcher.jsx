import styles from '../../pages/Home/Home.module.css'

export default function ModeSwitcher({ mode, onChange }) {
  const isHelperMode = mode === 'help'

  return (
    <section className={styles.toggle} aria-label="Cambiar intencion">
      <button
        type="button"
        className={isHelperMode ? styles.activeButton : styles.inactiveButton}
        onClick={() => onChange('help')}
      >
        Ayudar
      </button>

      <button
        type="button"
        className={!isHelperMode ? styles.activeButtonNeed : styles.inactiveButton}
        onClick={() => onChange('need')}
      >
        Necesito ayuda
      </button>
    </section>
  )
}

