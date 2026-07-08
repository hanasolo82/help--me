import { useEffect } from 'react'

const SITE_NAME = 'helpMe'
const SITE_ORIGIN = (import.meta.env.VITE_SITE_URL || 'https://helpme.app').replace(/\/$/, '')

function upsertMeta(attrKey, name, value) {
  if (!value) return
  let el = document.head.querySelector(`meta[${attrKey}="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attrKey, name)
    document.head.appendChild(el)
  }
  if (el.getAttribute('content') !== value) {
    el.setAttribute('content', value)
  }
}

function setCanonical(href) {
  if (!href) return
  let link = document.head.querySelector('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.setAttribute('rel', 'canonical')
    document.head.appendChild(link)
  }
  if (link.getAttribute('href') !== href) {
    link.setAttribute('href', href)
  }
}

// Hook ligero (sin dependencias) para gestionar SEO por ruta: titulo, description,
// canonical y OG. La SPA queda indexable por buscadores y previsualizable en redes.
export function useDocumentMeta({ title, description, path, noindex = false } = {}) {
  useEffect(() => {
    // La pestaña muestra solo la marca: "helpMe". El texto descriptivo se
    // reserva para og/twitter (tarjetas al compartir), sin ensuciar el title.
    if (document.title !== SITE_NAME) {
      document.title = SITE_NAME
    }

    const socialTitle = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} · Micro-ayuda local entre vecinos`
    upsertMeta('name', 'description', description)
    upsertMeta('property', 'og:title', socialTitle)
    upsertMeta('property', 'og:description', description)
    upsertMeta('name', 'twitter:title', socialTitle)
    upsertMeta('name', 'twitter:description', description)

    const canonical = path ? `${SITE_ORIGIN}${path}` : SITE_ORIGIN
    setCanonical(canonical)
    upsertMeta('property', 'og:url', canonical)

    if (noindex) {
      upsertMeta('name', 'robots', 'noindex, nofollow')
    } else {
      document.head.querySelector('meta[name="robots"]')?.remove()
    }
  }, [title, description, path, noindex])
}
