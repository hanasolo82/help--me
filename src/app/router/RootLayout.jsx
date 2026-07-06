import { Outlet } from "react-router-dom";
import ThemeApplier from "../ThemeApplier";

// Layout raíz: todo lo que necesita contexto de router (ThemeApplier usa useLocation).
export default function RootLayout() {
  return (
    <>
      <ThemeApplier />
      <Outlet />
    </>
  );
}
