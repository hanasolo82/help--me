import { Routes, Route } from "react-router-dom";

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
import Chats from "../../pages/Chats/Chats";
import TaskComplete from "../../pages/TaskComplete/TaskComplete";
import Profile from "../../pages/Profile/Profile";
import SettingsPage from "../../pages/Settings/SettingsPage";
import Cookies from "../../pages/Legal/Cookies";
import CommunityGuidelines from "../../pages/Legal/CommunityGuidelines";
import Privacy from "../../pages/Legal/Privacy";
import Terms from "../../pages/Legal/Terms";
import StripeReturn from "../../pages/Stripe/StripeReturn";
import StripeRefresh from "../../pages/Stripe/StripeRefresh";
import RequireAuth from "./RequireAuth";

// Mapa central de rutas. Las pantallas privadas van envueltas en RequireAuth.
export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/legal/terms" element={<Terms />} />
      <Route path="/legal/community-guidelines" element={<CommunityGuidelines />} />
      <Route path="/legal/privacy" element={<Privacy />} />
      <Route path="/legal/cookies" element={<Cookies />} />
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
      <Route path="/create" element={<RequireAuth><CreateTask /></RequireAuth>} />
      <Route path="/chat/:id" element={<RequireAuth><Chat /></RequireAuth>} />
      <Route path="/chats" element={<RequireAuth><Chats /></RequireAuth>} />
      <Route path="/complete/:id" element={<RequireAuth><TaskComplete /></RequireAuth>} />
      <Route path="/profile/:id" element={<RequireAuth><Profile /></RequireAuth>} />
      <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
      <Route path="/settings" element={<RequireAuth requireProfile={false}><SettingsPage /></RequireAuth>} />
      <Route path="/stripe/return" element={<StripeReturn />} />
      <Route path="/stripe/refresh" element={<RequireAuth><StripeRefresh /></RequireAuth>} />
    </Routes>
  );
}
