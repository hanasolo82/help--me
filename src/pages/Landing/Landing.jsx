import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import styles from './Landing.module.css'
import { getCurrentUser } from '../../services/authService'
import AuthModal from '../../shared/components/AuthModal/AuthModal'
import CookieConsent from '../../shared/components/CookieConsent/CookieConsent'
import { useDocumentMeta } from '../../shared/hooks/useDocumentMeta'
import { setHelperHomeIntent } from '../../features/helper-onboarding/services/helperIntentStorage'
import { ShineBorder } from '@/components/ui/shine-border'
import ThemeSwitch from '../../shared/components/ThemeSwitch/ThemeSwitch'
import BrandLogo from '../../shared/ui/BrandLogo/BrandLogo'
import {
  applyThemeToDocument,
  resolveThemePreference,
  setStoredThemePreference,
  THEME_DARK,
  THEME_LIGHT,
} from '../../shared/theme/themePreferences'

const LANDING_JSONLD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: 'helpMe',
      url: 'https://helpme.app/',
      areaServed: 'Zaragoza, ES',
      description: 'Plataforma de ayuda cercana entre vecinos.',
    },
    {
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: '¿Como funciona helpMe?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Publicas lo que necesitas, conectas con alguien cercano y coordinas el cierre por chat.',
          },
        },
        {
          '@type': 'Question',
          name: '¿Que categorias hay?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Mascotas, recados, compras y ayuda tecnica forman el primer grupo de usos.',
          },
        },
        {
          '@type': 'Question',
          name: '¿En que zonas opera?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Empezamos en Zaragoza y ampliamos segun la demanda de cada zona.',
          },
        },
      ],
    },
  ],
}

const landingLinks = [
  { label: 'Cómo funciona', href: '#como-funciona' },
  { label: 'Confianza', href: '#confianza' },
  { label: 'Categorías', href: '#categorias' },
  { label: 'Empieza', href: '#empieza' },
]

const heroSlides = [
  {
    title: 'Conecta con alguien cercano',
    text: 'Publica lo que necesitas y encuentra apoyo en tu barrio sin complicarte.',
    image: '/images/helpme-hero-1.jpg',
  },
  {
    title: 'Ofrece ayuda cuando encaje contigo',
    text: 'Recados, compras, mascotas o pequeñas tareas que salen mejor entre vecinos.',
    image: '/images/helpme-hero-2.jpg',
  },
  {
    title: 'Coordina y sigue con tu día',
    text: 'Elige, conversa y resuelve con una experiencia clara de principio a fin.',
    image: '/images/helpme-hero-3.jpg',
  },
]

const heroPills = ['Ayuda local', 'Respuesta rápida', 'Comunidad verificada', 'Coordinación sencilla']

const steps = [
  {
    number: '01',
    title: 'Publica',
    text: 'Describe lo que necesitas en segundos.',
  },
  {
    number: '02',
    title: 'Conecta',
    text: 'Encuentra ayuda cercana y disponible.',
  },
  {
    number: '03',
    title: 'Resuelve',
    text: 'Coordina y sigue con tu día.',
  },
]

const metrics = [
  {
    value: '< 1 min',
    label: 'para publicar',
  },
  {
    value: '100% local',
    label: 'ayuda cercana',
  },
  {
    value: '2 caminos',
    label: 'pedir o ayudar',
  },
]

const categories = [
  {
    title: 'Mascotas',
    text: 'Paseos, cuidados puntuales o una mano cuando necesitas salir sin apuro.',
  },
  {
    title: 'Recados',
    text: 'Pequeños encargos resueltos sin mover toda tu agenda.',
  },
  {
    title: 'Compras',
    text: 'Lo que falta, comprado cerca y entregado con sencillez.',
  },
  {
    title: 'Ayuda técnica',
    text: 'Dudas, ajustes y pequeñas tareas que se resuelven mejor con alguien al lado.',
  },
]

