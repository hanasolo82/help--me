import styles from '../styles/profilePublicView.module.css'
import { buildTrustMetricItems } from '../utils/profileFormatters'

export default function ProfileTrustMetrics({ profile, reviewSummary }) {
  const items = buildTrustMetricItems(profile, reviewSummary)

  return (
    <div className={styles.trustMetrics} aria-label="Métricas de confianza">
      {items.map((item) => (
        <article key={item.label} className={styles.trustMetricCard}>
          <span className={styles.trustMetricLabel}>{item.label}</span>
          <strong className={styles.trustMetricValue}>{item.value}</strong>
          <span className={styles.trustMetricMeta}>{item.meta}</span>
        </article>
      ))}
    </div>
  )
}
