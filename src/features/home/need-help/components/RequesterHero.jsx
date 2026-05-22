import styles from './RequesterHero.module.css'
import RippleButton from '../../../../shared/ui/RippleButton'

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
          <RippleButton type="button" variant="primary" className={styles.publishButton} onClick={onPublishRequest}>
            Publicar solicitud
          </RippleButton>
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
