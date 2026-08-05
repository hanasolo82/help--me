import { Link } from 'react-router-dom'

import BrandLogo from '../../shared/ui/BrandLogo/BrandLogo'
import styles from './NotFound.module.css'

export default function NotFound() {
  return (
    <main className={styles.page}>
      <Link className={styles.brandLink} to="/" aria-label="Ir a la portada de HelpMe">
        <BrandLogo size="md" variant="auto" align="center" />
      </Link>
      <div className={styles.content}>
        <p className={styles.code}>404</p>
        <h1>Página no encontrada</h1>
        <p>La dirección no existe o ya no está disponible.</p>
        <Link className="primary-action" to="/">
          Ir al inicio
        </Link>
      </div>
    </main>
  )
}
