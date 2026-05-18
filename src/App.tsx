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
import VehicleGate from "./pages/VehicleGate";
import VehicleReport from "./pages/VehicleReport";
import VehicleTypes from "./pages/VehicleTypes";
import NotFound from "./pages/NotFound";
import SelfService from "./pages/SelfService";
import Install from "./pages/Install";
import GateQRCodes from "./pages/GateQRCodes";
import ApproveVisitor from "./pages/ApproveVisitor";
import VisitorQrLink from "./pages/VisitorQrLink";
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
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
      <Route path="/print-badge" element={<PrintBadge />} />
      <Route path="/visitor/:visitorCode" element={<VisitorQrLink />} />
      <Route path="/self-service" element={<SelfService />} />
      <Route path="/approve-visitor" element={<ApproveVisitor />} />
      <Route path="/install" element={<Install />} />
      <Route path="/proposal-document" element={<ProposalDocument />} />
      <Route path="/resource-requirements" element={<ResourceRequirements />} />
      <Route path="/product-features" element={<ProductFeatures />} />
      <Route path="/user-manual" element={<UserManual />} />

      {/* Protected routes with persistent layout */}
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/visitors" element={<Visitors />} />
        <Route path="/visitors/new" element={<NewVisitor />} />
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
        <Route path="/vehicles/new" element={<NewVehicle />} />
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
