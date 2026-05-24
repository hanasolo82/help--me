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
      description="Elige qué notificaciones quieres recibir."
    >
      <div className={styles.checkGrid}>
        <label className={styles.checkField}>
          <input
            type="checkbox"
            checked={form.notifyNearbyTasks}
            onChange={(event) => setField('notifyNearbyTasks', event.target.checked)}
          />
          <span>Avisos de nuevas tareas cerca</span>
        </label>

        <label className={styles.checkField}>
          <input
            type="checkbox"
            checked={form.notifyMessages}
            onChange={(event) => setField('notifyMessages', event.target.checked)}
          />
          <span>Avisos de mensajes</span>
        </label>

        <label className={styles.checkField}>
          <input
            type="checkbox"
            checked={form.notifyPayments}
            onChange={(event) => setField('notifyPayments', event.target.checked)}
          />
          <span>Avisos de pagos</span>
        </label>
      </div>
    </SettingsCard>
  )
}
