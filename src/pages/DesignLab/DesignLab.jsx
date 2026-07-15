import { useMemo, useState } from 'react'
import TaskCard from '../../features/tasks/components/TaskCard/TaskCard'
import HelperCard from '../../features/home/need-help/components/HelperCard'
import MyRequestCard from '../../features/home/need-help/components/MyRequestCard'
import HomeEmptyState from '../../features/home/components/HomeEmptyState'
import EmptyChatState from '../../shared/ui/chat/EmptyChatState'
import MessageList from '../../shared/ui/chat/MessageList'
import MessageInput from '../../shared/ui/chat/MessageInput'
import UserAvatar from '../../shared/ui/UserAvatar'
import { PRICING_COPY } from '../../config/pricing'
import {
  createClusterMarkerIcon,
  createHelperMarkerIcon,
  createOwnTaskPinIcon,
  createTaskMarkerIcon,
  createUserMarkerIcon,
} from '../../shared/ui/map/mapMarkerIcons'
import paymentStyles from '../TaskPayment/TaskPaymentPage.module.css'
import drawerStyles from '../../features/home/need-help/components/MyRequestsDrawer.module.css'
import modalStyles from '../../features/home/offer-help/components/TaskPreviewModal.module.css'
import styles from './DesignLab.module.css'

