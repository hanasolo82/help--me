import HelperCard from './HelperCard'
import HomeEmptyState from '../../components/HomeEmptyState'
import styles from './NeedHelpMapLayout.module.css'

export default function HelperListPanel({
  visibleHelpers = [],
  selectedHelperId = null,
  onSelectHelper,
  onLocateHelper,
  onOpenProfile,
  onContact,
  loading = false,
  refreshing = false,
  error = '',
  searchQuery = '',
  hasLocation = false,
  locationError = '',
  onRequestLocation,
  onPublishRequest,
  onExpandMap,
  totalResults = null,
  visibleInMapCount = 0,
}) {
  const activeSearchQuery = String(searchQuery || '').trim()
  const hasSearchQuery = activeSearchQuery.length >= 3

  return (
    <aside className={styles.panelShell}>
      <header className={styles.helperListHeader}>
        <p className="eyebrow">Helpers disponibles</p>
        <h2>{hasSearchQuery ? 'Resultados de habilidades' : 'Ayuda cercana'}</h2>
        <p className="muted" aria-live="polite">
          {hasSearchQuery && refreshing
            ? `Buscando helpers para “${activeSearchQuery}”...`
            : hasSearchQuery
            ? `${totalResults ?? visibleHelpers.length} ${Number(totalResults ?? visibleHelpers.length) === 1 ? 'resultado' : 'resultados'} para “${activeSearchQuery}” · ${visibleInMapCount} visibles en el mapa.`
            : 'La lista se actualiza con los chips de categoría del mapa.'}
        </p>
      </header>

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
      {!loading && refreshing ? <p className="muted" aria-live="polite">Actualizando resultados...</p> : null}
      {error && <p className="auth-message error">{error}</p>}

      <div className={styles.listScroll}>
        {!loading && !refreshing && !error && visibleHelpers.length === 0 ? (
          <HomeEmptyState
            title={hasSearchQuery
              ? `No encontramos helpers para “${activeSearchQuery}”`
              : 'No hay personas disponibles en esta parte del mapa'}
            description={hasSearchQuery
              ? 'Prueba con una habilidad más breve, amplía la zona o publica una solicitud.'
              : 'Amplía la zona del mapa o publica una solicitud para que la comunidad pueda responder.'}
            actionLabel={onExpandMap ? 'Ampliar zona del mapa' : null}
            onAction={onExpandMap}
            secondaryActionLabel={onPublishRequest ? 'Publicar solicitud' : onRequestLocation ? 'Usar mi ubicación' : null}
            onSecondaryAction={onPublishRequest || onRequestLocation}
            tone="neutral"
          />
        ) : null}

        {visibleHelpers.map((helper) => (
          <HelperCard
            key={helper.id}
            helper={helper}
            selected={selectedHelperId === helper.id}
            onSelect={onSelectHelper}
            onLocate={onLocateHelper}
            onOpenProfile={onOpenProfile}
            onContact={onContact}
          />
        ))}
      </div>
    </aside>
  )
}
