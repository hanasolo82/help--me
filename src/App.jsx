import AppRouter from './app/router/AppRouter'
import ThemeApplier from './app/ThemeApplier'
import BottomNav from './shared/components/BottomNav/BottomNav'

// Componente raiz. Mantiene App limpia y delega todas las pantallas al router.
// ThemeApplier propaga tema y paleta del profile actual a :root, asi cualquier pantalla
// montada dentro de la sesion comparte el mismo accent + ink.
function App() {
  return (
    <>
      <ThemeApplier />
      <AppRouter />
      <BottomNav />
    </>
  )
}

export default App
