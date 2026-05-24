import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import styles from './LegalLayout.module.css'
import { useDocumentMeta } from '../../shared/hooks/useDocumentMeta'

const sections = [
  { to: '/legal/community-guidelines', label: 'Normas' },
  { to: '/legal/terms', label: 'Terminos' },
  { to: '/legal/privacy', label: 'Privacidad' },
  { to: '/legal/cookies', label: 'Cookies' },
]

// Wrapper con cabecera, navegacion entre documentos legales y pie con fecha de revision.
export default function LegalLayout({ title, kicker = 'Legal', lastUpdated, description, children }) {
  const navigate = useNavigate()
  const location = useLocation()
  useDocumentMeta({
    title,
    description: description ?? `${title} de helpMe. Documento legal aplicable a usuarios de la plataforma.`,
    path: location.pathname,
  })

  return (
    <main className={styles.layout}>
      <header className={styles.header}>
        <button className={styles.back} onClick={() => navigate(-1)} aria-label="Volver">
          ←
        </button>
        <div>
          <p className={styles.kicker}>{kicker}</p>
          <h1>{title}</h1>
          {lastUpdated && (
            <p className={styles.updated}>
              Ultima actualizacion: <time dateTime={lastUpdated}>{lastUpdated}</time>
            </p>
          )}
        </div>
      </header>

      <nav className={styles.tabs} aria-label="Documentos legales">
        {sections.map((section) => (
          <NavLink
            key={section.to}
            to={section.to}
            className={({ isActive }) => (isActive ? `${styles.tab} ${styles.tabActive}` : styles.tab)}
          >
            {section.label}
          </NavLink>
        ))}
      </nav>

      <article className={styles.content}>{children}</article>

      <footer className={styles.footer}>
        <p>
          ¿Dudas? Escribenos a <a href="mailto:[CORREO_DE_CONTACTO_DEL_RESPONSABLE]">[CORREO_DE_CONTACTO_DEL_RESPONSABLE]</a>.
        </p>
        <Link to="/">Volver a inicio</Link>
      </footer>
    </main>
  )
}
