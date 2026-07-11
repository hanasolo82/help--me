import { useMemo } from 'react'
import { formatEuro } from '../../lib/currency'
import { COMMITTED_STATUSES } from './paymentStatus'
import styles from './Payments.module.css'

// Gráfica SVG propia (sin librerías) de gastos y cobros por mes, últimos 6
// meses incluidos los vacíos. Especificación siguiendo la skill dataviz:
// barras finas (≤24px) con remate superior redondeado 4px y base recta,
// hueco de 2px de superficie entre barras contiguas, gridlines de 1px con
// var(--color-border), texto de ejes en tokens de texto (nunca el color de la
// serie), leyenda con texto para las 2 series, tooltips nativos (<title>),
// tabla oculta accesible con los datos y sin animaciones de entrada.

const VIEW_WIDTH = 640
const VIEW_HEIGHT = 240
const MARGIN = { top: 10, right: 8, bottom: 26, left: 56 }
const PLOT_WIDTH = VIEW_WIDTH - MARGIN.left - MARGIN.right
const PLOT_HEIGHT = VIEW_HEIGHT - MARGIN.top - MARGIN.bottom
const BASELINE_Y = MARGIN.top + PLOT_HEIGHT
const MAX_BAR_WIDTH = 24
const PAIR_GAP = 2 // hueco de superficie entre las dos barras del grupo

function formatCents(cents) {
  return formatEuro((Number(cents) || 0) / 100)
}

/** Tick compacto: "120 €", "2,5 €" (sin decimales cuando no hacen falta). */
const tickFormatter = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

function formatTick(cents) {
  return tickFormatter.format(cents / 100)
}

/** "ene", "feb"… (sin el punto final que añade algún runtime). */
function monthLabel(date) {
  return date.toLocaleDateString('es-ES', { month: 'short' }).replace(/\.$/, '')
}

/** Paso "bonito" (1/2/2.5/5 × 10^n, en céntimos) para 3 ticks del eje Y. */
function niceStep(maxValue, targetTicks = 3) {
  const rough = maxValue / targetTicks
  const power = 10 ** Math.floor(Math.log10(rough))
  for (const candidate of [1, 2, 2.5, 5, 10]) {
    if (rough <= candidate * power) return candidate * power
  }
  return 10 * power
}

