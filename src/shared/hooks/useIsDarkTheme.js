import { useEffect, useState } from 'react'

function readIsDarkTheme() {
  if (typeof document === 'undefined') return false
  return document.documentElement.getAttribute('data-theme') === 'dark'
}

export function useIsDarkTheme() {
  const [isDarkTheme, setIsDarkTheme] = useState(readIsDarkTheme)

  useEffect(() => {
    if (typeof document === 'undefined') return undefined

    const root = document.documentElement

    const updateTheme = () => {
      setIsDarkTheme(root.getAttribute('data-theme') === 'dark')
    }

    updateTheme()

    const observer = new MutationObserver(updateTheme)
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] })

    return () => observer.disconnect()
  }, [])

  return isDarkTheme
}
