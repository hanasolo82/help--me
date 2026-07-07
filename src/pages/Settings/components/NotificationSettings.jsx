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
          <div className={styles.notificationSwitchRow}>
            <div className={styles.notificationSwitchCopy}>
              <strong>Respuestas a mis solicitudes</strong>
              <p>Te avisamos cuando alguien responda o te escriba sobre una solicitud.</p>
            </div>
            <button
              type="button"
              className={form.notifyMessages ? `${styles.settingsSwitch} ${styles.settingsSwitchOn}` : styles.settingsSwitch}
              onClick={() => setField('notifyMessages', !form.notifyMessages)}
              role="switch"
              aria-checked={form.notifyMessages}
              aria-label="Respuestas a mis solicitudes"
            >
              <span className={styles.settingsSwitchThumb} aria-hidden="true" />
            </button>
          </div>
        </div>

        {helperCompleted ? (
          <div className={styles.notificationGroup}>
            <span className={styles.panelKicker}>Como ayudante</span>
            <div className={styles.notificationSwitchRow}>
              <div className={styles.notificationSwitchCopy}>
                <strong>Nuevas solicitudes cercanas</strong>
                <p>Recibe avisos cuando aparezcan tareas compatibles cerca de tu zona.</p>
              </div>
              <button
                type="button"
                className={form.notifyNearbyTasks ? `${styles.settingsSwitch} ${styles.settingsSwitchOn}` : styles.settingsSwitch}
                onClick={() => setField('notifyNearbyTasks', !form.notifyNearbyTasks)}
                role="switch"
                aria-checked={form.notifyNearbyTasks}
                aria-label="Nuevas solicitudes cercanas"
              >
                <span className={styles.settingsSwitchThumb} aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </SettingsCard>
  )
}
