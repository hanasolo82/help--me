import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'

import Landing from '../pages/Landing/Landing'
import Privacy from '../pages/Legal/Privacy'
import Terms from '../pages/Legal/Terms'

const PUBLIC_ROUTE_COMPONENTS = {
  '/': Landing,
  '/legal/privacy': Privacy,
  '/legal/terms': Terms,
}

export function renderPublicRoute(pathname) {
  const Page = PUBLIC_ROUTE_COMPONENTS[pathname]

  if (!Page) {
    throw new Error(`Unsupported public prerender route: ${pathname}`)
  }

  return renderToString(
    <MemoryRouter initialEntries={[pathname]}>
      <Page />
    </MemoryRouter>,
  )
}