const avatarDataUrl = `data:image/svg+xml,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop stop-color="#1f6b48"/>
        <stop offset="1" stop-color="#d9623b"/>
      </linearGradient>
    </defs>
    <rect width="160" height="160" rx="34" fill="url(#g)"/>
    <circle cx="80" cy="62" r="28" fill="#fff8"/>
    <path d="M35 132c8-30 82-30 90 0" fill="#fff8"/>
  </svg>
`)}`

const mockTask = {
  id: 'design-task-1',
  title: 'Subir compra semanal a casa',
  description: 'Ayuda puntual para subir bolsas y revisar que todo queda colocado en la cocina.',
  price: 24,
  category: 'Recados',
  status: 'assigned',
  created_at: new Date().toISOString(),
  published_at: new Date().toISOString(),
  location_label: 'Delicias, Zaragoza',
  creator_profile: {
    display_name: 'Laura Martín',
    username: 'laura',
    rating: 4.8,
    avatar_url: avatarDataUrl,
    verified: true,
  },
  accepted_profile: {
    display_name: 'Mario Torres',
    username: 'mario',
    rating: 4.9,
    avatar_url: '',
    verified: true,
  },
}

const mockOpenTask = {
  ...mockTask,
  id: 'design-task-2',
  title: 'Montar una estantería pequeña',
  status: 'open',
  price: 32,
  accepted_profile: null,
}

const mockHelper = {
  id: 'helper-design-1',
  display_name: 'Mario Torres',
  username: 'mario',
  rating: 4.9,
  reviews_count: 18,
  distance_km: 1.3,
  availability_enabled: true,
  avatar_url: avatarDataUrl,
  map_avatar_url: avatarDataUrl,
  bio: 'Ayudo con recados, montaje ligero y tareas domésticas con trato cercano.',
  skills: [
    { id: 'skill-1', name: 'Recados', category: 'Recados' },
    { id: 'skill-2', name: 'Montaje', category: 'Casa' },
    { id: 'skill-3', name: 'Acompañamiento', category: 'Cuidado' },
  ],
}

const mockMessages = [
  {
    id: 'message-1',
    sender_id: 'helper',
    body: 'Puedo pasar sobre las 18:00 y te aviso al llegar.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'message-2',
    sender_id: 'me',
    body: 'Perfecto, te dejo las indicaciones en el portal.',
    created_at: new Date().toISOString(),
    edited_at: new Date().toISOString(),
  },
]

const tokenGroups = [
  {
    title: 'Palette',
    tokens: [
      '--live-bg',
      '--live-surface',
      '--live-text',
      '--live-text-muted',
      '--live-primary',
      '--live-secondary',
      '--live-accent',
      '--live-danger',
      '--live-border-subtle',
    ],
  },
  {
    title: 'Buttons',
    tokens: [
      '--live-button-primary-bg',
      '--live-button-primary-text',
      '--live-button-secondary-bg',
      '--live-button-radius',
      '--live-button-shadow',
    ],
  },
  {
    title: 'Avatars and map',
    tokens: [
      '--live-avatar-bg',
      '--live-avatar-radius',
      '--live-avatar-shadow',
      '--live-map-marker-task-bg',
      '--live-map-marker-helper-bg',
      '--live-map-popup-bg',
    ],
  },
]

const swatchClassNames = {
  '--live-bg': styles.swatchLiveBg,
  '--live-surface': styles.swatchLiveSurface,
  '--live-text': styles.swatchLiveText,
  '--live-text-muted': styles.swatchLiveTextMuted,
  '--live-primary': styles.swatchLivePrimary,
  '--live-secondary': styles.swatchLiveSecondary,
  '--live-accent': styles.swatchLiveAccent,
  '--live-danger': styles.swatchLiveDanger,
  '--live-border-subtle': styles.swatchLiveBorderSubtle,
  '--live-button-primary-bg': styles.swatchLiveButtonPrimaryBg,
  '--live-button-primary-text': styles.swatchLiveButtonPrimaryText,
  '--live-button-secondary-bg': styles.swatchLiveButtonSecondaryBg,
  '--live-button-radius': styles.swatchLiveRadius,
  '--live-button-shadow': styles.swatchLiveShadow,
  '--live-avatar-bg': styles.swatchLiveAvatarBg,
  '--live-avatar-radius': styles.swatchLiveRadius,
  '--live-avatar-shadow': styles.swatchLiveShadow,
  '--live-map-marker-task-bg': styles.swatchLiveMapTaskBg,
  '--live-map-marker-helper-bg': styles.swatchLiveMapHelperBg,
  '--live-map-popup-bg': styles.swatchLiveMapPopupBg,
}

function DesignSection({ id, title, intro, children }) {
  return (
    <section id={id} className={styles.section}>
      <div className={styles.sectionHeader}>
        <p className={styles.kicker}>{String(id).padStart(2, '0')}</p>
        <h2>{title}</h2>
        {intro ? <p>{intro}</p> : null}
      </div>
      <div className={styles.sectionGrid}>{children}</div>
    </section>
  )
}

function SpecCard({ title, classNameLabel, variables = [], children, wide = false }) {
  return (
    <article className={`${styles.specCard} ${wide ? styles.wide : ''}`.trim()}>
      <div className={styles.specMeta}>
        <h3>{title}</h3>
        <p>
          Clase: <code>{classNameLabel}</code>
        </p>
        <ul>
          {variables.map((variable) => (
            <li key={variable}>
              <code>{variable}</code>
            </li>
          ))}
        </ul>
      </div>
      <div className={styles.preview}>{children}</div>
    </article>
  )
}

function MarkerPreview({ label, icon }) {
  return (
    <div className={styles.markerPreview}>
      <div
        className={icon.options.className}
        dangerouslySetInnerHTML={{ __html: icon.options.html }}
        aria-hidden="true"
      />
      <span>{label}</span>
    </div>
  )
}

function TokenSwatch({ token }) {
  return (
    <div className={styles.tokenSwatch}>
      <span className={`${styles.swatch} ${swatchClassNames[token] || ''}`.trim()} />
      <code>{token}</code>
    </div>
  )
}

export default function DesignLab() {
  const [draftMessage, setDraftMessage] = useState('Mensaje de prueba para revisar composer')
  const markers = useMemo(() => ({
    task: createTaskMarkerIcon({ task: mockOpenTask }),
    requester: createTaskMarkerIcon({ task: mockTask, selected: true, requester: true }),
    helper: createHelperMarkerIcon({ helper: mockHelper, selected: true }),
    user: createUserMarkerIcon({ avatarUrl: avatarDataUrl, initial: 'TU' }),
    cluster: createClusterMarkerIcon({ count: 8 }),
  }), [])

  // Waypoint de solicitud propia (mapa requester): glifo de la biblioteca de
  // diseño por categoría, sobre la carcasa de gota con badge de respuestas.
  const ownPins = useMemo(
    () =>
      ['Mascotas', 'Recados', 'Compras', 'Ayuda tecnica', 'Limpieza', 'Mudanza', 'Reparaciones', 'Clases', 'Cuidado', 'Tecnología', 'Otros'].map(
        (category, index) => ({
          category,
          icon: createOwnTaskPinIcon({
            task: { ...mockTask, category },
            responses: index === 0 ? 3 : 0,
            selected: index === 1,
          }),
        }),
      ),
    [],
  )

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.kicker}>HelpMe internal</p>
          <h1>Design Lab</h1>
          <p>
            Laboratorio local para probar el impacto de <code>theme-live.css</code> sobre componentes reales y estados
            críticos sin tocar datos, pagos ni flujos.
          </p>
        </div>
        <nav className={styles.nav} aria-label="Secciones del laboratorio">
          {['colors', 'type', 'buttons', 'forms', 'cards', 'tasks', 'helpers', 'payment', 'chat', 'map', 'states'].map((item) => (
            <a key={item} href={`#${item}`}>{item}</a>
          ))}
        </nav>
      </header>

      <DesignSection id="colors" title="Color tokens" intro="Variables editables en theme-live.css y aliases principales.">
        {tokenGroups.map((group) => (
          <SpecCard
            key={group.title}
            title={group.title}
            classNameLabel=":root"
            variables={group.tokens}
            wide
          >
            <div className={styles.tokenGrid}>
              {group.tokens.map((token) => <TokenSwatch key={token} token={token} />)}
            </div>
          </SpecCard>
        ))}
      </DesignSection>

      <DesignSection id="type" title="Typography" intro="Jerarquía actual de heading, body, muted y eyebrow.">
        <SpecCard
          title="Text scale"
          classNameLabel=".eyebrow, h1, p, .muted"
          variables={['--font-heading', '--font-body', '--color-text', '--color-text-muted']}
          wide
        >
          <div className={styles.typePreview}>
            <p className="eyebrow">Eyebrow label</p>
            <h1>Una tarea clara, cercana y accionable</h1>
            <p>Texto principal con lectura cómoda para explicar el siguiente paso sin ruido visual.</p>
            <p className="muted">Texto secundario para contexto, metadatos y ayuda.</p>
          </div>
        </SpecCard>
      </DesignSection>

      <DesignSection id="buttons" title="Buttons" intro="Acciones globales conectadas a tokens live.">
        <SpecCard
          title="Button primary"
          classNameLabel=".primary-action"
          variables={['--live-button-primary-bg', '--live-button-primary-text', '--live-button-radius', '--live-button-shadow']}
        >
          <button type="button" className="primary-action">Confirmar y pagar</button>
        </SpecCard>
        <SpecCard
          title="Button secondary"
          classNameLabel=".secondary-action"
          variables={['--live-button-secondary-bg', '--live-button-secondary-border', '--live-button-radius']}
        >
          <button type="button" className="secondary-action">Ver perfil</button>
        </SpecCard>
        <SpecCard
          title="Button danger"
          classNameLabel=".danger-action"
          variables={['--live-button-danger-bg', '--live-button-danger-text', '--live-button-radius']}
        >
          <button type="button" className="danger-action">Retirar solicitud</button>
        </SpecCard>
      </DesignSection>

      <DesignSection id="forms" title="Inputs/forms" intro="Campos con clases globales reales.">
        <SpecCard
          title="Input field"
          classNameLabel=".field input"
          variables={['--live-input-bg', '--live-input-text', '--live-input-border-focus', '--live-input-radius']}
        >
          <label className="field">
            <span>Zona</span>
            <input defaultValue="Delicias, Zaragoza" />
          </label>
        </SpecCard>
        <SpecCard
          title="Textarea field"
          classNameLabel=".field textarea"
          variables={['--live-input-bg', '--live-input-placeholder', '--live-input-shadow-focus']}
        >
          <label className="field">
            <span>Descripción</span>
            <textarea defaultValue="Necesito ayuda puntual durante la tarde." />
          </label>
        </SpecCard>
      </DesignSection>

      <DesignSection id="cards" title="Cards/panels" intro="Superficies globales y previews de modal/drawer sin overlays reales.">
        <SpecCard
          title="Detail panel"
          classNameLabel=".detail-panel"
          variables={['--hm-panel-bg', '--hm-panel-border', '--hm-panel-radius', '--hm-panel-shadow']}
        >
          <section className="detail-panel">
            <p className="eyebrow">Panel</p>
            <h3>Resumen de ayuda</h3>
            <p className="muted">Superficie base para información importante.</p>
          </section>
        </SpecCard>
        <SpecCard
          title="Modal preview"
          classNameLabel="TaskPreviewModal.module.css .modal"
          variables={['--hm-panel-bg', '--hm-panel-radius', '--hm-panel-shadow', '--hm-panel-scrim']}
        >
          <section className={`${modalStyles.modal} ${styles.embeddedModal}`}>
            <div className={modalStyles.header}>
              <div>
                <p className={modalStyles.eyebrow}>Solicitud cerca de ti</p>
                <h3 className={modalStyles.title}>Vista previa estática</h3>
              </div>
              <button type="button" className={modalStyles.closeButton} aria-label="Cerrar preview">×</button>
            </div>
            <p className={modalStyles.description}>Usa las clases reales del modal, renderizado sin overlay fixed.</p>
          </section>
        </SpecCard>
        <SpecCard
          title="Drawer preview"
          classNameLabel="MyRequestsDrawer.module.css .drawer"
          variables={['--hm-panel-bg', '--hm-panel-radius', '--hm-panel-shadow', '--hm-color-border-subtle']}
        >
          <aside className={`${drawerStyles.drawer} ${drawerStyles.inlineDrawer} ${styles.embeddedDrawer}`}>
            <header className={drawerStyles.header}>
              <div>
                <p className="eyebrow">Drawer</p>
                <h2>Mis solicitudes</h2>
              </div>
              <button type="button" className={drawerStyles.closeButton} aria-label="Cerrar preview">×</button>
            </header>
          </aside>
        </SpecCard>
      </DesignSection>

      <DesignSection id="tasks" title="Task components" intro="Componentes de tarea con mocks locales.">
        <SpecCard
          title="TaskCard"
          classNameLabel="TaskCard"
          variables={['--hm-task-card-bg', '--hm-task-card-border', '--hm-task-card-shadow', '--hm-avatar-bg']}
          wide
        >
          <TaskCard
            task={mockOpenTask}
            distanceKm={1.6}
            primaryActionLabel="Ver detalle"
            secondaryActionLabel="Guardar"
            onPrimaryAction={() => {}}
            onSecondaryAction={() => {}}
          />
        </SpecCard>
        <SpecCard
          title="Decision gate"
          classNameLabel=".detail-panel .decision-gate"
          variables={['--hm-panel-bg', '--hm-card-muted-bg', '--hm-button-primary-bg']}
          wide
        >
          <section className="detail-panel decision-gate">
            <p className="eyebrow">Oferta pendiente</p>
            <h2>Mario te ayudará con esta tarea</h2>
            <p>Confirma la tarea para pagar y abrir el chat privado.</p>
            <div className="detail-row total-row">
              <span>Precio</span>
              <strong>24 EUR</strong>
            </div>
            <div className="two-actions decision-actions">
              <button type="button" className="primary-action sticky-action">Confirmar y pagar</button>
              <button type="button" className="secondary-action sticky-action">Rechazar helper</button>
            </div>
          </section>
        </SpecCard>
        <SpecCard
          title="Requester card states"
          classNameLabel="MyRequestCard"
          variables={['--hm-card-bg', '--hm-card-border', '--hm-color-secondary', '--hm-button-primary-bg']}
          wide
        >
          <MyRequestCard task={mockTask} onOpenDetail={() => {}} />
        </SpecCard>
      </DesignSection>

      <DesignSection id="helpers" title="Helper/profile components" intro="Avatar, card de helper y datos de perfil.">
        <SpecCard
          title="UserAvatar"
          classNameLabel="UserAvatar"
          variables={['--live-avatar-bg', '--live-avatar-radius', '--live-avatar-shadow', '--live-avatar-object-fit']}
        >
          <div className={styles.avatarRow}>
            <UserAvatar src={avatarDataUrl} name="Laura Martín" alt="Laura Martín" size="lg" verified />
            <UserAvatar src="" name="Mario Torres" alt="Mario Torres" size="lg" variant="rounded" />
            <UserAvatar src="broken-avatar.jpg" name="Imagen rota" alt="Imagen rota" size="lg" />
          </div>
        </SpecCard>
        <SpecCard
          title="HelperCard"
          classNameLabel="HelperCard"
          variables={['--hm-card-bg', '--hm-card-border', '--hm-avatar-bg', '--hm-button-primary-bg']}
          wide
        >
          <HelperCard helper={mockHelper} selected onSelect={() => {}} onOpenProfile={() => {}} onContact={() => {}} />
        </SpecCard>
      </DesignSection>

      <DesignSection id="payment" title="Payment components" intro="Resumen de pago con clases reales de TaskPaymentPage.module.css.">
        <SpecCard
          title="Payment summary"
          classNameLabel="TaskPaymentPage.module.css .summaryCard"
          variables={['--hm-payment-panel-bg', '--hm-payment-panel-border', '--hm-payment-panel-radius', '--hm-payment-panel-shadow']}
          wide
        >
          <aside className={paymentStyles.summaryCard}>
            <div className={paymentStyles.priceRows}>
              <div>
                <span>Precio acordado</span>
                <strong>24,00 EUR</strong>
              </div>
              <div>
                <span>{PRICING_COPY.paymentValue}</span>
                <strong>Incluido</strong>
              </div>
              <div className={paymentStyles.totalRow}>
                <span>Total</span>
                <strong>24,00 EUR</strong>
              </div>
            </div>
            <p className={paymentStyles.notice}>{PRICING_COPY.heldUntilConfirm}</p>
            <button type="button" className="primary-action">{PRICING_COPY.paymentCta}</button>
          </aside>
        </SpecCard>
      </DesignSection>

      <DesignSection id="chat" title="Chat components" intro="Burbujas, estado vacío y composer compartidos.">
        <SpecCard
          title="Message list"
          classNameLabel="MessageList / MessageBubble"
          variables={['--hm-color-surface', '--hm-color-primary', '--hm-color-border-subtle', '--shadow-xs']}
          wide
        >
          {/* Handlers no-op para exhibir la anatomía completa: acciones
              Editar/Borrar y el modo de edición inline de la burbuja. */}
          <MessageList
            messages={mockMessages}
            currentUserId="me"
            counterpartName="Aroa"
            onEditMessage={async () => {}}
            onDeleteMessage={async () => {}}
          />
        </SpecCard>
        <SpecCard
          title="Message composer"
          classNameLabel="MessageInput"
          variables={['--live-input-bg', '--hm-button-primary-bg', '--hm-button-radius']}
          wide
        >
          <MessageInput value={draftMessage} onChange={setDraftMessage} onSubmit={() => {}} dense />
        </SpecCard>
        <SpecCard
          title="Empty chat"
          classNameLabel="EmptyChatState"
          variables={['--hm-card-bg', '--hm-card-border', '--hm-card-radius']}
        >
          <EmptyChatState />
        </SpecCard>
      </DesignSection>

      <DesignSection id="map" title="Map markers" intro="HTML de Leaflet generado por los builders centralizados.">
        <SpecCard
          title="Markers"
          classNameLabel="createTaskMarkerIcon / createHelperMarkerIcon"
          variables={['--live-map-marker-task-bg', '--live-map-marker-helper-bg', '--live-map-marker-shadow', '--live-map-popup-bg']}
          wide
        >
          <div className={styles.markerGrid}>
            <MarkerPreview label="Task" icon={markers.task} />
            <MarkerPreview label="Tu tarea" icon={markers.requester} />
            <MarkerPreview label="Helper" icon={markers.helper} />
            <MarkerPreview label="Usuario" icon={markers.user} />
            <MarkerPreview label="Cluster futuro" icon={markers.cluster} />
          </div>
        </SpecCard>
        <SpecCard
          title="Waypoint de solicitud propia (por categoría)"
          classNameLabel="createOwnTaskPinIcon + src/design/categoryIconSvg"
          variables={['--hm-color-primary', '--hm-map-marker-shadow']}
          wide
        >
          <div className={styles.markerGrid}>
            {ownPins.map((pin) => (
              <MarkerPreview key={pin.category} label={pin.category} icon={pin.icon} />
            ))}
          </div>
        </SpecCard>
      </DesignSection>

      <DesignSection id="states" title="States" intro="Estados de carga, vacío, error y header con punto sin badge.">
        <SpecCard
          title="State header"
          classNameLabel=".stateHeader .stateDot"
          variables={['--hm-color-primary', '--hm-color-border-subtle', '--hm-card-bg']}
        >
          <div className={styles.stateHeader}>
            <span className={styles.stateDot} aria-hidden="true" />
            <div>
              <strong>Sin badge, con punto</strong>
              <p>Estado activo mostrado sin píldora pesada.</p>
            </div>
          </div>
        </SpecCard>
        <SpecCard
          title="Empty state"
          classNameLabel="HomeEmptyState"
          variables={['--hm-card-bg', '--hm-card-border', '--hm-button-primary-bg']}
        >
          <HomeEmptyState
            title="No hay tareas cerca"
            description="Mueve el mapa o cambia filtros para ampliar la búsqueda."
            actionLabel="Revisar filtros"
            onAction={() => {}}
          />
        </SpecCard>
        <SpecCard
          title="Error state"
          classNameLabel=".auth-message.error"
          variables={['--color-danger', '--hm-card-bg', '--hm-color-border-subtle']}
        >
          <p className="auth-message error">No se pudo cargar esta vista. Reintenta en unos segundos.</p>
        </SpecCard>
        <SpecCard
          title="Loading skeleton"
          classNameLabel=".skeleton"
          variables={['--hm-card-muted-bg', '--hm-color-surface', '--hm-radius-md']}
        >
          <div className={styles.skeletonStack} aria-hidden="true">
            <span className={styles.skeletonLine} />
            <span className={styles.skeletonLineShort} />
            <span className={styles.skeletonBlock} />
          </div>
        </SpecCard>
      </DesignSection>
    </main>
  )
}