export default function Landing() {
  useDocumentMeta({
    title: 'La ayuda que necesitas, cerca de ti',
    description:
      'helpMe conecta personas cercanas para resolver recados, compras, mascotas y ayuda tecnica de forma simple y segura.',
    path: '/',
  })
  const navigate = useNavigate()
  const [authModal, setAuthModal] = useState({ open: false, mode: 'login' })
  const [navMenuOpen, setNavMenuOpen] = useState(false)
  const [slideIndex, setSlideIndex] = useState(0)
  const [failedImages, setFailedImages] = useState({})
  const [themePreference, setThemePreference] = useState(() =>
    resolveThemePreference({ isPrivateRoute: false }),
  )

  const currentSlide = heroSlides[slideIndex]

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setSlideIndex((current) => (current + 1) % heroSlides.length)
    }, 4000)

    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    applyThemeToDocument(themePreference)
  }, [themePreference])

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

  function handleThemeChange(nextChecked) {
    const nextTheme = nextChecked ? THEME_DARK : THEME_LIGHT
    setThemePreference(nextTheme)
    setStoredThemePreference(nextTheme)
    applyThemeToDocument(nextTheme)
  }

  return (
    <main className={themePreference === THEME_DARK ? `${styles.landing} ${styles.dark}` : styles.landing}>
      <header className={styles.navbar}>
        <a className={styles.brand} href="#inicio" aria-label="Inicio">
          <BrandLogo size="md" variant="auto" />
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
          <ThemeSwitch checked={themePreference === THEME_DARK} onCheckedChange={handleThemeChange} />
          <button className={styles.ghostButton} onClick={openLogin}>
            Entrar
          </button>
        </div>
      </header>

      <section id="inicio" className={styles.hero}>
        <div className={styles.heroCopy}>
          <BrandLogo size="xl" variant="auto" className={styles.heroBrandLogo} />
          <p className={styles.kicker}>Ayuda cercana</p>
          <h1>La ayuda que necesitas, cerca de ti</h1>
          <p className={styles.heroLead}>
            Conecta en minutos con personas cercanas listas para ayudarte con lo cotidiano. Simple, claro y sin
            complicaciones.
          </p>

          <div className={styles.heroActions}>
            <button className={styles.primaryCta} onClick={() => startJourney('need')}>
              Necesito ayuda
            </button>
            <button className={styles.primaryCtaSecondary} onClick={() => startJourney('help')}>
              Quiero ayudar
            </button>
          </div>

          <p className={styles.heroSecondary}>Una forma más simple de resolver el día a día</p>

          <ul className={styles.heroPills} aria-label="Beneficios clave">
            {heroPills.map((pill) => (
              <li key={pill}>{pill}</li>
            ))}
          </ul>
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
              <BrandLogo size="lg" variant="auto" className={styles.fallbackLogo} />
              <strong>{currentSlide.title}</strong>
              <span>{currentSlide.text}</span>
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
          <p className={styles.kicker}>Cómo funciona</p>
          <h2>Resolver algo debería ser así de simple</h2>
        </div>

        <div className={styles.steps}>
          {steps.map((step) => (
            <article key={step.number}>
              <span>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="confianza" className={styles.splitSection}>
        <div className={styles.splitCopy}>
          <p className={styles.kicker}>Confianza</p>
          <h2>Diseñado para generar confianza desde el primer minuto</h2>
          <p>
            Perfiles claros, estados visibles y una experiencia enfocada en la transparencia para que cada paso se
            entienda sin esfuerzo.
          </p>
        </div>

        <div className={styles.metrics}>
          {metrics.map((metric) => (
            <article key={metric.label}>
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
            </article>
          ))}
        </div>
      </section>

      <section id="categorias" className={styles.section}>
        <div className={styles.sectionHeader}>
          <p className={styles.kicker}>Categorías</p>
          <h2>Todo lo cotidiano, mejor resuelto</h2>
        </div>

        <div className={styles.categoryGrid}>
          {categories.map((category) => (
            <ShineBorder
              key={category.title}
              as="article"
              className={styles.categoryCard}
              contentClassName={styles.categoryCardContent}
              borderRadius="var(--radius-lg)"
            >
              <h3>{category.title}</h3>
              <p>{category.text}</p>
            </ShineBorder>
          ))}
        </div>
      </section>

      <section id="empieza" className={styles.finalCta}>
        <div className={styles.finalCtaCard}>
          <h2>Empieza hoy</h2>
          <p>La forma más simple de pedir ayuda o ofrecerla cuando realmente importa.</p>
          <div className={styles.heroActions}>
            <button className={styles.primaryCta} onClick={() => startJourney('need')}>
              Necesito ayuda
            </button>
            <button className={styles.primaryCtaSecondary} onClick={() => startJourney('help')}>
              Quiero ayudar
            </button>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <BrandLogo size="md" variant="auto" />
          <p>La ayuda que necesitas, cerca de ti</p>
        </div>

        <div className={styles.footerMeta}>
          <span>Zaragoza · Delicias</span>
        </div>

        <nav aria-label="Enlaces legales">
          <Link to="/legal/terms">Términos</Link>
          <Link to="/legal/privacy">Privacidad</Link>
          <Link to="/legal/cookies">Cookies</Link>
        </nav>
      </footer>

      <AuthModal open={authModal.open} mode={authModal.mode} onClose={closeAuth} onSuccess={handleAuthSuccess} />
      <CookieConsent />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(LANDING_JSONLD) }} />
    </main>
  )
}
