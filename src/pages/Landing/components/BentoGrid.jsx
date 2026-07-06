import { useCallback, useRef } from 'react'
import styles from './BentoGrid.module.css'

// Iconos SVG de línea (stroke currentColor). El color lo pone el contenedor (.iconBox).
// El data-icon dispara la microanimación en bucle propia de cada categoría (ver CSS).
function PawIcon() {
  return (
    <svg
      className={styles.icon}
      data-icon="paw"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
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
      strokeWidth="2"
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
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle className={styles.wheel} cx="8" cy="21" r="1" />
      <circle className={styles.wheel} cx="19" cy="21" r="1" />
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
      strokeWidth="2"
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
    desc: 'Alguien de confianza que cuide de tu mascota cuando tú no puedes.',
    tasks: ['Pasear al perro', 'Darle de comer', 'Llevarlo al veterinario', 'Cuidarlo un fin de semana'],
    tags: ['Paseos', 'Cuidados'],
    icon: 'paw',
  },
  {
    title: 'Recados',
    desc: 'Esas gestiones pendientes que tú no llegas a hacer, las hace un vecino.',
    tasks: ['Recoger un paquete', 'Hacer una gestión', 'Llevar documentos', 'Esperar una entrega'],
    tags: ['Gestiones'],
    icon: 'list',
  },
  {
    title: 'Compras',
    desc: 'Tu compra, hecha por alguien que ya está cerca y te la lleva a casa.',
    tasks: ['Compra del súper', 'Ir a la farmacia', 'Comprar lo que te falta', 'Compra del mercado'],
    tags: ['Entrega'],
    icon: 'cart',
  },
  {
    title: 'Ayuda técnica',
    desc: 'Móvil, ordenador o aplicaciones: todo es más fácil si te lo explican en persona.',
    tasks: ['Configurar el móvil', 'Preparar una videollamada', 'Instalar una app', 'Resolver dudas con el PC'],
    tags: ['Móvil', 'PC'],
    icon: 'wrench',
  },
]

// Spotlight que sigue al ratón dentro de cada card (efecto "magic card").
// Se actualiza por style directo + rAF para no forzar un re-render de React en cada mousemove.
// rafIds guarda un id de frame pendiente por índice de card, así las 4 cards son independientes.
function useGlowSpotlight() {
  const rafIds = useRef({})

  const handleMouseMove = useCallback((event, index) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (rafIds.current[index]) return

    const card = event.currentTarget
    const { clientX, clientY } = event

    rafIds.current[index] = requestAnimationFrame(() => {
      rafIds.current[index] = null
      const rect = card.getBoundingClientRect()
      card.style.setProperty('--mouse-x', `${clientX - rect.left}px`)
      card.style.setProperty('--mouse-y', `${clientY - rect.top}px`)
    })
  }, [])

  const handleMouseLeave = useCallback((event) => {
    event.currentTarget.style.removeProperty('--mouse-x')
    event.currentTarget.style.removeProperty('--mouse-y')
  }, [])

  return { handleMouseMove, handleMouseLeave }
}

export default function BentoGrid({ items = BENTO_ITEMS }) {
  const { handleMouseMove, handleMouseLeave } = useGlowSpotlight()

  return (
    <div className={styles.grid}>
      {items.map((item, index) => {
        const Icon = ICONS[item.icon] ?? ICONS.list

        return (
          <article
            key={item.title}
            className={styles.card}
            style={{ '--card-index': index }}
            onMouseMove={(event) => handleMouseMove(event, index)}
            onMouseLeave={handleMouseLeave}
          >
            <span className={styles.glow} aria-hidden="true" />
            <span className={styles.iconBox}>
              <span className={styles.iconAura} aria-hidden="true" />
              <Icon />
            </span>
            <h3 className={styles.title}>{item.title}</h3>
            <p className={styles.desc}>{item.desc}</p>
            <ul className={styles.taskList}>
              {item.tasks.map((task) => (
                <li key={task}>{task}</li>
              ))}
            </ul>
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
