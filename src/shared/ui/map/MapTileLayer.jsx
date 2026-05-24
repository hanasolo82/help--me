import { TileLayer } from 'react-leaflet'
import { useIsDarkTheme } from '../../hooks/useIsDarkTheme'

const LIGHT_TILES = {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
}

const DARK_TILES = {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
}

export default function MapTileLayer() {
  const isDarkTheme = useIsDarkTheme()
  const tiles = isDarkTheme ? DARK_TILES : LIGHT_TILES

  return <TileLayer key={isDarkTheme ? 'dark' : 'light'} attribution={tiles.attribution} url={tiles.url} />
}
