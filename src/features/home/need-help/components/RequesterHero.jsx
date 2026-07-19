import styles from './RequesterHero.module.css'
import RippleButton from '../../../../shared/ui/RippleButton'

export default function RequesterHero({ onPublishRequest }) {
  return (
    <section className={styles.hero}>
      <h2 className={styles.promptLabel}>¿Qué necesitas?</h2>

      <div className={styles.actionRow}>
        {onPublishRequest ? (
          <RippleButton type="button" variant="primary" className={styles.publishButton} onClick={onPublishRequest}>
            Publicar solicitud
          </RippleButton>
        ) : null}
      </div>
    </section>
  )
}
