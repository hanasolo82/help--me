import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  PencilLine,
  Users,
  CheckCircle2,
  BadgeCheck,
  ShieldCheck,
  Star,
  HeartHandshake,
  Mail,
  MessageCircle,
  ClipboardCheck,
  Zap,
} from 'lucide-react'
import styles from './Landing.module.css'
import { getCurrentUser } from '../../services/authService'
import AuthModal from '../../shared/components/AuthModal/AuthModal'
import CookieConsent from '../../shared/components/CookieConsent/CookieConsent'
import { useDocumentMeta } from '../../shared/hooks/useDocumentMeta'
import { useInView } from '../../shared/hooks/useInView'
import { useScrollReveal } from '../../shared/hooks/useScrollReveal'
import { useTypewriter } from '../../shared/hooks/useTypewriter'
import { useTextRotate } from '../../shared/hooks/useTextRotate'
import {
  HERO_TITLE_PREFIX,
  HERO_TITLE_TAILS,
  CATEGORY_TITLE_PHRASES,
} from './heroPhrases'
import { setHelperHomeIntent } from '../../features/helper-onboarding/services/helperIntentStorage'
import BentoGrid from './components/BentoGrid'
import ThemeSwitch from '../../shared/components/ThemeSwitch/ThemeSwitch'
import BrandLogo from '../../shared/ui/BrandLogo/BrandLogo'
import AnimatedBrandLogo from '../../shared/ui/AnimatedBrandLogo/AnimatedBrandLogo'
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
        {
          '@type': 'Question',
          name: '¿Cuanto cuesta usar helpMe?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Publicar una tarea es gratis y el pago retenido hasta confirmar está incluido. HelpMe Premium es una suscripción opcional con funciones avanzadas.',
          },
        },
      ],
    },
  ],
}

const landingLinks = [
  { label: 'Cómo funciona', href: '#como-funciona' },
  { label: 'Categorías', href: '#categorias' },
  { label: 'Planes', href: '#planes' },
  { label: 'Confianza', href: '#confianza' },
  { label: 'Empieza', href: '#empieza' },
]

// Imágenes del hero en crossfade (rotan las 3 reales; se difuminan entre sí).
const heroImages = [
  { src: '/images/walkdog.webp', srcMobile: '/images/walkdog-mobile.webp' },
  { src: '/images/helpgrandmom.webp', srcMobile: '/images/helpgrandmom-mobile.webp' },
  { src: '/images/homeworks.webp', srcMobile: '/images/homeworks-mobile.webp' },
]

const steps = [
  {
    number: '01',
    title: 'Publica tu necesidad',
    text: 'Cuéntanos qué necesitas en una frase. Sin formularios largos ni complicaciones: en segundos tu petición está visible para gente cercana.',
    Icon: PencilLine,
  },
  {
    number: '02',
    title: 'Conecta al instante',
    text: 'Recibe respuestas de personas verificadas de tu zona, disponibles ahora. Tú eliges con quién quieres coordinar.',
    Icon: Users,
  },
  {
    number: '03',
    title: 'Resuélvelo y sigue',
    text: 'Poneos de acuerdo en el chat, quedad y listo. Valora la ayuda recibida y sigue con tu día tranquilo.',
    Icon: CheckCircle2,
  },
]

// Planes y pago retenido (informativo, sin cobros). Copy fijo: no deriva importes.
// El requester paga al publicar; el helper aún no cobra hasta que se confirma la ayuda.
const paymentTimeline = [
  'Publicas y eliges helper.',
  'Pagas la tarea, pero el helper no cobra todavía.',
  'Cuando está hecha, confirmas y liberas el pago. Si algo no va bien, puedes reportarlo antes.',
]

// Sellos de confianza: fila plana de icono + texto, sin caja por item.
const trustSeals = [
  { Icon: ShieldCheck, text: 'Pago retenido hasta confirmar' },
  { Icon: BadgeCheck, text: 'Devolución total antes de liberar' },
  { Icon: MessageCircle, text: 'Chat desbloqueado tras el pago' },
  { Icon: Mail, text: 'Soporte humano por email' },
]

// Roadmap: un único rótulo "Más adelante" para el grupo; sin precios ni badges por card.
const roadmapItems = [
  { Icon: ClipboardCheck, title: 'Revisión antes de liberar' },
  { Icon: Zap, title: 'Destacar tareas urgentes' },
  { Icon: Star, title: 'Perfil Pro para helpers' },
]

