import L from 'leaflet'
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import styles from './TaskMap.module.css'

// Centro por defecto: Zaragoza/Delicias aproximado si aun no hay ubicacion del usuario.
const defaultCenter = [41.6523, -0.9019]

// Marcador custom para el usuario. Usamos divIcon para mantener el estilo visual del producto.
const userIcon = L.divIcon({
  className: styles.userMarker,
  html: '<span>Tu</span>',
  iconSize: [42, 42],
  iconAnchor: [21, 21],
})

// Crea un marcador por tarea con el precio dentro. Se genera por tarea porque cambia el texto.
function createTaskIcon(priceEuros) {
  return L.divIcon({
    className: styles.taskMarker,
    html: `<span>${priceEuros}€</span>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  })
}

// Re-centra el mapa cuando llega la ubicacion real o cambia el centro.
function RecenterMap({ center }) {
  const map = useMap()
  map.setView(center, map.getZoom(), { animate: true })
  return null
}

// Mapa real con OpenStreetMap: usuario, radio maximo y tareas filtradas. Tareas en formato Supabase.
export default function TaskMap({ tasks, userLocation, radiusKm, onTaskSelect, distances }) {
  const center = userLocation ? [userLocation.latitude, userLocation.longitude] : defaultCenter

  return (
    <div className={styles.mapShell}>
      <MapContainer center={center} zoom={14} scrollWheelZoom className={styles.map}>
        <RecenterMap center={center} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Circle
          center={center}
          radius={radiusKm * 1000}
          pathOptions={{ color: '#1804c9', fillColor: '#ffd300', fillOpacity: 0.16, weight: 3 }}
        />

        <Marker position={center} icon={userIcon}>
          <Popup>
            <strong>Tu ubicacion</strong>
            <br />
            {userLocation?.label || 'Ubicacion aproximada'}
          </Popup>
        </Marker>

        {tasks.map((task) => {
          const priceEuros = Math.round((task.price_cents ?? 0) / 100)
          const distance = distances?.[task.id]
          return (
            <Marker
              key={task.id}
              position={[task.latitude, task.longitude]}
              icon={createTaskIcon(priceEuros)}
              eventHandlers={{
                click: () => onTaskSelect(task.id),
              }}
            >
              <Popup>
                <strong>{task.title}</strong>
                <br />
                {task.requester?.full_name || task.requester?.username}
                {Number.isFinite(distance) ? ` · ${distance} km` : ''}
                <br />
                {priceEuros} EUR · {task.category}
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
