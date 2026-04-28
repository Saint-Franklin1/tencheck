import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Navigate } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { lazy, Suspense } from "react";

// Eager load critical pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

// Lazy load all other pages
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AccountSettings = lazy(() => import("./pages/AccountSettings"));
const Properties = lazy(() => import("./pages/Properties"));
const PropertyDetail = lazy(() => import("./pages/PropertyDetail"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ServiceWorkerDashboard = lazy(() => import("./pages/ServiceWorkerDashboard"));
const Services = lazy(() => import("./pages/Services"));
const TenantProfilePage = lazy(() => import("./pages/TenantProfilePage"));
const PassportPublic = lazy(() => import("./pages/PassportPublic"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const ApplyProperty = lazy(() => import("./pages/ApplyProperty"));
const ApplyDirect = lazy(() => import("./pages/ApplyDirect"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <p className="text-sm text-muted-foreground">Loading...</p>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/account-settings" element={<AccountSettings />} />
              <Route path="/properties" element={<Properties />} />
              <Route path="/properties/:id" element={<PropertyDetail />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/worker-dashboard" element={<ServiceWorkerDashboard />} />
              <Route path="/services" element={<Services />} />
              <Route path="/my-profile" element={<TenantProfilePage />} />
              <Route path="/passport/:tenantId" element={<PassportPublic />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/apply/:token" element={<ApplyProperty />} />
              <Route path="/features" element={<Navigate to="/#features" replace />} />
              <Route path="/how-it-works" element={<Navigate to="/#how-it-works" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
