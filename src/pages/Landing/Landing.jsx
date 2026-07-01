import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PencilLine, Users, CheckCircle2 } from 'lucide-react'
import styles from './Landing.module.css'
import { getCurrentUser } from '../../services/authService'
import AuthModal from '../../shared/components/AuthModal/AuthModal'
import CookieConsent from '../../shared/components/CookieConsent/CookieConsent'
import { useDocumentMeta } from '../../shared/hooks/useDocumentMeta'
import { useInView } from '../../shared/hooks/useInView'
import { useScrollReveal } from '../../shared/hooks/useScrollReveal'
import { setHelperHomeIntent } from '../../features/helper-onboarding/services/helperIntentStorage'
import { PRICING_COPY, PRICING_PLANS } from '../../config/pricing'
import BentoGrid from './components/BentoGrid'
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
        {
          '@type': 'Question',
          name: '¿Cuanto cuesta usar helpMe?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Publicar una tarea es gratis. En la beta cerrada, el pago retenido hasta confirmar está incluido sin comisión de HelpMe.',
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

// Informativo: deriva precios/visibilidad de src/config/pricing.js. No activa cobros.
function formatEur(cents) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(cents || 0) / 100)
}

function formatPct(bps) {
  return `${Number(bps || 0) / 100}%`
}

// Izquierda del plan: qué incluye (valor). Derecha: cómo funciona (flujo). Sin solaparse.
const heldHeroIncludes = [
  'Publicar tarea, gratis',
  'Pago retenido hasta confirmar',
  'El helper ve el 100% del precio',
  'Chat y valoración incluidos',
]

const heldPaymentSteps = [
  'Publicas y pagas; el dinero queda retenido.',
  'Coordináis por chat hasta que la ayuda esté hecha.',
  'Confirmas, liberas el pago y valoras.',
]

const pricingPlans = [
  {
    id: 'held',
    name: 'Pago retenido',
    badge: 'Disponible ahora',
    available: true,
    price: 'Sin comisión en beta cerrada',
    priceNote: 'Publicar es gratis',
    features: [
      'Publicar tarea gratis',
      PRICING_COPY.paymentValue,
      PRICING_COPY.helperKeepsPrice,
      'Chat disponible tras el pago',
      'Valoración al cierre',
    ],
  },
  {
    id: 'plus',
    name: 'Protección Plus',
    badge: 'Próximamente',
    available: false,
    price: `GA estimado: ${formatPct(PRICING_PLANS.plus.ga.commissionBps)} + ${formatEur(PRICING_PLANS.plus.ga.minimumFeeCents)} mín.`,
    features: [
      'Revisión antes de liberar',
      PRICING_COPY.reportBeforeRelease,
      'Soporte humano',
    ],
  },
  {
    id: 'urgent',
    name: 'Urgente / Destacar',
    badge: 'Próximamente',
    available: false,
    price: `GA estimado: +${formatEur(PRICING_PLANS.urgentBoost.ga.fixedFeeCents)} por tarea`,
    features: ['Más visibilidad para tu tarea durante un tiempo'],
  },
  {
    id: 'helperPro',
    name: 'Helper Pro',
    badge: 'Más adelante',
    available: false,
    price: `GA estimado: ${formatEur(PRICING_PLANS.helperPro.ga.monthlyPriceCents)}/mes`,
    features: ['Badge de helper', 'Más visibilidad', 'Estadísticas de tu actividad'],
  },
]

const heldPlan = pricingPlans.find((plan) => plan.available)
const comingSoonPlans = pricingPlans.filter((plan) => !plan.available)