// Carrusel "para qué se usa": una imagen propia por tarjeta (sin repetir entre sí ni con el hero).
// Versión -mobile (~760w) basta de sobra para tarjetas de 230×150.
const marqueeCards = [
  { image: '/images/helping_old_woman-mobile.webp', label: 'Acompañar a mayores' },
  { image: '/images/choring-mobile.webp', label: 'Tareas del hogar' },
  { image: '/images/walk_dog2-mobile.webp', label: 'Pasear al perro' },
  { image: '/images/grandpa-mobile.webp', label: 'Ayuda con el móvil' },
  { image: '/images/moving2-mobile.webp', label: 'Organizar la casa' },
  { image: '/images/shopping2-mobile.webp', label: 'Hacer la compra' },
]

// Tarjetas de confianza (sección #confianza): mecanismo real de la app en cada una.
// Sin prometer nada que la app no haga (nada de "verificado", "seguro" ni "protección").
const trustPoints = [
  {
    Icon: BadgeCheck,
    title: 'Perfiles con valoraciones',
    text: 'Ves el perfil y las valoraciones de cada vecino antes de aceptar su ayuda.',
  },
  {
    Icon: ShieldCheck,
    title: 'Pago retenido',
    text: 'Tu dinero queda retenido y solo se libera cuando confirmas que la tarea está hecha.',
  },
  {
    Icon: MessageCircle,
    title: 'Chat dentro de la app',
    text: 'Os coordináis dentro de HelpMe, con todo por escrito y sin compartir tu teléfono.',
  },
  {
    Icon: HeartHandshake,
    title: 'Soporte real',
    text: 'Si algo no encaja, escríbenos y una persona lo revisa contigo.',
  },
]

// PLACEHOLDER: testimonios de ejemplo, hardcodeados. Sustituir por comentarios
// destacados reales cuando existan valoraciones en producción.
const TESTIMONIALS_PLACEHOLDER = [
  {
    name: 'María G.',
    role: 'Vecina de barrio',
    stars: 5,
    quote:
      'Necesitaba que pasearan a mi perro esa semana y en una tarde lo tenía resuelto. Todo por el chat, sin líos.',
  },
  {
    name: 'Carlos R.',
    role: 'Helper de la zona',
    stars: 5,
    quote: 'Ayudé a un vecino con el móvil y cobré al confirmar. Súper claro y sin comisiones raras.',
  },
  {
    name: 'Lucía M.',
    role: 'Vecina de barrio',
    stars: 4,
    quote: 'Me hicieron la compra un día que no podía salir. El pago retenido me dio mucha tranquilidad.',
  },
  {
    name: 'Andrés P.',
    role: 'Vecino de barrio',
    stars: 5,
    quote: 'Publicar fue cuestión de un minuto y encontré ayuda cerca enseguida.',
  },
]

// Iconos de redes como SVG de línea (esta versión de lucide-react no exporta iconos de marca).
function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <line x1="17.5" y1="6.5" x2="17.5" y2="6.5" />
    </svg>
  )
}

function XTwitterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M4 4l16 16" />
      <path d="M20 4L4 20" />
    </svg>
  )
}

function LinkedinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4V8h4v1.5A6 6 0 0 1 16 8z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

// PLACEHOLDER: URLs de redes sociales pendientes de crear los perfiles reales.
const footerSocials = [
  { label: 'Instagram', href: '#', Icon: InstagramIcon },
  { label: 'X (Twitter)', href: '#', Icon: XTwitterIcon },
  { label: 'LinkedIn', href: '#', Icon: LinkedinIcon },
  { label: 'Facebook', href: '#', Icon: FacebookIcon },
]

// Anclas reales a las secciones de la landing.
const footerProductLinks = [
  { label: 'Cómo funciona', href: '#como-funciona' },
  { label: 'Categorías', href: '#categorias' },
  { label: 'Planes', href: '#planes' },
  { label: 'Confianza', href: '#confianza' },
]

// PLACEHOLDER: páginas de empresa aún no existen; enlaces pendientes de completar.
const footerCompanyLinks = [
  { label: 'Sobre nosotros', href: '#' },
  { label: 'Blog', href: '#' },
  { label: 'Trabaja con nosotros', href: '#' },
  { label: 'Prensa', href: '#' },
]

// PLACEHOLDER: email de contacto y soporte pendientes de confirmar.
const FOOTER_CONTACT_EMAIL = 'hola@helpme.app'

