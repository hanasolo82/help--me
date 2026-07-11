# Ilustraciones grandes (a color)

Carpeta para los SVG definitivos, uno por slot de categoría. El diseño lo
aporta el owner; fuentes libres compatibles con el trazo de Lucide: unDraw,
Open Doodles (CC0) o la parte open-source de Streamline.

Nombres esperados (los consume `<Illustration as={...}>` de `src/design`):

- `pet-walk.svg` — Mascotas
- `errand.svg` — Recados / Compras
- `moving.svg` — Mudanza / transportar
- `cleaning.svg` — Limpieza
- `repairs.svg` — Reparaciones
- `classes.svg` — Clases / apoyo
- `care.svg` — Cuidado / acompañamiento
- `tech.svg` — Ayuda técnica / Tecnología

Convenciones:
- Para poder teñir zonas con el acento de marca, usar `fill="var(--accent)"`
  dentro del SVG (el componente `Illustration` define `--accent`).
- Importarlos como componente requiere vite-plugin-svgr (`npm i -D
  vite-plugin-svgr` y añadir `svgr()` a vite.config); mientras tanto,
  `<Illustration src={url}>` funciona sin plugin (sin teñido).
