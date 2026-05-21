import styles from './HelperIntro.module.css'

export default function HelperIntro({ open, onStart, onNeedHelp, onClose }) {
  if (!open) return null

  return (
    <div
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="helper-intro-title"
    >
      <section className={styles.modal}>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Cerrar">
          ×
        </button>

        <div className={styles.hero}>
          <p className="eyebrow">Quiero ayudar</p>
          <h2 id="helper-intro-title">Empieza a ayudar cerca de ti</h2>
          <p className="muted">
            Crea tu perfil de ayudante para recibir solicitudes cercanas, mostrar tus habilidades y generar confianza
            antes de aceptar tareas.
          </p>
        </div>

        <div className={styles.grid}>
          <article className={styles.card}>
            <strong>Perfil claro</strong>
            <p>Foto, presentación y zona para que la comunidad te identifique rápido.</p>
          </article>
          <article className={styles.card}>
            <strong>Habilidades</strong>
            <p>Indícanos en qué puedes ayudar y qué tipo de tareas encajan contigo.</p>
          </article>
          <article className={styles.card}>
            <strong>Disponibilidad</strong>
            <p>Elige cuándo estás disponible para aparecer en el mapa en el momento adecuado.</p>
          </article>
          <article className={styles.card}>
            <strong>Confianza</strong>
            <p>Verificamos teléfono, identidad y normas de la comunidad para cuidar la experiencia.</p>
          </article>
        </div>

        <p className={styles.note}>
          Podrás guardar el progreso y continuar más tarde si no quieres terminarlo ahora.
        </p>

        <div className={styles.actions}>
          <button type="button" className="primary-action" onClick={onStart}>
            Completar perfil de ayudante
          </button>
          <button type="button" className="secondary-action" onClick={onNeedHelp}>
            Ahora solo quiero pedir ayuda
          </button>
        </div>
      </section>
    </div>
  )
}
