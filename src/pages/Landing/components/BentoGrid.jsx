import styles from './BentoGrid.module.css'

// Iconos SVG de línea (stroke currentColor). El color lo pone el contenedor (.iconBox).
// El data-icon permite disparar una microanimación distinta por categoría al hover de la tarjeta.
function PawIcon() {
  return (
    <svg
      className={styles.icon}
      data-icon="paw"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="11" cy="4" r="2" />
      <circle cx="18" cy="8" r="2" />
      <circle cx="20" cy="16" r="2" />
      <path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg
      className={styles.icon}
      data-icon="list"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M11 12H3" />
      <path d="M16 6H3" />
      <path d="M16 18H3" />
      <path className={styles.tick} d="m19 10-2 2 2 2" />
    </svg>
  )
}

function CartIcon() {
  return (
    <svg
      className={styles.icon}
      data-icon="cart"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  )
}

function WrenchIcon() {
  return (
    <svg
      className={styles.icon}
      data-icon="wrench"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  )
}

const ICONS = {
  paw: PawIcon,
  list: ListIcon,
  cart: CartIcon,
  wrench: WrenchIcon,
}

const BENTO_ITEMS = [
  {
    title: 'Mascotas',
    meta: 'Disponible',
    desc: 'Paseos, cuidados puntuales o una mano cuando necesitas salir sin apuro.',
    tags: ['Paseos', 'Cuidados'],
    icon: 'paw',
    span: 2,
  },
  {
    title: 'Recados',
    meta: 'Rápido',
    desc: 'Pequeños encargos resueltos sin mover toda tu agenda.',
    tags: ['Gestiones'],
    icon: 'list',
    span: 1,
  },
  {
    title: 'Compras',
    meta: 'Cerca',
    desc: 'Lo que falta, comprado cerca y entregado con sencillez.',
    tags: ['Entrega'],
    icon: 'cart',
    span: 1,
  },
  {
    title: 'Ayuda técnica',
    meta: 'Soporte',
    desc: 'Dudas, ajustes y pequeñas tareas que se resuelven mejor con alguien al lado.',
    tags: ['Móvil', 'PC'],
    icon: 'wrench',
    span: 2,
  },
]

export default function BentoGrid({ items = BENTO_ITEMS }) {
  return (
    <div className={styles.grid}>
      {items.map((item) => {
        const Icon = ICONS[item.icon] ?? ICONS.list
        const cardClassName = item.span === 2 ? `${styles.card} ${styles.cardWide}` : styles.card

        return (
          <article key={item.title} className={cardClassName}>
            <span className={styles.glow} aria-hidden="true" />
            <div className={styles.top}>
              <span className={styles.iconBox}>
                <Icon />
              </span>
              <span className={styles.badge}>{item.meta}</span>
            </div>
            <h3 className={styles.title}>{item.title}</h3>
            <p className={styles.desc}>{item.desc}</p>
            <div className={styles.tags}>
              {item.tags.map((tag) => (
                <span key={tag} className={styles.tag}>
                  #{tag}
                </span>
              ))}
            </div>
          </article>
        )
      })}
    </div>
  )
}
