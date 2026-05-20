import styles from './SectionHeader.module.css'

export default function SectionHeader({ eyebrow, title, lead, titleClassName = '', compact = false }) {
  return (
    <div className={`${styles.header} ${compact ? styles.compact : ''}`.trim()}>
      {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
      <h2 className={`${styles.title} ${titleClassName}`.trim()}>{title}</h2>
      {lead ? <p className={styles.lead}>{lead}</p> : null}
    </div>
  )
}
