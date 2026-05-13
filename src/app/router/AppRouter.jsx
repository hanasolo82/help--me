import { Routes, Route } from "react-router-dom";

import Home from "../../pages/Home/Home";
import Landing from "../../pages/Landing/Landing";
import Login from "../../pages/Login/Login";
import ForgotPassword from "../../pages/ForgotPassword/ForgotPassword";
import ResetPassword from "../../pages/ResetPassword/ResetPassword";
import Onboarding from "../../pages/Onboarding/Onboarding";
import TaskDetail from "../../pages/TaskDetail/TaskDetail";
import CreateTask from "../../pages/CreateTask/CreateTask";
import Chat from "../../pages/Chat/Chat";
import Chats from "../../pages/Chats/Chats";
import TaskComplete from "../../pages/TaskComplete/TaskComplete";
import Profile from "../../pages/Profile/Profile";
import RequireAuth from "./RequireAuth";

// Mapa central de rutas. Las pantallas privadas van envueltas en RequireAuth.
export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/onboarding" element={<RequireAuth requireProfile={false}><Onboarding /></RequireAuth>} />
      <Route path="/home" element={<RequireAuth><Home /></RequireAuth>} />
      <Route path="/task/:id" element={<RequireAuth><TaskDetail /></RequireAuth>} />
      <Route path="/create" element={<RequireAuth><CreateTask /></RequireAuth>} />
      <Route path="/chat/:id" element={<RequireAuth><Chat /></RequireAuth>} />
      <Route path="/chats" element={<RequireAuth><Chats /></RequireAuth>} />
      <Route path="/complete/:id" element={<RequireAuth><TaskComplete /></RequireAuth>} />
      <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
    </Routes>
  );
}
