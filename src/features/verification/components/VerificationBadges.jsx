import styles from '../../profile/styles/profileNetwork.module.css'

function badgeState(value) {
  return value ? 'Verificado' : 'Pendiente'
}

export default function VerificationBadges({ profile, verifications }) {
  const data = verifications || profile?.profile_verifications || {}

  const items = [
    { label: 'Email', value: data.email_verified ?? false },
    { label: 'Teléfono', value: data.phone_verified ?? false },
    { label: 'Identidad', value: data.identity_verified ?? false },
    { label: 'Pagos', value: data.payment_verified ?? false },
    { label: 'Background', value: data.background_checked ?? false },
  ]

  return (
    <div className={styles.verificationList}>
      {items.map((item) => (
        <div key={item.label} className={styles.verificationItem}>
          <span>✔ {item.label}</span>
          <strong className={styles.verificationState}>{badgeState(item.value)}</strong>
        </div>
      ))}
    </div>
  )
}
