import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Login, { LoginPanel } from '../Login/Login'
import styles from './Landing.module.css'
import { getCurrentUser } from '../../services/authService'

// Links de la navbar. Puedes anadir, quitar o cambiar secciones desde este array.
const landingLinks = [
  { label: 'Como funciona', href: '#como-funciona' },
  { label: 'Confianza', href: '#confianza' },
  { label: 'Categorias', href: '#categorias' },
  { label: 'FAQ', href: '#faq' },
]

// Slides del hero. Si anades imagenes reales en public/images, actualiza estas rutas.
const heroSlides = [
  {
    title: 'Ayuda local en minutos',
    text: 'Publica una tarea simple y conecta con alguien cerca de tu barrio.',
    image: '/images/helpme-hero-1.jpg',
  },
  {
    title: 'Gana resolviendo tareas cercanas',
    text: 'Recados, compras, mascotas o ayuda tecnica basica desde un feed claro.',
    image: '/images/helpme-hero-2.jpg',
  },
  {
    title: 'Un switch, una decision',
    text: 'Cambia entre pedir ayuda o ayudar sin perderte en menus complejos.',
    image: '/images/helpme-hero-3.jpg',
  },
]

export default function Landing() {
  const navigate = useNavigate()
  // Si ya se aceptaron cookies, no volvemos a mostrar el modal en cada visita.
  const [showCookies, setShowCookies] = useState(() => localStorage.getItem('helpme-cookies') !== 'accepted')
  const [showLogin, setShowLogin] = useState(false)
  // authMode cambia el texto del modal entre entrar y registrarse.
  const [authMode, setAuthMode] = useState('login')
  const [darkMode, setDarkMode] = useState(false)
  const [slideIndex, setSlideIndex] = useState(0)
  // Guarda imagenes que fallaron para mostrar el fallback visual en vez de una imagen rota.
  const [failedImages, setFailedImages] = useState({})

  const currentSlide = heroSlides[slideIndex]

  const navLinks = useMemo(() => landingLinks, [])

  // Carrusel automatico del hero: cambia de slide cada 4 segundos.
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setSlideIndex((current) => (current + 1) % heroSlides.length)
    }, 4000)

    return () => window.clearInterval(intervalId)
  }, [])

  function acceptCookies() {
    localStorage.setItem('helpme-cookies', 'accepted')
    setShowCookies(false)
  }

  // Abre login/registro. Si ya hay sesion real y pulsa Entrar, va directo a Home.
  async function openAuth(mode) {
    const alreadyAuthenticated = await getCurrentUser()

    if (mode === 'login' && alreadyAuthenticated) {
      navigate('/home')
      return
    }

    setAuthMode(mode)
    setShowLogin(true)
  }

  return (
    <main className={darkMode ? `${styles.landing} ${styles.dark}` : styles.landing}>
      <header className={styles.navbar}>
        <a className={styles.brand} href="#inicio" aria-label="helpMe inicio">
          helpMe
        </a>

        <nav className={styles.links} aria-label="Navegacion de bienvenida">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className={styles.navActions}>
          <button
            className={darkMode ? `${styles.themeSwitch} ${styles.themeSwitchOn}` : styles.themeSwitch}
            onClick={() => setDarkMode((value) => !value)}
            aria-label="Cambiar modo oscuro"
            aria-pressed={darkMode}
          >
            <span></span>
          </button>
          <button className={styles.ghostButton} onClick={() => openAuth('login')}>
            Entrar
          </button>
          <button className={styles.loginButton} onClick={() => openAuth('register')}>
            Registrarse
          </button>
        </div>
      </header>

      <section id="inicio" className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Micro-ayuda local</p>
          <h1>Consigue ayuda en minutos. Ayuda a tu comunidad.</h1>
          <p>
            helpMe conecta necesidades cotidianas con personas cercanas dispuestas a resolverlas de forma rapida,
            simple y segura.
          </p>

          <div className={styles.heroActions}>
            <button className={styles.primaryCta} onClick={() => openAuth('register')}>
              Registrarse
            </button>
            <a className={styles.secondaryCta} href="#como-funciona">
              Ver resumen
            </a>
          </div>
        </div>

        <figure className={styles.heroMedia}>
          {!failedImages[currentSlide.image] ? (
            <img
              src={currentSlide.image}
              alt={currentSlide.title}
              onError={() => setFailedImages((current) => ({ ...current, [currentSlide.image]: true }))}
            />
          ) : (
            <div className={styles.defaultImage} aria-label="Imagen por defecto de helpMe">
              <span>helpMe</span>
              <strong>{currentSlide.title}</strong>
            </div>
          )}
          <figcaption>
            <strong>{currentSlide.title}</strong>
            <span>{currentSlide.text}</span>
          </figcaption>
        </figure>
      </section>

      <section id="como-funciona" className={styles.section}>
        <div className={styles.sectionHeader}>
          <p className={styles.kicker}>Como funciona</p>
          <h2>Una app, dos intenciones</h2>
        </div>

        <div className={styles.steps}>
          <article>
            <span>01</span>
            <h3>Necesito ayuda</h3>
            <p>Publica titulo, ubicacion, precio y urgencia en menos de un minuto.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Ayudar</h3>
            <p>Explora tareas cercanas, revisa precio/distancia y acepta la que encaja contigo.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Chat y cierre</h3>
            <p>Coordina lo esencial, marca la tarea como completada y deja valoracion.</p>
          </article>
        </div>
      </section>

      <section id="confianza" className={styles.splitSection}>
        <div>
          <p className={styles.kicker}>Confianza</p>
          <h2>Diseñado para barrios reales</h2>
          <p>
            Perfiles basicos, rating, verificacion y tareas con estados claros para que la interaccion sea directa
            sin convertirse en una red social.
          </p>
        </div>

        <div className={styles.metrics}>
          <article>
            <strong>3-4</strong>
            <span>pasos hasta publicar</span>
          </article>
          <article>
            <strong>4</strong>
            <span>categorias MVP</span>
          </article>
          <article>
            <strong>1</strong>
            <span>decision por pantalla</span>
          </article>
        </div>
      </section>

      <section id="categorias" className={styles.section}>
        <div className={styles.sectionHeader}>
          <p className={styles.kicker}>Categorias</p>
          <h2>Lo cotidiano, resuelto cerca</h2>
        </div>

        <div className={styles.categoryGrid}>
          {['Mascotas', 'Recados', 'Compras', 'Ayuda tecnica'].map((category) => (
            <article key={category}>
              <h3>{category}</h3>
              <p>Tareas pequenas con precio claro, urgencia visible y contacto directo.</p>
            </article>
          ))}
        </div>
      </section>

      <section id="faq" className={styles.finalCta}>
        <p className={styles.kicker}>MVP</p>
        <h2>Primero validamos una microzona. Luego escalamos.</h2>
        <button className={styles.primaryCta} onClick={() => openAuth('register')}>
          Probar helpMe
        </button>
      </section>

      <footer className={styles.footer}>
        <span>helpMe</span>
        <span>Zaragoza · Delicias</span>
      </footer>

      {showCookies && (
        <div className={styles.modalLayer} role="dialog" aria-modal="true" aria-labelledby="cookies-title">
          <section className={styles.cookieModal}>
            <p className={styles.kicker}>Cookies</p>
            <h2 id="cookies-title">Antes de entrar</h2>
            <p>
              Usamos cookies tecnicas para recordar preferencias como el modo visual y mejorar la experiencia del MVP.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.secondaryCta} onClick={acceptCookies}>
                Solo necesarias
              </button>
              <button className={styles.primaryCta} onClick={acceptCookies}>
                Aceptar
              </button>
            </div>
          </section>
        </div>
      )}

      {showLogin && !showCookies && (
        <div className={styles.modalLayer} role="dialog" aria-modal="true" aria-labelledby="login-title">
          <section className={styles.loginModal}>
            <button className={styles.closeButton} onClick={() => setShowLogin(false)} aria-label="Cerrar login">
              ×
            </button>
            <LoginPanel titleId="login-title" mode={authMode} />
          </section>
        </div>
      )}
    </main>
  )
}

export { Login }
