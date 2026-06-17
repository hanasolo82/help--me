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
