import './styles/design-tokens.css'
import './styles/theme-live.css'
import './styles/globals.css'
import './styles/view-transitions.css'
import './styles.css'
import './pages/Landing/Landing.module.css'
import './pages/Landing/components/BentoGrid.module.css'
import './pages/Legal/LegalLayout.module.css'
import './shared/components/ThemeSwitch/ThemeSwitch.module.css'
import './shared/ui/AnimatedBrandLogo/AnimatedBrandLogo.module.css'
import './shared/ui/BrandLogo/BrandLogo.module.css'

const shouldRunReactScan =
  import.meta.env.DEV && import.meta.env.VITE_REACT_SCAN === 'true'

if (shouldRunReactScan) {
  try {
    const reactScanModule = 'react-scan/auto'
    await import(/* @vite-ignore */ reactScanModule)
  } catch (error) {
    console.warn('[main] React Scan is unavailable; continuing without it.', error)
  }
}

await import('./bootstrap.jsx')
