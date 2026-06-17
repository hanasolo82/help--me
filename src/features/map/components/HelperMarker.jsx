import { Marker, Popup } from 'react-leaflet'
import MapPopupCard from '../../../shared/ui/map/MapPopupCard'
import { createHelperMarkerIcon } from '../../../shared/ui/map/mapMarkerIcons'
import { toFiniteNumber } from '../../../shared/utils/mapHelpers'

export default function HelperMarker({ helper, onSelect }) {
  if (!helper) return null

  const lat = toFiniteNumber(helper.lat)
  const lng = toFiniteNumber(helper.lng)

  if (lat === null || lng === null) {
    return null
  }

  return (
    <Marker
      position={[lat, lng]}
      icon={createHelperMarkerIcon({ helper })}
      eventHandlers={{
        click: (e) => {
          try {
            e?.target?.closePopup?.()
          } catch {
            // noop
          }
          onSelect?.(helper)
        },
      }}
    >
      <Popup>
        <MapPopupCard
          kicker="Ayudante cercano"
          title={helper.display_name || helper.full_name || helper.username || 'Vecino'}
          meta={[
            `${Number(helper.rating ?? 0).toFixed(1)} valoracion`,
            helper.city || helper.neighborhood || 'Zona cercana',
          ]}
        >
          {helper.skills?.slice(0, 3).map((skill) => skill.name).join(' · ') || 'Ayuda general'}
        </MapPopupCard>
      </Popup>
    </Marker>
  )
}
