import styles from '../SettingsPage.module.css'
import { useSettings } from './SettingsContext'
import SettingsCard from './SettingsCard'

export default function NotificationSettings() {
  const { form, setField } = useSettings()

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
          <label className={styles.checkField}>
            <input type="checkbox" disabled />
            <span>Cambios en mis solicitudes</span>
          </label>
        </div>

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
          <label className={styles.checkField}>
            <input type="checkbox" disabled />
            <span>Cambios en tareas activas</span>
          </label>
        </div>

        <div className={styles.notificationGroup}>
          <span className={styles.panelKicker}>Email</span>
          <label className={styles.checkField}>
            <input
              type="checkbox"
              checked={form.notifyPayments}
              onChange={(event) => setField('notifyPayments', event.target.checked)}
            />
            <span>Actualizaciones importantes por email</span>
          </label>
        </div>
      </div>
    </SettingsCard>
  )
}
