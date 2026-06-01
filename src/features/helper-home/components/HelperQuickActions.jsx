import { useNavigate } from 'react-router-dom'
import styles from '../styles/helperHome.module.css'

export default function HelperQuickActions({
  onOpenChats,
  onOpenFavorites,
  onOpenSettings,
  onNeedHelp,
  onStartHelperOnboarding,
}) {
  const navigate = useNavigate()

  return (
    <section className={styles.panel} aria-label="Acciones rápidas">
      <div className={styles.panelTitle}>
        <h3>Acciones rápidas</h3>
        <p>Menos clics, más trabajo.</p>
      </div>

      <div className={styles.quickGrid}>
        <button type="button" className={styles.quickButton} onClick={onOpenChats}>
          <strong>Mensajes</strong>
          <span>Revisa conversaciones activas.</span>
        </button>

        <button type="button" className={styles.quickButton} onClick={onOpenFavorites}>
          <strong>Favoritos</strong>
          <span>Vuelve a tareas o personas guardadas.</span>
        </button>

        <button type="button" className={styles.quickButton} onClick={onOpenSettings}>
          <strong>Ajustes</strong>
          <span>Afina visibilidad y notificaciones.</span>
        </button>

        <button
          type="button"
          className={styles.quickButton}
          onClick={() => navigate('/onboarding/availability')}
        >
          <strong>Disponibilidad</strong>
          <span>Amplía o ajusta tu horario visible.</span>
        </button>

        <button
          type="button"
          className={styles.quickButton}
          onClick={() => navigate('/onboarding/skills')}
        >
          <strong>Skills</strong>
          <span>Mejora compatibilidad con más solicitudes.</span>
        </button>

        <button type="button" className={styles.quickButton} onClick={onNeedHelp || onStartHelperOnboarding}>
          <strong>Necesito ayuda</strong>
          <span>Cambia temporalmente a modo requester.</span>
        </button>
      </div>
    </section>
  )
}
