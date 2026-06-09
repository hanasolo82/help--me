const shouldRunReactScan =
  import.meta.env.DEV && import.meta.env.VITE_REACT_SCAN === 'true'

if (shouldRunReactScan) {
  await import('react-scan/auto')
}

await import('./bootstrap.jsx')