function StarRating({ value, max = 5 }) {
  return (
    <span className={styles.starRating} role="img" aria-label={`${value} de ${max} estrellas`}>
      {Array.from({ length: max }, (_, index) => (
        <Star
          key={index}
          className={index < value ? styles.starFilled : styles.starEmpty}
          aria-hidden="true"
          focusable="false"
        />
      ))}
    </span>
  )
}

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
  const landingRef = useRef(null)
  const [heroIndex, setHeroIndex] = useState(0)
  const [stepsRef, stepsInView] = useInView({ threshold: 0.25 })
  // Reveal de los bloques de Confianza (intro con foto y banda ancha) al entrar en viewport.
  const [trustZig1Ref, trustZig1InView] = useInView({ threshold: 0.25 })
  const [trustZig2Ref, trustZig2InView] = useInView({ threshold: 0.25 })
  const { text: heroTitleTail } = useTypewriter(HERO_TITLE_TAILS, {
    typeSpeed: 90,
    deleteSpeed: 55,
    holdFull: 10000,
    holdEmpty: 450,
  })
  // Rotación del H2 de Categorías (mismo ritmo pausado que tenía: 8s por frase).
  const rotatingPhraseIndex = useTextRotate(CATEGORY_TITLE_PHRASES.length, 8000)

  useScrollReveal(landingRef)
  const [themePreference, setThemePreference] = useState(() =>
    resolveThemePreference({ isPrivateRoute: false }),
  )

  useEffect(() => {
    applyThemeToDocument(themePreference)
  }, [themePreference])

  useEffect(() => {
    if (typeof window === 'undefined' || heroImages.length <= 1) return undefined
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return undefined

    const intervalId = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % heroImages.length)
    }, 4500)

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

  function handleThemeChange(nextChecked) {
    const nextTheme = nextChecked ? THEME_DARK : THEME_LIGHT
    setThemePreference(nextTheme)
    setStoredThemePreference(nextTheme)
    applyThemeToDocument(nextTheme)
  }

  return (
    <main
      ref={landingRef}
      className={themePreference === THEME_DARK ? `${styles.landing} ${styles.dark}` : styles.landing}
    >
      <header className={styles.navbar}>
        <a className={styles.brand} href="#inicio" aria-label="Inicio">
          <AnimatedBrandLogo size="md" />
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

      <section id="inicio" className={styles.heroFull}>
        <div className={styles.heroFullMedia} aria-hidden="true">
          {heroImages.map((image, index) => (
            <img
              key={image.src}
              className={index === heroIndex ? `${styles.heroLayer} ${styles.heroLayerActive}` : styles.heroLayer}
              src={image.src}
              srcSet={`${image.srcMobile} 800w, ${image.src} 1600w`}
              sizes="100vw"
              alt=""
              width="1600"
              height="900"
              loading={index === 0 ? 'eager' : 'lazy'}
              fetchpriority={index === 0 ? 'high' : undefined}
              decoding="async"
            />
          ))}
        </div>
        <div className={styles.heroFullOverlay} aria-hidden="true" />
        <div className={styles.sectionInner}>
          <div className={styles.heroFullContent}>
            <p className={styles.heroFullEyebrow}>Ayuda cercana</p>
            <h1 className={styles.heroFullTitle}>
              <span className={styles.heroTitleLead}>{HERO_TITLE_PREFIX}</span>
              <span className={styles.heroTypeWrap} aria-hidden="true">
                <span className={styles.heroType}>{heroTitleTail}</span>
                <span className={styles.heroCaret} />
              </span>
              <span className={styles.srOnly}>{`${HERO_TITLE_PREFIX} cerca de ti`}</span>
            </h1>
            <div className={styles.heroFullActions}>
              <button type="button" className={styles.heroFullPrimary} onClick={() => startJourney('need')}>
                Necesito ayuda
              </button>
              <button type="button" className={styles.heroFullGhost} onClick={() => startJourney('help')}>
                Quiero ayudar
              </button>
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <p className={styles.kicker}>Cómo funciona</p>
            <h2>Resolver algo debería ser así de simple</h2>
          </div>

          <div
            ref={stepsRef}
            className={`${styles.steps} ${stepsInView ? styles.stepsInView : ''}`.trim()}
          >
            {steps.map((step, index) => (
              <article
                key={step.number}
                className={styles.stepCard}
                style={{ '--step-index': index }}
              >
                <div className={styles.stepHead}>
                  <span className={styles.stepIconBox} aria-hidden="true">
                    <step.Icon className={styles.stepIcon} strokeWidth={1.8} />
                  </span>
                  <span className={styles.stepNumber}>{step.number}</span>
                </div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="categorias" className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <p className={styles.kicker}>Categorías</p>
            <h2 className={styles.categoriesTitle} aria-live="polite">
              <span key={rotatingPhraseIndex} className={styles.rotatingPhrase}>
                {CATEGORY_TITLE_PHRASES[rotatingPhraseIndex]}
              </span>
            </h2>
            <p className={styles.sectionLead}>Estas son las tareas que más se piden entre vecinos</p>
          </div>

          <div className={styles.mqViewport} aria-label="Ejemplos de tareas en HelpMe">
            <div className={styles.mqTrack}>
              {[...marqueeCards, ...marqueeCards].map((card, index) => {
                const duplicated = index >= marqueeCards.length
                return (
                  <figure
                    className={styles.mqCard}
                    key={`${card.label}-${index}`}
                    aria-hidden={duplicated || undefined}
                  >
                    <img
                      src={card.image}
                      alt={duplicated ? '' : card.label}
                      width="300"
                      height="200"
                      loading="lazy"
                      decoding="async"
                    />
                    <figcaption className={styles.mqLabel}>{card.label}</figcaption>
                  </figure>
                )
              })}
            </div>
          </div>

          <BentoGrid />
        </div>
      </section>

      <section id="planes" className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <p className={styles.kicker}>Planes y pago retenido</p>
            <h2>Tu dinero no se libera hasta que la ayuda está hecha</h2>
          </div>

          <div className={styles.pricingBody}>
            <div className={styles.pricingLead}>
              <p className={styles.sectionLead}>
                Publica una tarea, elige helper y paga con pago retenido: el dinero solo se libera cuando
                confirmas la ayuda, y puedes pedir devolución total antes de liberarlo.
              </p>
              <div className={styles.heroActions}>
                <button type="button" className={styles.primaryCta} onClick={() => startJourney('need')}>
                  Publicar tarea
                </button>
                <button
                  type="button"
                  className={styles.primaryCtaSecondary}
                  onClick={() => startJourney('help')}
                >
                  Quiero ayudar
                </button>
              </div>
              <p className={styles.pricingReinforce}>Publicar es gratis · Premium opcional</p>
            </div>

            <div className={styles.pricingFlow}>
              <h4 className={styles.pricingFlowTitle}>Cómo funciona el pago retenido</h4>
              <ol className={styles.pricingTimeline}>
                {paymentTimeline.map((step, index) => (
                  <li key={step}>
                    <span className={styles.pricingStepNumber}>{index + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <ul className={styles.pricingSeals}>
            {trustSeals.map((seal) => (
              <li key={seal.text} className={styles.pricingSeal}>
                <seal.Icon className={styles.pricingSealIcon} aria-hidden="true" strokeWidth={1.8} />
                <span>{seal.text}</span>
              </li>
            ))}
          </ul>

          <div className={styles.pricingRoadmap}>
            <div className={styles.pricingRoadmapHeader}>
              <h3>Más adelante</h3>
              <p>
                Más adelante añadiremos opciones extra como revisión antes de liberar, destacar tareas urgentes
                y perfil Pro para helpers.
              </p>
            </div>
            <ul className={styles.pricingRoadmapGrid}>
              {roadmapItems.map((item) => (
                <li key={item.title} className={styles.pricingRoadmapCard}>
                  <item.Icon className={styles.pricingRoadmapIcon} aria-hidden="true" strokeWidth={1.8} />
                  <span>{item.title}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="confianza" className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={styles.sectionHeader}>
            <p className={styles.kicker}>Confianza</p>
            <h2>Confianza desde el primer mensaje</h2>
            <p className={styles.sectionLead}>Así cuidamos cada ayuda entre vecinos, de principio a fin</p>
          </div>

          <div
            ref={trustZig1Ref}
            className={`${styles.trustIntro} ${trustZig1InView ? styles.trustRevealed : ''}`.trim()}
          >
            <div className={styles.trustIntroText}>
              <p>
                Pedir ayuda a alguien que aún no conoces impone un poco, y es normal. Por eso en HelpMe
                siempre sabes con quién hablas, qué habéis acordado y qué pasa con tu dinero en cada momento.
              </p>
              <p>
                Publicar es gratis, la conversación queda por escrito dentro de la app y el pago espera
                retenido hasta que confirmas que la tarea está hecha.
              </p>
            </div>
            <figure className={styles.trustPhoto}>
              <img
                src="/images/confidence-door.webp"
                srcSet="/images/confidence-door-mobile.webp 760w, /images/confidence-door.webp 1200w"
                sizes="(max-width: 820px) 92vw, 37rem"
                alt="Una vecina mayor abre la puerta de casa y recibe sonriendo a la joven que viene a ayudarla"
                width="1200"
                height="750"
                loading="lazy"
                decoding="async"
              />
            </figure>
          </div>

          <ul className={styles.trustGrid}>
            {trustPoints.map((point) => (
              <li key={point.title} className={styles.trustCard}>
                <span className={styles.trustPointIcon} aria-hidden="true">
                  <point.Icon strokeWidth={1.8} />
                </span>
                <strong>{point.title}</strong>
                <p>{point.text}</p>
              </li>
            ))}
          </ul>

          <figure
            ref={trustZig2Ref}
            className={`${styles.trustBand} ${trustZig2InView ? styles.trustRevealed : ''}`.trim()}
          >
            <img
              src="/images/confidence-coffee.webp"
              srcSet="/images/confidence-coffee-mobile.webp 760w, /images/confidence-coffee.webp 1200w"
              sizes="(max-width: 820px) 92vw, 64rem"
              alt="Dos vecinos charlan tomando un café en la cocina después de terminar la compra"
              width="1200"
              height="514"
              loading="lazy"
              decoding="async"
            />
          </figure>

          <div className={styles.testimonials}>
            <h3 className={styles.testimonialsTitle}>Lo que dicen quienes ya la usan</h3>
            <div className={styles.testimonialGrid}>
              {TESTIMONIALS_PLACEHOLDER.map((testimonial) => (
                <article key={testimonial.name} className={styles.testimonialCard}>
                  <StarRating value={testimonial.stars} />
                  <blockquote className={styles.testimonialQuote}>{testimonial.quote}</blockquote>
                  <footer className={styles.testimonialAuthor}>
                    <span className={styles.testimonialAvatar} aria-hidden="true">
                      {testimonial.name.charAt(0)}
                    </span>
                    <div>
                      <strong>{testimonial.name}</strong>
                      <span>{testimonial.role}</span>
                    </div>
                  </footer>
                </article>
              ))}
            </div>
          </div>
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
        <div className={styles.footerGrid}>
          <div className={styles.footerBrand}>
            <BrandLogo size="md" variant="auto" />
            <p className={styles.footerTagline}>La ayuda que necesitas, cerca de ti</p>
            <p className={styles.footerClaim}>
              Vecinos que se echan una mano con recados, compras, mascotas y pequeñas gestiones del día a día.
            </p>
            <div className={styles.footerSocials}>
              {footerSocials.map((social) => (
                <a key={social.label} href={social.href} aria-label={social.label}>
                  <social.Icon />
                </a>
              ))}
            </div>
          </div>

          <nav className={styles.footerCol} aria-label="Producto">
            <h4>Producto</h4>
            {footerProductLinks.map((link) => (
              <a key={link.label} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>

          <nav className={styles.footerCol} aria-label="Empresa">
            <h4>Empresa</h4>
            {footerCompanyLinks.map((link) => (
              <a key={link.label} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>

          <nav className={styles.footerCol} aria-label="Contacto">
            <h4>Contacto</h4>
            <a href={`mailto:${FOOTER_CONTACT_EMAIL}`} className={styles.footerContactLink}>
              <Mail aria-hidden="true" focusable="false" />
              {FOOTER_CONTACT_EMAIL}
            </a>
            {/* PLACEHOLDER: enlace de soporte pendiente de definir */}
            <a href="#">Soporte</a>
          </nav>

          <nav className={styles.footerCol} aria-label="Legal">
            <h4>Legal</h4>
            <Link to="/legal/terms">Términos</Link>
            <Link to="/legal/privacy">Privacidad</Link>
            <Link to="/legal/cookies">Cookies</Link>
          </nav>
        </div>

        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear()} HelpMe. Todos los derechos reservados.</span>
        </div>
      </footer>

      <AuthModal open={authModal.open} mode={authModal.mode} onClose={closeAuth} onSuccess={handleAuthSuccess} />
      <CookieConsent />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(LANDING_JSONLD) }} />
    </main>
  )
}
