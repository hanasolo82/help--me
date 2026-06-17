import styles from './MapMarkerSystem.module.css'

export default function MapPopupCard({ kicker, title, meta = [], children }) {
  const safeMeta = meta.filter(Boolean)

  return (
    <article className={styles.popupCard}>
      {kicker ? <p className={styles.popupKicker}>{kicker}</p> : null}
      <h3 className={styles.popupTitle}>{title}</h3>
      {safeMeta.length > 0 ? (
        <div className={styles.popupMeta}>
          {safeMeta.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      ) : null}
      {children ? <p className={styles.popupBody}>{children}</p> : null}
    </article>
  )
}
