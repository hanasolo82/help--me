
import { lazy, Suspense } from "react";
import { createBrowserRouter, createRoutesFromElements, Navigate, Route } from "react-router-dom";

import RootLayout from "./RootLayout";
import Home from "../../pages/Home/Home";
import Landing from "../../pages/Landing/Landing";
import AuthCallback from "../../pages/AuthCallback/AuthCallback";
import Login from "../../pages/Login/Login";
import ForgotPassword from "../../pages/ForgotPassword/ForgotPassword";
import ResetPassword from "../../pages/ResetPassword/ResetPassword";
import Onboarding from "../../pages/Onboarding/Onboarding";
import OnboardingBasicsStep from "../../features/onboarding/pages/OnboardingBasicsStep";
import OnboardingSkillsStep from "../../features/onboarding/pages/OnboardingSkillsStep";
import OnboardingLocationStep from "../../features/onboarding/pages/OnboardingLocationStep";
import OnboardingAvailabilityStep from "../../features/onboarding/pages/OnboardingAvailabilityStep";
import OnboardingVerificationStep from "../../features/onboarding/pages/OnboardingVerificationStep";
import TaskDetail from "../../pages/TaskDetail/TaskDetail";
import TaskPaymentPage from "../../pages/TaskPayment/TaskPaymentPage";
import CreateTask from "../../pages/CreateTask/CreateTask";
import Chat from "../../pages/Chat/Chat";
import MessagesPage from "../../pages/Messages/MessagesPage";
import NotificationsPage from "../../pages/Notifications/NotificationsPage";
import TaskComplete from "../../pages/TaskComplete/TaskComplete";
import Profile from "../../pages/Profile/Profile";
import TaskReviewPage from "../../pages/TaskReview/TaskReviewPage";
import SettingsPage from "../../pages/Settings/SettingsPage";
import Cookies from "../../pages/Legal/Cookies";
import CommunityGuidelines from "../../pages/Legal/CommunityGuidelines";
import Privacy from "../../pages/Legal/Privacy";
import Terms from "../../pages/Legal/Terms";
import StripeReturn from "../../pages/Stripe/StripeReturn";
import StripeRefresh from "../../pages/Stripe/StripeRefresh";
import PaymentsPage from "../../pages/Payments/PaymentsPage";
import PaymentReceiptPage from "../../pages/Payments/PaymentReceiptPage";
import RequireAuth from "./RequireAuth";

const DesignLab = import.meta.env.DEV ? lazy(() => import("../../pages/DesignLab/DesignLab")) : null;
const HeaderLab = import.meta.env.DEV ? lazy(() => import("../../pages/DesignLab/HeaderLab")) : null;
const NotificationsLab = import.meta.env.DEV ? lazy(() => import("../../pages/DesignLab/NotificationsLab")) : null;
const HomeHeightLab = import.meta.env.DEV ? lazy(() => import("../../pages/DesignLab/HomeHeightLab")) : null;
const RequestModalLab = import.meta.env.DEV ? lazy(() => import("../../pages/DesignLab/RequestModalLab")) : null;

// Mapa central de rutas. Las pantallas privadas van envueltas en RequireAuth.
// Data router (createBrowserRouter): requerido por las View Transitions de
// react-router (viewTransition en navigate/Link y useViewTransitionState).
export const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<RootLayout />}>
      <Route path="/" element={<Landing />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/legal/terms" element={<Terms />} />
      <Route path="/legal/community-guidelines" element={<CommunityGuidelines />} />
      <Route path="/legal/privacy" element={<Privacy />} />
      <Route path="/legal/cookies" element={<Cookies />} />
      {/* Las antiguas /facturacion /planes /pago (maqueta de suscripción) se retiraron
          con el pivote de monetización: sin premium al uso, el dinero vive en /pagos. */}
      <Route path="/facturacion" element={<Navigate to="/pagos" replace />} />
      <Route path="/planes" element={<Navigate to="/" replace />} />
      <Route path="/pago" element={<Navigate to="/pagos" replace />} />
      <Route path="/onboarding" element={<RequireAuth requireProfile={false}><Onboarding /></RequireAuth>}>
        <Route index element={<OnboardingBasicsStep />} />
        <Route path="skills" element={<OnboardingSkillsStep />} />
        <Route path="location" element={<OnboardingLocationStep />} />
        <Route path="availability" element={<OnboardingAvailabilityStep />} />
        <Route path="verification" element={<OnboardingVerificationStep />} />
      </Route>
      <Route path="/home" element={<RequireAuth><Home /></RequireAuth>} />
      <Route path="/task/:id" element={<RequireAuth><TaskDetail /></RequireAuth>} />
      <Route path="/task/:id/payment" element={<RequireAuth><TaskPaymentPage /></RequireAuth>} />
      <Route path="/task/:id/review" element={<RequireAuth><TaskReviewPage /></RequireAuth>} />
      <Route path="/create" element={<RequireAuth><CreateTask /></RequireAuth>} />
      <Route path="/chat/:id" element={<RequireAuth><Chat /></RequireAuth>} />
      {/* /chats era la antigua lista modal/página: ahora vive en /messages */}
      <Route path="/chats" element={<Navigate to="/messages" replace />} />
      <Route path="/messages" element={<RequireAuth><MessagesPage /></RequireAuth>} />
      <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
      <Route path="/complete/:id" element={<RequireAuth><TaskComplete /></RequireAuth>} />
      <Route path="/profile/:id" element={<RequireAuth><Profile /></RequireAuth>} />
      <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
      <Route path="/settings" element={<RequireAuth requireProfile={false}><SettingsPage /></RequireAuth>} />
      <Route path="/pagos" element={<RequireAuth><PaymentsPage /></RequireAuth>} />
      <Route path="/pagos/justificante/:paymentId" element={<RequireAuth><PaymentReceiptPage /></RequireAuth>} />
      <Route path="/stripe/return" element={<StripeReturn />} />
      <Route path="/stripe/refresh" element={<RequireAuth><StripeRefresh /></RequireAuth>} />
      {DesignLab ? (
        <Route
          path="/design-lab"
          element={
            <Suspense fallback={<main className="app-screen"><p className="muted">Cargando laboratorio visual...</p></main>}>
              <DesignLab />
            </Suspense>
          }
        />
      ) : null}
      {HeaderLab ? (
        <Route
          path="/header-lab"
          element={
            <Suspense fallback={<main className="app-screen"><p className="muted">Cargando...</p></main>}>
              <HeaderLab />
            </Suspense>
          }
        />
      ) : null}
      {NotificationsLab ? (
        <Route
          path="/notifications-lab"
          element={
            <Suspense fallback={<main className="app-screen"><p className="muted">Cargando...</p></main>}>
              <NotificationsLab />
            </Suspense>
          }
        />
      ) : null}
      {HomeHeightLab ? (
        <Route
          path="/home-height-lab"
          element={
            <Suspense fallback={<main className="app-screen"><p className="muted">Cargando...</p></main>}>
              <HomeHeightLab />
            </Suspense>
          }
        />
      ) : null}
      {RequestModalLab ? (
        <Route
          path="/request-modal-lab"
          element={
            <Suspense fallback={<main className="app-screen"><p className="muted">Cargando...</p></main>}>
              <RequestModalLab />
            </Suspense>
          }
        />
      ) : null}
    </Route>
  ),
);
