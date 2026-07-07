import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Sparkles, Sprout, Zap } from 'lucide-react'
import { BILLING_CYCLES, SUBSCRIPTION_PLANS } from '../../config/subscriptionPlans'
import { formatEuroAmount } from '../../lib/currency'
import styles from './Billing.module.css'

const PLAN_ICONS = {
  sprout: Sprout,
  sparkles: Sparkles,
  zap: Zap,
}

const CYCLE_ORDER = ['mensual', 'anual']

// Toggle segmentado Mensual/Anual con semántica de radiogroup: flechas para
// moverse entre opciones y foco que sigue a la selección.
function CycleToggle({ value, onChange }) {
  const optionRefs = useRef({})

  function handleKeyDown(event) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return

    event.preventDefault()
    const next = value === 'mensual' ? 'anual' : 'mensual'
    onChange(next)
    optionRefs.current[next]?.focus()
  }

  return (
    <div className={styles.cycleToggle} role="radiogroup" aria-label="Periodicidad de facturación">
      {CYCLE_ORDER.map((cycleId) => {
        const cycle = BILLING_CYCLES[cycleId]
        const selected = value === cycleId

        return (
          <button
            key={cycleId}
            ref={(node) => {
              optionRefs.current[cycleId] = node
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            className={selected ? `${styles.cycleOption} ${styles.cycleOptionActive}` : styles.cycleOption}
            onClick={() => onChange(cycleId)}
            onKeyDown={handleKeyDown}
          >
            {cycle.label}
            {cycle.savingsLabel ? <span className={styles.saveTag}>{cycle.savingsLabel}</span> : null}
          </button>
        )
      })}
    </div>
  )
}

function PlanCard({ plan, cycleId }) {
  const Icon = PLAN_ICONS[plan.icon] || Sprout
  const cycle = BILLING_CYCLES[cycleId]
  const price = plan.prices[cycleId]
  const isFree = price === 0
  const cardClass = plan.featured ? `${styles.planCard} ${styles.planCardFeatured}` : styles.planCard
  const ctaClass = plan.featured ? `primary-action ${styles.planCta}` : `secondary-action ${styles.planCta}`

  return (
    <article className={cardClass} aria-label={`Plan ${plan.name}`}>
      {plan.badge ? <span className={styles.planBadge}>{plan.badge}</span> : null}

      <span className={styles.planIcon} aria-hidden="true">
        <Icon size={22} />
      </span>
      <h2 className={styles.planName}>{plan.name}</h2>
      <p className={styles.planSubtitle}>{plan.subtitle}</p>

      <div className={styles.priceBlock}>
        <span className={styles.priceAmount}>{formatEuroAmount(price)}</span>
        <span className={styles.priceUnit}>{isFree ? '€' : cycle.unit}</span>
        {!isFree && cycle.note ? <p className={styles.priceNote}>{cycle.note}</p> : null}
      </div>

      <Link className={ctaClass} to={`/pago?plan=${plan.id}&ciclo=${cycleId}`}>
        {plan.ctaLabel}
      </Link>
      <p className={styles.ctaNote}>{plan.ctaNote}</p>

      <hr className={styles.planDivider} />

      <p className={styles.featuresHeading}>{plan.featuresHeading}</p>
      <ul className={styles.featureList}>
        {plan.features.map((feature) => (
          <li key={feature}>
            <Check size={16} className={styles.featureCheck} aria-hidden="true" />
            {feature}
          </li>
        ))}
      </ul>
    </article>
  )
}

// /planes — Pricing con toggle Mensual/Anual. Los datos viven en
// src/config/subscriptionPlans.js (maqueta, sin cobros reales).
export default function PlansPage() {
  const [cycleId, setCycleId] = useState('mensual')

  return (
    <main className={styles.page}>
      <header className={`${styles.pageHeader} ${styles.pageHeaderCentered}`}>
        <p className="eyebrow">Planes hechos para el barrio</p>
        <h1>Elige cómo quieres usar HelpMe</h1>
        <p className={styles.pageLead}>
          Pedir y ofrecer ayuda es gratis. Los planes añaden comodidad, visibilidad y prioridad.*
        </p>
        <CycleToggle value={cycleId} onChange={setCycleId} />
      </header>

      <div className={styles.plansGrid}>
        {SUBSCRIPTION_PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} cycleId={cycleId} />
        ))}
      </div>

      <p className={styles.legalNote}>
        * Precios con impuestos incluidos según tu región. Los planes de pago son opcionales y puedes
        cancelarlos cuando quieras desde Facturación; seguirías usando HelpMe con el plan Gratis.
      </p>
    </main>
  )
}
