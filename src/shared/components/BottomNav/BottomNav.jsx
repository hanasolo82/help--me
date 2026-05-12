import { NavLink } from 'react-router-dom'
import styles from './BottomNav.module.css'

// Barra inferior de navegacion. requester controla si mostramos "Crear" en modo pedir ayuda.
export default function BottomNav({ active, requester = false }) {
  return (
    <nav className={styles.nav} aria-label="Navegacion principal">
      <NavLink className={active === 'home' ? styles.active : styles.link} to="/home">
        Inicio
      </NavLink>
      {requester && (
        <NavLink className={active === 'create' ? styles.active : styles.link} to="/create">
          Crear
        </NavLink>
      )}
      <NavLink className={active === 'chats' ? styles.active : styles.link} to="/chat/dog-walk">
        Chats
      </NavLink>
      <NavLink className={active === 'profile' ? styles.active : styles.link} to="/profile">
        Perfil
      </NavLink>
    </nav>
  )
}
