import { useEffect } from 'react'

const SITE_NAME = 'helpMe'
const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://helpme.app'

function setMeta(selector, attribute, value) {
  if (!value) return
  let element = document.head.querySelector(selector)
  if (!element) {
    element = document.createElement('meta')
    const [, key] = selector.match(/\[(name|property)="([^"]+)"\]/) || []
    if (key) element.setAttribute(key, selector.split('"')[1])
    document.head.appendChild(element)
  }
  element.setAttribute(attribute, value)
}

function setCanonical(href) {
  if (!href) return
  let link = document.head.querySelector('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  link.setAttribute('href', href)
}

// Hook ligero (sin dependencias) para gestionar SEO por ruta: titulo, description,
// canonical y OG. La SPA queda indexable por buscadores y previsualizable en redes.
export function useDocumentMeta({ title, description, path, noindex = false } = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} · Micro-ayuda local entre vecinos`
    document.title = fullTitle

    setMeta('meta[name="description"]', 'content', description)
    setMeta('meta[property="og:title"]', 'content', fullTitle)
    setMeta('meta[property="og:description"]', 'content', description)
    setMeta('meta[name="twitter:title"]', 'content', fullTitle)
    setMeta('meta[name="twitter:description"]', 'content', description)

    const canonical = path ? `${SITE_URL.replace(/\/$/, '')}${path}` : SITE_URL
    setCanonical(canonical)
    setMeta('meta[property="og:url"]', 'content', canonical)

    let robots = document.head.querySelector('meta[name="robots"]')
    if (noindex) {
      if (!robots) {
        robots = document.createElement('meta')
        robots.setAttribute('name', 'robots')
        document.head.appendChild(robots)
      }
      robots.setAttribute('content', 'noindex, nofollow')
    } else if (robots) {
      robots.remove()
    }
  }, [title, description, path, noindex])
}
