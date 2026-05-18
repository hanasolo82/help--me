import styles from '../../profile/styles/profileNetwork.module.css'

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function parseTime(value) {
  if (!value) return null
  const [hours, minutes] = String(value).split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  return hours * 60 + minutes
}

function isTodaySlot(slot) {
  const now = new Date()
  const currentDay = now.getDay()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const start = parseTime(slot.start_time)
  const end = parseTime(slot.end_time)
  return slot.day_of_week === currentDay && start !== null && end !== null && currentMinutes >= start && currentMinutes <= end
}

export default function WeeklyAvailabilityGrid({ slots = [], availabilityEnabled = true }) {
  const hasSlots = slots.length > 0
  const todayIndex = new Date().getDay()

  return (
    <div className={styles.availabilityGrid}>
      <div className={styles.highlightCard}>
        <strong>{availabilityEnabled ? 'Disponible para ayudar' : 'Disponibilidad pausada'}</strong>
        <p className="muted">
          {hasSlots ? 'Mostramos sus franjas más frecuentes para que sea fácil decidir.' : 'Todavía no ha publicado horarios.'}
        </p>
      </div>

      {DAYS.map((day, index) => {
        const daySlots = slots.filter((slot) => Number(slot.day_of_week) === index)
        const availableNow = daySlots.some(isTodaySlot)

        return (
          <div key={day} className={`${styles.dayCard} ${index === todayIndex ? styles.isToday : ''}`.trim()}>
            <strong>{day}</strong>
            <span>{daySlots.length > 0 ? `${daySlots.length} bloque(s)` : 'Sin bloques'}</span>
            <span>{availableNow ? 'Disponible ahora' : daySlots.length > 0 ? 'Disponible hoy' : 'Sin disponibilidad'}</span>
          </div>
        )
      })}
    </div>
  )
}

