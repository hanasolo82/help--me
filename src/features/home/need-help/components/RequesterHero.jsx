import styles from './RequesterHero.module.css'
import RippleButton from '../../../../shared/ui/RippleButton'

export default function RequesterHero({ value, onChange, onPublishRequest }) {
  return (
    <section className={styles.hero}>
      <label className={styles.promptLabel} htmlFor="requester-task-query">
        ¿Qué necesitas?
      </label>

      <div className={styles.actionRow}>
        <input
          id="requester-task-query"
          type="search"
          className={styles.searchInput}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder="Ej. paseo de perro, recado, ayuda técnica..."
          maxLength={80}
          autoComplete="off"
        />

        {onPublishRequest ? (
          <RippleButton type="button" variant="primary" className={styles.publishButton} onClick={onPublishRequest}>
            Publicar solicitud
          </RippleButton>
        ) : null}
      </div>
    </section>
  )
}
