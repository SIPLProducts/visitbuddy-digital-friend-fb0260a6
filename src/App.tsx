import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { PageTransition } from "@/components/layout/PageTransition";
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
import ProposalDocument from "./pages/ProposalDocument";
import ResourceRequirements from "./pages/ResourceRequirements";
import ProductFeatures from "./pages/ProductFeatures";
import UserManual from "./pages/UserManual";
import Notifications from "./pages/Notifications";
import AuditLogs from "./pages/AuditLogs";
import Watchlist from "./pages/Watchlist";
import EmergencyEvacuation from "./pages/EmergencyEvacuation";

import ComplianceReport from "./pages/ComplianceReport";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

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
  const location = useLocation();

  return (
    <PageTransition>
      <Routes location={location} key={location.pathname}>
        <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/visitors" element={<ProtectedRoute><Visitors /></ProtectedRoute>} />
        <Route path="/visitors/new" element={<ProtectedRoute><NewVisitor /></ProtectedRoute>} />
        <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
        <Route path="/check-in-out" element={<ProtectedRoute><CheckInOut /></ProtectedRoute>} />
        <Route path="/badge-printing" element={<ProtectedRoute><BadgePrinting /></ProtectedRoute>} />
        <Route path="/print-badge" element={<PrintBadge />} />
        <Route path="/self-service" element={<SelfService />} />
        <Route path="/approve-visitor" element={<ApproveVisitor />} />
        <Route path="/install" element={<Install />} />
        <Route path="/visitor-report" element={<ProtectedRoute><VisitorReport /></ProtectedRoute>} />
        <Route path="/departments" element={<ProtectedRoute><Departments /></ProtectedRoute>} />
        <Route path="/employees" element={<ProtectedRoute><Employees /></ProtectedRoute>} />
        <Route path="/locations" element={<ProtectedRoute><Locations /></ProtectedRoute>} />
        <Route path="/gates" element={<ProtectedRoute><Gates /></ProtectedRoute>} />
        <Route path="/gate-qr-codes" element={<ProtectedRoute><GateQRCodes /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
        <Route path="/vehicles" element={<ProtectedRoute><Vehicles /></ProtectedRoute>} />
        <Route path="/vehicles/new" element={<ProtectedRoute><NewVehicle /></ProtectedRoute>} />
        <Route path="/vehicles/gate" element={<ProtectedRoute><VehicleGate /></ProtectedRoute>} />
        <Route path="/vehicles/report" element={<ProtectedRoute><VehicleReport /></ProtectedRoute>} />
        <Route path="/vehicle-types" element={<ProtectedRoute><VehicleTypes /></ProtectedRoute>} />
        <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
        <Route path="/proposal-document" element={<ProposalDocument />} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/audit-logs" element={<ProtectedRoute><AuditLogs /></ProtectedRoute>} />
        <Route path="/watchlist" element={<ProtectedRoute><Watchlist /></ProtectedRoute>} />
        <Route path="/emergency" element={<ProtectedRoute><EmergencyEvacuation /></ProtectedRoute>} />
        
        <Route path="/compliance" element={<ProtectedRoute><ComplianceReport /></ProtectedRoute>} />
        <Route path="/resource-requirements" element={<ResourceRequirements />} />
        <Route path="/product-features" element={<ProductFeatures />} />
        <Route path="/user-manual" element={<UserManual />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </PageTransition>
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
