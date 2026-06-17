import { Marker, Popup } from 'react-leaflet'
import MapPopupCard from '../../../../shared/ui/map/MapPopupCard'
import { createHelperMarkerIcon } from '../../../../shared/ui/map/mapMarkerIcons'
import { toFiniteNumber } from '../../../../shared/utils/mapHelpers'

export default function HelperMapMarker({ helper, selected = false, onSelect }) {
  if (!helper) return null

  const lat = toFiniteNumber(helper.lat)
  const lng = toFiniteNumber(helper.lng)

  if (lat === null || lng === null) {
    return null
  }

  return (
    <Marker
      position={[lat, lng]}
      icon={createHelperMarkerIcon({ helper, selected })}
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
          kicker={helper.availability_enabled === false ? 'No disponible' : 'Disponible'}
          title={helper.display_name || helper.full_name || helper.username || 'Vecino'}
          meta={[
            helper.location_label || helper.city || helper.neighborhood || 'Zona cercana',
            Number.isFinite(Number(helper.distance_km)) ? `${Number(helper.distance_km).toFixed(1)} km` : 'Cerca de ti',
          ]}
        >
          {helper.skills?.slice(0, 3).map((skill) => skill.name).join(' · ') || 'Ayuda general'}
        </MapPopupCard>
      </Popup>
    </Marker>
  )
}
