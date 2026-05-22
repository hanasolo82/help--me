import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import styles from './Landing.module.css'
import { getCurrentUser } from '../../services/authService'
import AuthModal from '../../shared/components/AuthModal/AuthModal'
import CookieConsent from '../../shared/components/CookieConsent/CookieConsent'
import { useDocumentMeta } from '../../shared/hooks/useDocumentMeta'
import { setHelperHomeIntent } from '../../features/helper-onboarding/services/helperIntentStorage'

const LANDING_JSONLD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'helpMe',
      url: 'https://helpme.app/',
      areaServed: 'Zaragoza, ES',
      description: 'Plataforma de micro-ayuda local entre vecinos.',
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: '¿Como funciona helpMe?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Publica titulo, ubicacion, precio y urgencia en menos de un minuto. Un vecino cercano la acepta y coordinais el cierre por chat.',
          },
        },
        {
          '@type': 'Question',
          name: '¿Que categorias hay?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Mascotas, recados, compras y ayuda tecnica son las categorias del MVP.',
          },
        },
        {
          '@type': 'Question',
          name: '¿En que zonas opera?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'En la fase inicial validamos una microzona en Zaragoza (barrio Delicias) y vamos ampliando segun demanda.',
          },
        },
      ],
    },
  ],
}

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
  useDocumentMeta({
    title: 'Micro-ayuda local entre vecinos',
    description:
      'helpMe conecta a quien necesita ayuda con vecinos cercanos: mascotas, recados, compras y ayuda tecnica resueltos en minutos.',
    path: '/',
  })
  const navigate = useNavigate()
  const [authModal, setAuthModal] = useState({ open: false, mode: 'login' })
  const [darkMode, setDarkMode] = useState(false)
  const [navMenuOpen, setNavMenuOpen] = useState(false)
  const [slideIndex, setSlideIndex] = useState(0)
  const [failedImages, setFailedImages] = useState({})

  const currentSlide = heroSlides[slideIndex]

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setSlideIndex((current) => (current + 1) % heroSlides.length)
    }, 4000)

    return () => window.clearInterval(intervalId)
  }, [])

  async function startJourney(mode) {
    setHelperHomeIntent(mode)

    const alreadyAuthenticated = await getCurrentUser()
    if (alreadyAuthenticated) {
      navigate('/auth/callback', { replace: true })
      return
    }

    if (mode === 'help') {
      setAuthModal({ open: true, mode: 'register' })
      return
    }

    setAuthModal({ open: true, mode: 'login' })
  }

  async function openLogin() {
    const alreadyAuthenticated = await getCurrentUser()
    if (alreadyAuthenticated) {
      navigate('/auth/callback', { replace: true })
      return
    }

    setAuthModal({ open: true, mode: 'login' })
  }

  function closeAuth() {
    setAuthModal((current) => ({ ...current, open: false }))
  }

  function handleAuthSuccess({ destination }) {
    setAuthModal((current) => ({ ...current, open: false }))
    navigate(destination, { replace: true })
  }

  return (
    <main className={darkMode ? `${styles.landing} ${styles.dark}` : styles.landing}>
      <header className={styles.navbar}>
        <a className={styles.brand} href="#inicio" aria-label="helpMe inicio">
          helpMe
        </a>

        <div className={styles.mobileNav}>
          <button
            className={styles.mobileNavButton}
            onClick={() => setNavMenuOpen((value) => !value)}
            aria-expanded={navMenuOpen}
            aria-controls="landing-mobile-nav"
          >
            Menu
          </button>
          <nav
            id="landing-mobile-nav"
            className={navMenuOpen ? `${styles.mobileNavMenu} ${styles.mobileNavMenuOpen}` : styles.mobileNavMenu}
            aria-label="Navegacion de bienvenida"
          >
            {landingLinks.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setNavMenuOpen(false)}>
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <nav className={styles.links} aria-label="Navegacion de bienvenida">
          {landingLinks.map((link) => (
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
          <button className={styles.ghostButton} onClick={openLogin}>
            Entrar
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
            <button className={styles.primaryCta} onClick={() => startJourney('need')}>
              Necesito ayuda
            </button>
            <button className={styles.primaryCtaSecondary} onClick={() => startJourney('help')}>
              Quiero ayudar
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
        <div className={styles.heroActions}>
          <button className={styles.primaryCta} onClick={() => startJourney('need')}>
            Necesito ayuda
          </button>
          <button className={styles.primaryCtaSecondary} onClick={() => startJourney('help')}>
            Quiero ayudar
          </button>
        </div>
      </section>

      <footer className={styles.footer}>
        <div>
          <strong>helpMe</strong>
          <span>Zaragoza · Delicias</span>
        </div>
        <nav aria-label="Enlaces legales">
          <Link to="/legal/terms">Terminos</Link>
          <Link to="/legal/privacy">Privacidad</Link>
          <Link to="/legal/cookies">Cookies</Link>
        </nav>
      </footer>

      <AuthModal
        open={authModal.open}
        mode={authModal.mode}
        onClose={closeAuth}
        onSuccess={handleAuthSuccess}
      />
      <CookieConsent />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(LANDING_JSONLD) }}
      />
    </main>
  )
}
