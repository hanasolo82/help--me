import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NeedHelpMapLayout from './NeedHelpMapLayout'
import HelperPreviewModal from './HelperPreviewModal'
import RequestTaskModal from './RequestTaskModal'
import RequesterHero from './RequesterHero'
import styles from './RequesterHome.module.css'

export default function RequesterHome({
  profile,
  location,
  locationStatus,
  locationError,
  onRequestLocation,
}) {
  const navigate = useNavigate()
  const [heroQuery, setHeroQuery] = useState('')
  const [preferredView, setPreferredView] = useState('map')
  const [selectedHelper, setSelectedHelper] = useState(null)
  const [requestTaskOpen, setRequestTaskOpen] = useState(false)

  const helperCountLabel = useMemo(() => {
    const place = location?.label || profile?.neighborhood || profile?.city || profile?.country || 'tu zona'
    return `Explora personas disponibles cerca de ${place}`
  }, [location?.label, profile?.city, profile?.country, profile?.neighborhood])

  function handlePreviewHelper(helper) {
    setSelectedHelper(helper)
  }

  function handleOpenTaskModal() {
    setRequestTaskOpen(true)
  }

  return (
    <section className={styles.requesterShell}>
      <RequesterHero
        value={heroQuery}
        onChange={setHeroQuery}
        onPublishRequest={handleOpenTaskModal}
      />

      <p className="muted">{helperCountLabel}</p>

        {!location && locationStatus !== 'loading' ? (
          <div className={styles.locationHint}>
            <strong>Activa tu ubicación para ver personas cercanas.</strong>
            <p className="muted">
              Con tu ubicación podemos mostrar personas disponibles por cercanía y ordenar mejor los resultados.
            </p>
          {onRequestLocation ? (
            <button type="button" className="secondary-action" onClick={onRequestLocation}>
              Usar mi ubicación
            </button>
          ) : null}
        </div>
      ) : null}

      <NeedHelpMapLayout
        profile={profile}
        location={location}
        locationStatus={locationStatus}
        locationError={locationError}
        onRequestLocation={onRequestLocation}
        preferredMobileView={preferredView}
        onPreviewHelper={handlePreviewHelper}
        onPublishRequest={handleOpenTaskModal}
      />

      <HelperPreviewModal
        open={Boolean(selectedHelper)}
        helper={selectedHelper}
        onClose={() => setSelectedHelper(null)}
        onViewProfile={(helper) => navigate(`/profile/${helper.id}`)}
        onContact={() => navigate('/chats')}
        onSendProposal={(helper) => {
          setRequestTaskOpen(true)
          setSelectedHelper(helper)
        }}
        onAddFavorite={() => {
          // TODO: conectar con profile_favorites cuando exista la capa backend.
        }}
      />

      <RequestTaskModal
        open={requestTaskOpen}
        selectedHelper={selectedHelper}
        location={location}
        locationStatus={locationStatus}
        onRequestLocation={onRequestLocation}
        onClose={() => setRequestTaskOpen(false)}
      />
    </section>
  )
}
