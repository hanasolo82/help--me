import HelperCard from './HelperCard'
import HelperFiltersBar from './HelperFiltersBar'
import styles from './NeedHelpMapLayout.module.css'

export default function HelperListPanel({
  helpers = [],
  visibleHelpers = [],
  selectedHelperId = null,
  onSelectHelper,
  onOpenProfile,
  onContact,
  skillFilters = [],
  selectedSkillId = 'all',
  onSkillChange,
  radiusKm = 10,
  onRadiusChange,
  onlyAvailable = false,
  onOnlyAvailableChange,
  loading = false,
  error = '',
  locationLabel = 'Tu zona',
  hasLocation = false,
  onRequestLocation,
}) {
  return (
    <aside className={styles.panelShell}>
      <HelperFiltersBar
        skillFilters={skillFilters}
        selectedSkillId={selectedSkillId}
        onSkillChange={onSkillChange}
        radiusKm={radiusKm}
        onRadiusChange={onRadiusChange}
        onlyAvailable={onlyAvailable}
        onOnlyAvailableChange={onOnlyAvailableChange}
      />

      <div className={styles.panelMeta}>
        <p className="muted">{locationLabel}</p>
        <strong>{helpers.length} helpers cerca de ti</strong>
        <span className="muted">{visibleHelpers.length} visibles en esta pantalla del mapa</span>
      </div>

      {!hasLocation && (
        <section className={styles.locationBanner}>
          <strong>Activa tu ubicación para ver personas cercanas.</strong>
          <p className="muted">Usamos tu posición para ordenar helpers por proximidad aproximada.</p>
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
          <article className={styles.emptyState}>
            <strong>No hay helpers visibles en esta parte del mapa.</strong>
            <p className="muted">Mueve o amplía el mapa para ver personas disponibles en tu área.</p>
          </article>
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
