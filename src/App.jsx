import React, { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Loaders & helpers
import PageLoader         from "./components/PageLoader";
import NavLoader          from "./components/NavLoader";
import useNavigationLoader from "./hooks/useNavigationLoader";
import ScrollToTop        from "./components/ScrollToTop";

// Layouts
import AdminLayout      from "./components/AdminLayout";
import SupervisorLayout from "./components/SupervisorLayout";
import OfficerLayout    from "./components/OfficerLayout";

// Super Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import OrgsPage       from "./pages/admin/OrgsPage";
import OrgDetailPage  from "./pages/admin/OrgDetailPage";
import AdminsPage     from "./pages/admin/AdminsPage";
import ApprovalsPage  from "./pages/admin/ApprovalsPage";
import AuditLogPage   from "./pages/admin/AuditLogPage";
import PresencePage   from "./pages/admin/PresencePage";
import GlobalMapPage  from "./pages/admin/GlobalMapPage";

// Supervisor pages
import DashboardPage    from "./pages/supervisor/DashboardPage";
import LiveMapPage      from "./pages/supervisor/LiveMapPage";
import OfficersPage     from "./pages/supervisor/OfficersPage";
import OfficerDetailPage from "./pages/supervisor/OfficerDetailPage";
import NotificationsPage from "./pages/supervisor/NotificationsPage";
import SettingsPage     from "./pages/supervisor/SettingsPage";
import FormsPage        from "./pages/supervisor/FormsPage";
import FormBuilderPage  from "./pages/supervisor/FormBuilderPage";
import FormDetailPage   from "./pages/supervisor/FormDetailPage";
import MyApprovalsPage  from "./pages/supervisor/MyApprovalsPage";
import ReportsPage      from "./pages/supervisor/ReportsPage";

// Officer pages
import OfficerHomePage    from "./pages/officer/OfficerHomePage";
import OfficerProfilePage from "./pages/officer/OfficerProfilePage";
import AnnouncementsPage  from "./pages/officer/AnnouncementsPage";
import CollectPage        from "./pages/officer/CollectPage";
import MySubmissionsPage  from "./pages/officer/MySubmissionsPage";

// Auth / shared
import LoginPage             from "./pages/LoginPage";
import LoadingScreen         from "./components/LoadingScreen";
import PendingApprovalScreen from "./components/PendingApprovalScreen";
import LandingPage           from "./pages/landingPage";
/* ─────────────────────────────────────────────────────────
   NAVIGATION WRAPPER
   - Shows NavLoader (overlay) on every route change
   - Scrolls window to top on every route change
   - Shows "back to top" ScrollToTop button on long pages
   - Does NOT show PageLoader on nav (PageLoader = initial load only)
───────────────────────────────────────────────────────── */
function NavigationWrapper({ children }) {
  const location   = useLocation();
  const isNavigating = useNavigationLoader();

  // Scroll window to top on every route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  return (
    <>
      {/* Slim top-bar + overlay loader for in-app navigation */}
      <NavLoader loading={isNavigating} />

      {/* Floating back-to-top button (appears after 300px scroll) */}
      <ScrollToTop />

      {children}
    </>
  );
}

/* ─────────────────────────────────────────────────────────
   APP ROUTES
───────────────────────────────────────────────────────── */
function AppRoutes() {
  const { user, profile, loading } = useAuth();

  // Show full-screen page loader while auth is initialising
  if (loading) return <PageLoader loading={true} initial={true} />;
  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    );
  }
  if (!profile) return <PageLoader loading={true} initial={true} />;
  if (!profile.active) return <PendingApprovalScreen />;

  /* ── SUPER ADMIN ── */
  if (profile.role === "super_admin") {
    return (
      <Routes>
        <Route path="/" element={<AdminLayout />}>
          <Route index                    element={<AdminDashboard />} />
          <Route path="organisations"     element={<OrgsPage />} />
          <Route path="organisations/:id" element={<OrgDetailPage />} />
          <Route path="admins"            element={<AdminsPage />} />
          <Route path="approvals"         element={<ApprovalsPage />} />
          <Route path="audit"             element={<AuditLogPage />} />
          <Route path="presence"          element={<PresencePage />} />
          <Route path="map"               element={<GlobalMapPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  /* ── SUPERVISOR ── */
  if (profile.role === "supervisor") {
    return (
      <Routes>
        <Route path="/" element={<SupervisorLayout />}>
          <Route index                 element={<DashboardPage />} />
          <Route path="map"            element={<LiveMapPage />} />
          <Route path="officers"       element={<OfficersPage />} />
          <Route path="officers/:id"   element={<OfficerDetailPage />} />
          <Route path="notifications"  element={<NotificationsPage />} />
          <Route path="settings"       element={<SettingsPage />} />
          <Route path="forms"          element={<FormsPage />} />
          <Route path="forms/new"      element={<FormBuilderPage />} />
          <Route path="forms/:id"      element={<FormDetailPage />} />
          <Route path="forms/:id/edit" element={<FormBuilderPage />} />
          <Route path="my-approvals"   element={<MyApprovalsPage />} />
          <Route path="reports"        element={<ReportsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  /* ── OFFICER ── */
  return (
    <Routes>
      <Route path="/" element={<OfficerLayout />}>
        <Route index                element={<OfficerHomePage />} />
        <Route path="collect"       element={<CollectPage />} />
        <Route path="submissions"   element={<MySubmissionsPage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="profile"       element={<OfficerProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

/* ─────────────────────────────────────────────────────────
   ROOT APP
───────────────────────────────────────────────────────── */
export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <NavigationWrapper>
          <AppRoutes />
        </NavigationWrapper>
      </AuthProvider>
    </BrowserRouter>
  );
}
