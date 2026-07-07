import styles from '../SettingsPage.module.css'
import SettingsSidebar from './SettingsSidebar'

export default function SettingsLayout({ items = [], children }) {
  return (
    <div className={styles.shell}>
      <div className={styles.shellGrid}>
        <SettingsSidebar items={items} />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  )
}
