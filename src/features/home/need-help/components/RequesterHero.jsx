import styles from './RequesterHero.module.css'

export default function RequesterHero({ value, onChange, onPublishRequest }) {
  return (
    <section className={styles.hero}>
      <div className={styles.headerRow}>
        <div className={styles.copy}>
          <p className="eyebrow">Necesito ayuda</p>
          <h2>¿Qué necesitas?</h2>
          <p className="muted">
            Encuentra personas disponibles cerca de ti o publica una solicitud para que puedan responderte.
          </p>
        </div>

        {onPublishRequest ? (
          <button type="button" className="primary-action" onClick={onPublishRequest}>
            Publicar solicitud
          </button>
        ) : null}
      </div>

      <label className={styles.searchField}>
        <span className="muted">Describe en pocas palabras lo que buscas</span>
        <input
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder="Ej. paseo de perro, recado, ayuda técnica..."
        />
      </label>
    </section>
  )
}