/** Barra con remate superior redondeado (máx 4px) y base recta. */
function roundedTopBar(x, y, width, height) {
  const r = Math.min(4, width / 2, height)
  const right = x + width
  return [
    `M${x},${y + height}`,
    `L${x},${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `L${right - r},${y}`,
    `Q${right},${y} ${right},${y + r}`,
    `L${right},${y + height}`,
    'Z',
  ].join(' ')
}

export default function ActivityChart({ payments = [], userId }) {
  const months = useMemo(() => {
    const now = new Date()
    const buckets = []
    const indexByKey = new Map()

    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1)
      const key = `${date.getFullYear()}-${date.getMonth()}`
      indexByKey.set(key, buckets.length)
      buckets.push({
        key,
        label: monthLabel(date),
        fullLabel: date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
        expenses: 0,
        income: 0,
      })
    }

    for (const payment of payments) {
      const date = new Date(payment.created_at)
      if (Number.isNaN(date.getTime())) continue

      const index = indexByKey.get(`${date.getFullYear()}-${date.getMonth()}`)
      if (index === undefined) continue

      if (payment.requester_profile_id === userId && COMMITTED_STATUSES.has(payment.status)) {
        buckets[index].expenses += Number(payment.amount_cents) || 0
      }

      if (payment.helper_profile_id === userId && payment.status === 'released') {
        buckets[index].income += Number(payment.helper_amount_cents) || 0
      }
    }

    return buckets
  }, [payments, userId])

  const maxValue = Math.max(...months.map((month) => Math.max(month.expenses, month.income)))

  if (maxValue <= 0) {
    return <p className={`muted ${styles.emptyNote}`}>Sin actividad en los últimos 6 meses.</p>
  }

  const step = niceStep(maxValue)
  const tickCount = Math.max(1, Math.ceil(maxValue / step))
  const scaleMax = step * tickCount
  const ticks = Array.from({ length: tickCount }, (_, index) => step * (index + 1))

  const band = PLOT_WIDTH / months.length
  const barWidth = Math.min(MAX_BAR_WIDTH, (band - PAIR_GAP) / 2 - 6)
  const pairWidth = barWidth * 2 + PAIR_GAP

  const totalExpenses = months.reduce((sum, month) => sum + month.expenses, 0)
  const totalIncome = months.reduce((sum, month) => sum + month.income, 0)
  const summary =
    `Gráfica de barras de los últimos 6 meses: ${formatCents(totalExpenses)} en gastos y ` +
    `${formatCents(totalIncome)} en cobros. Los datos mes a mes están en la tabla que sigue.`

  function barHeight(value) {
    return (value / scaleMax) * PLOT_HEIGHT
  }

  return (
    <div className={styles.chart}>
      <svg
        className={styles.chartSvg}
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        role="img"
        aria-label={summary}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Gridlines + ticks del eje Y (recesivos, 1px) */}
        {ticks.map((tick) => {
          const y = BASELINE_Y - (tick / scaleMax) * PLOT_HEIGHT
          return (
            <g key={tick}>
              <line
                className={styles.chartGrid}
                x1={MARGIN.left}
                x2={VIEW_WIDTH - MARGIN.right}
                y1={y}
                y2={y}
              />
              <text className={styles.chartAxisText} x={MARGIN.left - 8} y={y + 3.5} textAnchor="end">
                {formatTick(tick)}
              </text>
            </g>
          )
        })}

        {/* Línea base */}
        <line
          className={styles.chartBaseline}
          x1={MARGIN.left}
          x2={VIEW_WIDTH - MARGIN.right}
          y1={BASELINE_Y}
          y2={BASELINE_Y}
        />

        {months.map((month, index) => {
          const groupStart = MARGIN.left + band * index + (band - pairWidth) / 2
          const expenseHeight = barHeight(month.expenses)
          const incomeHeight = barHeight(month.income)

          return (
            <g key={month.key}>
              {month.expenses > 0 ? (
                <path
                  className={styles.barExpense}
                  d={roundedTopBar(groupStart, BASELINE_Y - expenseHeight, barWidth, expenseHeight)}
                >
                  <title>{`${month.label}: ${formatCents(month.expenses)} gastos`}</title>
                </path>
              ) : null}
              {month.income > 0 ? (
                <path
                  className={styles.barIncome}
                  d={roundedTopBar(
                    groupStart + barWidth + PAIR_GAP,
                    BASELINE_Y - incomeHeight,
                    barWidth,
                    incomeHeight,
                  )}
                >
                  <title>{`${month.label}: ${formatCents(month.income)} cobros`}</title>
                </path>
              ) : null}
              <text
                className={styles.chartAxisText}
                x={MARGIN.left + band * index + band / 2}
                y={BASELINE_Y + 16}
                textAnchor="middle"
              >
                {month.label}
              </text>
            </g>
          )
        })}
      </svg>

      <div className={styles.chartLegend}>
        <span className={styles.legendItem}>
          <span className={`${styles.legendSwatch} ${styles.legendSwatchExpense}`} aria-hidden="true" />
          Gastos
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.legendSwatch} ${styles.legendSwatchIncome}`} aria-hidden="true" />
          Cobros
        </span>
      </div>

      {/* Alternativa accesible: los mismos datos, mes a mes, en tabla */}
      <table className={styles.visuallyHidden}>
        <caption>Gastos y cobros por mes, últimos 6 meses</caption>
        <thead>
          <tr>
            <th scope="col">Mes</th>
            <th scope="col">Gastos</th>
            <th scope="col">Cobros</th>
          </tr>
        </thead>
        <tbody>
          {months.map((month) => (
            <tr key={month.key}>
              <td>{month.fullLabel}</td>
              <td>{formatCents(month.expenses)}</td>
              <td>{formatCents(month.income)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
