import { useEffect, useState } from 'react'
import { getDirectMessagePreference, setDirectMessagePreference } from '../../../features/chat/api/chatApi'
import styles from '../SettingsPage.module.css'
import { useSettings } from './SettingsContext'
import SettingsCard from './SettingsCard'

export default function NotificationSettings() {
  const { form, profile, setField } = useSettings()
  const helperCompleted = profile?.helper_status === 'active'
  const [directMessagesState, setDirectMessagesState] = useState({ profileId: null, enabled: false, error: '' })
  const [directMessagesSaving, setDirectMessagesSaving] = useState(false)
  const hasCurrentDirectMessagesState = directMessagesState.profileId === profile?.id
  const directMessagesEnabled = hasCurrentDirectMessagesState ? directMessagesState.enabled : false
  const directMessagesError = hasCurrentDirectMessagesState ? directMessagesState.error : ''
  const directMessagesLoading = helperCompleted && !hasCurrentDirectMessagesState

  useEffect(() => {
    let cancelled = false

    if (!helperCompleted || !profile?.id) return undefined

    getDirectMessagePreference()
      .then((enabled) => {
        if (!cancelled) {
          setDirectMessagesState({ profileId: profile.id, enabled, error: '' })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDirectMessagesState({ profileId: profile.id, enabled: false, error: 'No pudimos cargar esta preferencia.' })
        }
      })

    return () => {
      cancelled = true
    }
  }, [helperCompleted, profile?.id])

  async function handleDirectMessagesToggle() {
    if (!profile?.id || directMessagesLoading || directMessagesSaving) {
      return
    }

    const previousValue = directMessagesEnabled
    const nextValue = !previousValue
    setDirectMessagesState({ profileId: profile.id, enabled: nextValue, error: '' })
    setDirectMessagesSaving(true)

    try {
      const savedValue = await setDirectMessagePreference(nextValue)
      setDirectMessagesState({ profileId: profile.id, enabled: savedValue, error: '' })
    } catch {
      setDirectMessagesState({ profileId: profile.id, enabled: previousValue, error: 'No pudimos guardar esta preferencia.' })
    } finally {
      setDirectMessagesSaving(false)
    }
  }

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

            <div className={styles.notificationSubrow}>
              <div className={styles.notificationSwitchRow}>
                <div className={styles.notificationSwitchCopy}>
                  <strong>Recibir mensajes directos</strong>
                  <p>{directMessagesError || 'Permite que otras personas te escriban antes de proponerte una tarea.'}</p>
                </div>
                <button
                  type="button"
                  className={directMessagesEnabled ? `${styles.settingsSwitch} ${styles.settingsSwitchOn}` : styles.settingsSwitch}
                  onClick={handleDirectMessagesToggle}
                  role="switch"
                  aria-checked={directMessagesEnabled}
                  aria-label="Recibir mensajes directos"
                  disabled={directMessagesLoading || directMessagesSaving}
                >
                  <span className={styles.settingsSwitchThumb} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </SettingsCard>
  )
}
