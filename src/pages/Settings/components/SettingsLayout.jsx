import styles from '../SettingsPage.module.css'
import SettingsSidebar from './SettingsSidebar'

export default function SettingsLayout({ items = [], onBack, children, busy = false }) {
  return (
    <div className={styles.shell}>
      <div className={styles.topBar}>
        <button type="button" className="secondary-action" onClick={onBack}>
          Volver
        </button>
        <button type="submit" className="primary-action" form="settings-form" disabled={busy}>
          {busy ? 'Guardando...' : 'Listo'}
        </button>
      </div>

      <div className={styles.shellGrid}>
        <SettingsSidebar items={items} />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  )
}
