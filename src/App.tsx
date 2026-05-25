import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { useTranslation } from "react-i18next";

// Pages
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Visitors from "./pages/Visitors";
import NewVisitor from "./pages/NewVisitor";
import Appointments from "./pages/Appointments";
import CheckInOut from "./pages/CheckInOut";
import BadgePrinting from "./pages/BadgePrinting";
import PrintBadge from "./pages/PrintBadge";
import VisitorReport from "./pages/VisitorReport";
import Departments from "./pages/Departments";
import Employees from "./pages/Employees";
import Locations from "./pages/Locations";
import Gates from "./pages/Gates";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import UserManagement from "./pages/UserManagement";
import Help from "./pages/Help";
import Vehicles from "./pages/Vehicles";
import NewVehicle from "./pages/NewVehicle";
import { ReadOnlyGuard } from "./components/layout/ReadOnlyGuard";
import VehicleGate from "./pages/VehicleGate";
import VehicleReport from "./pages/VehicleReport";
import VehicleTypes from "./pages/VehicleTypes";
import NotFound from "./pages/NotFound";
import SelfService from "./pages/SelfService";
import Install from "./pages/Install";
import GateQRCodes from "./pages/GateQRCodes";
import ApproveVisitor from "./pages/ApproveVisitor";
import VisitorQrLink from "./pages/VisitorQrLink";
import ClickRedirect from "./pages/ClickRedirect";
import ShortLinkRedirect from "./pages/ShortLinkRedirect";
import ProposalDocument from "./pages/ProposalDocument";
import ResourceRequirements from "./pages/ResourceRequirements";
import ProductFeatures from "./pages/ProductFeatures";
import UserManual from "./pages/UserManual";
import Notifications from "./pages/Notifications";
import AuditLogs from "./pages/AuditLogs";
import Watchlist from "./pages/Watchlist";
import EmergencyEvacuation from "./pages/EmergencyEvacuation";
import CameraMonitor from "./pages/CameraMonitor";
import ComplianceReport from "./pages/ComplianceReport";
import SafetyInfo from "./pages/SafetyInfo";
import ResetPassword from "./pages/ResetPassword";
import TransferApproval from "./pages/TransferApproval";

const queryClient = new QueryClient();

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  // Intercept SMS-style root query links (/?<8char> or /?s<6char>)
  // sent in DLT-approved SMS templates and route them to the proper page
  // before React Router resolves "/" (which is protected).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.pathname !== "/") return;
    const raw = window.location.search.slice(1);
    if (!raw || raw.includes("=") || raw.includes("&")) return;
    if (raw.length === 7 && /^s[a-z0-9]{6}$/i.test(raw)) {
      window.location.replace(`/safety/${raw.slice(1).toLowerCase()}`);
    } else if (/^[a-z0-9]{6,10}$/i.test(raw)) {
      window.location.replace(`/s/${raw.toLowerCase()}`);
    }
  }, []);

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/print-badge" element={<PrintBadge />} />
      <Route path="/visitor/:visitorCode" element={<VisitorQrLink />} />
      <Route path="/click/:code" element={<ClickRedirect />} />
      <Route path="/s/:code" element={<ShortLinkRedirect />} />
      <Route path="/safety/:code" element={<SafetyInfo />} />
      <Route path="/self-service" element={<SelfService />} />
      <Route path="/approve-visitor" element={<ApproveVisitor />} />
      <Route path="/transfer-approval" element={<TransferApproval />} />
      <Route path="/install" element={<Install />} />
      <Route path="/proposal-document" element={<ProposalDocument />} />
      <Route path="/resource-requirements" element={<ResourceRequirements />} />
      <Route path="/product-features" element={<ProductFeatures />} />
      <Route path="/user-manual" element={<UserManual />} />

      {/* Protected routes with persistent layout */}
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/visitors" element={<Visitors />} />
        <Route path="/visitors/new" element={<ReadOnlyGuard to="/visitors"><NewVisitor /></ReadOnlyGuard>} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/check-in-out" element={<CheckInOut />} />
        <Route path="/badge-printing" element={<BadgePrinting />} />
        <Route path="/visitor-report" element={<VisitorReport />} />
        <Route path="/departments" element={<Departments />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/locations" element={<Locations />} />
        <Route path="/gates" element={<Gates />} />
        <Route path="/gate-qr-codes" element={<GateQRCodes />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/vehicles" element={<Vehicles />} />
        <Route path="/vehicles/new" element={<ReadOnlyGuard to="/vehicles"><NewVehicle /></ReadOnlyGuard>} />
        <Route path="/vehicles/gate" element={<VehicleGate />} />
        <Route path="/vehicles/report" element={<VehicleReport />} />
        <Route path="/vehicle-types" element={<VehicleTypes />} />
        <Route path="/help" element={<Help />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/audit-logs" element={<AuditLogs />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/emergency" element={<EmergencyEvacuation />} />
        <Route path="/camera-monitor" element={<CameraMonitor />} />
        <Route path="/compliance" element={<ComplianceReport />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function RtlHandler() {
  const { i18n } = useTranslation();
  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ur' ? 'rtl' : 'ltr';
  }, [i18n.language]);
  return null;
}

// Handles SMS deep-links:
//  - `/?<8-10 char short_code>`  → `/s/<code>` (resolves via RPC to visitor id)
//  - `/?qr<VISITOR_CODE>`        → `/visitor/<CODE>` (legacy long form)
if (typeof window !== "undefined") {
  const s = window.location.search;
  if (s.startsWith("?qr") && s.length > 3) {
    const code = s.slice(3).split("&")[0].toUpperCase();
    if (code) {
      window.history.replaceState({}, "", `/visitor/${code}`);
    }
  } else if (/^\?s[a-z0-9]{4,8}$/i.test(s)) {
    const code = s.slice(2).toLowerCase();
    window.history.replaceState({}, "", `/safety/${code}`);
  } else if (/^\?[a-z0-9]{6,10}$/i.test(s)) {
    const code = s.slice(1).toLowerCase();
    window.history.replaceState({}, "", `/s/${code}`);
  }
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <RtlHandler />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