// Carrusel "para qué se usa": solo hay 3 imágenes reales; se reutilizan con etiquetas distintas.
// Versión -mobile (700-800w) basta de sobra para tarjetas de 230×150.
const marqueeCards = [
  { image: '/images/helpgrandmom-mobile.webp', label: 'Acompañar a mayores' },
  { image: '/images/homeworks-mobile.webp', label: 'Tareas del hogar' },
  { image: '/images/walkdog-mobile.webp', label: 'Pasear al perro' },
  { image: '/images/helpgrandmom-mobile.webp', label: 'Ayuda con el móvil' },
  { image: '/images/homeworks-mobile.webp', label: 'Organizar la casa' },
  { image: '/images/walkdog-mobile.webp', label: 'Recados y paseos' },
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
  const landingRef = useRef(null)
  const [heroIndex, setHeroIndex] = useState(0)
  const [stepsRef, stepsInView] = useInView({ threshold: 0.25 })

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
        <div className={styles.heroFullContent}>
          <p className={styles.heroFullEyebrow}>Ayuda cercana</p>
          <h1 className={styles.heroFullTitle}>La ayuda que necesitas, cerca de ti</h1>
          <p className={styles.heroFullSub}>
            Conecta en minutos con personas cercanas listas para ayudarte con lo cotidiano. Simple, claro y sin
            complicaciones.
          </p>
          <div className={styles.heroFullActions}>
            <button type="button" className={styles.heroFullPrimary} onClick={() => startJourney('need')}>
              Necesito ayuda
            </button>
            <button type="button" className={styles.heroFullGhost} onClick={() => startJourney('help')}>
              Quiero ayudar
            </button>
          </div>
        </div>
      </section>

      <section id="como-funciona" className={styles.section}>
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
      </section>

      <section id="categorias" className={styles.section}>
        <div className={styles.sectionHeader}>
          <p className={styles.kicker}>Categorías</p>
          <h2>Todo lo cotidiano, mejor resuelto</h2>
          <p className={styles.sectionLead}>Cientos de tareas cotidianas resueltas cerca de ti</p>
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
      </section>

      <section id="planes" className={styles.section}>
        <div className={styles.sectionHeader}>
          <p className={styles.kicker}>Planes y pago retenido</p>
          <h2>Empieza gratis, con el pago protegido por dentro</h2>
          <p className={styles.sectionLead}>{PRICING_COPY.paymentSummary}</p>
        </div>

        {heldPlan ? (
          <article className={styles.pricingHero}>
            <div className={styles.pricingHeroMain}>
              <span className={`${styles.planBadge} ${styles.planBadgeActive}`}>{heldPlan.badge}</span>
              <h3 className={styles.pricingHeroName}>{heldPlan.name}</h3>
              <p className={styles.pricingHeroPrice}>{heldPlan.price}</p>
              {heldPlan.priceNote ? <p className={styles.pricingHeroPriceNote}>{heldPlan.priceNote}</p> : null}
              <ul className={styles.pricingHeroFeatures}>
                {heldHeroIncludes.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <button type="button" className={styles.primaryCta} onClick={() => startJourney('need')}>
                Publicar tarea
              </button>
            </div>

            <aside className={styles.pricingHeroAside}>
              <h4>Cómo funciona el pago retenido</h4>
              <ol className={styles.pricingSteps}>
                {heldPaymentSteps.map((step, index) => (
                  <li key={step}>
                    <span className={styles.pricingStepNumber}>{index + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <p className={styles.pricingBetaNote}>{PRICING_COPY.betaNoCommission}</p>
            </aside>
          </article>
        ) : null}

        <div className={styles.pricingSoonHeader}>
          <h3>Próximamente</h3>
          <p>
            Planes previstos para más adelante. Aún no son contratables; los precios son estimaciones para
            cuando se activen.
          </p>
        </div>

        <div className={styles.pricingSoonGrid}>
          {comingSoonPlans.map((plan) => (
            <article key={plan.id} className={styles.pricingSoonCard} aria-disabled="true">
              <span className={styles.planBadge}>{plan.badge}</span>
              <h4>{plan.name}</h4>
              <p className={styles.planPrice}>{plan.price}</p>
              <ul className={styles.planFeatures}>
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section id="confianza" className={styles.section}>
        <div className={styles.sectionHeader}>
          <p className={styles.kicker}>Confianza</p>
          <h2>Diseñado para generar confianza desde el primer minuto</h2>
        </div>

        <div className={styles.zigzag}>
          <figure className={styles.zzImage}>
            <img
              src="/images/helpgrandmom.webp"
              srcSet="/images/helpgrandmom-mobile.webp 700w, /images/helpgrandmom.webp 1200w"
              sizes="(max-width: 820px) 92vw, 34rem"
              alt="Una persona joven ayuda a una persona mayor con el móvil"
              width="1200"
              height="675"
              loading="lazy"
              decoding="async"
            />
          </figure>
          <div className={styles.zzText}>
            <p>
              Perfiles claros, estados visibles y una experiencia enfocada en la transparencia para que cada paso se
              entienda sin esfuerzo.
            </p>
          </div>
        </div>

        <div className={`${styles.zigzag} ${styles.zigzagReverse}`}>
          <figure className={styles.zzImage}>
            <img
              src="/images/homeworks.webp"
              srcSet="/images/homeworks-mobile.webp 700w, /images/homeworks.webp 1200w"
              sizes="(max-width: 820px) 92vw, 34rem"
              alt="Un vecino entrega la compra a otra persona en el portal"
              width="1200"
              height="675"
              loading="lazy"
              decoding="async"
            />
          </figure>
          <div className={styles.zzText}>
            <div className={styles.metrics}>
              {metrics.map((metric) => (
                <article key={metric.label}>
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
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
