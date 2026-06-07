import HelperCard from './HelperCard'
import HelperFiltersBar from './HelperFiltersBar'
import HomeEmptyState from '../../components/HomeEmptyState'
import styles from './NeedHelpMapLayout.module.css'

export default function HelperListPanel({
  visibleHelpers = [],
  selectedHelperId = null,
  onSelectHelper,
  onOpenProfile,
  onContact,
  skillFilters = [],
  selectedSkillId = 'all',
  onSkillChange,
  loading = false,
  error = '',
  hasLocation = false,
  locationError = '',
  onRequestLocation,
  onPublishRequest,
}) {
  return (
    <aside className={styles.panelShell}>
      <HelperFiltersBar
        skillFilters={skillFilters}
        selectedSkillId={selectedSkillId}
        onSkillChange={onSkillChange}
      />

      {!hasLocation && (
        <section className={styles.locationBanner}>
          <strong>Activa tu ubicación para orientar el mapa.</strong>
          <p className="muted">
            {locationError || 'También puedes buscar una zona desde el header para explorar helpers disponibles.'}
          </p>
          {onRequestLocation && (
            <button type="button" className="primary-action" onClick={onRequestLocation}>
              Usar mi ubicación
            </button>
          )}
        </section>
      )}

      {loading && <p className="muted">Buscando helpers cercanos...</p>}
      {error && <p className="auth-message error">{error}</p>}

      <div className={styles.listScroll}>
        {!loading && !error && visibleHelpers.length === 0 ? (
          <HomeEmptyState
            title="No hay personas disponibles en esta parte del mapa"
            description="Activa tu ubicación, amplía el mapa o publica una solicitud para que la comunidad pueda responder."
            actionLabel={onPublishRequest ? 'Publicar solicitud' : onRequestLocation ? 'Usar mi ubicación' : null}
            onAction={onPublishRequest || onRequestLocation}
            tone="warning"
          />
        ) : null}

        {visibleHelpers.map((helper) => (
          <HelperCard
            key={helper.id}
            helper={helper}
            selected={selectedHelperId === helper.id}
            onSelect={onSelectHelper}
            onOpenProfile={onOpenProfile}
            onContact={onContact}
          />
        ))}
      </div>
    </aside>
  )
}
