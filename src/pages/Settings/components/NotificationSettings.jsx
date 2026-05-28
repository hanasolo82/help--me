import styles from '../SettingsPage.module.css'
import { useSettings } from './SettingsContext'
import SettingsCard from './SettingsCard'

export default function NotificationSettings() {
  const { form, profile, setField } = useSettings()
  const helperCompleted = profile?.helper_status === 'active'

  return (
    <SettingsCard
      id="notificaciones"
      eyebrow="Notificaciones"
      title="Avisos importantes"
      description="HelpMe informa cuando importa, sin interrumpir innecesariamente."
    >
      <div className={styles.notificationGroups}>
        <div className={styles.notificationGroup}>
          <span className={styles.panelKicker}>Como cliente</span>
          <label className={styles.checkField}>
            <input type="checkbox" checked={form.notifyMessages} onChange={(event) => setField('notifyMessages', event.target.checked)} />
            <span>Respuestas a mis solicitudes</span>
          </label>
        </div>

        {helperCompleted ? (
          <div className={styles.notificationGroup}>
            <span className={styles.panelKicker}>Como ayudante</span>
            <label className={styles.checkField}>
              <input
                type="checkbox"
                checked={form.notifyNearbyTasks}
                onChange={(event) => setField('notifyNearbyTasks', event.target.checked)}
              />
              <span>Nuevas solicitudes cercanas</span>
            </label>
          </div>
        ) : null}
      </div>
    </SettingsCard>
  )
}
