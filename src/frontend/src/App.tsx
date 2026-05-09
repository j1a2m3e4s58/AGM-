import { UserRole } from "@/backend";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ToastContainer } from "@/components/Toast";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";
import AdminPage from "@/pages/AdminPage";
import ChangePasswordPage from "@/pages/ChangePasswordPage";
import CheckInPage from "@/pages/CheckInPage";
import DashboardPage from "@/pages/DashboardPage";
import ImportPage from "@/pages/ImportPage";
import LoginPage from "@/pages/LoginPage";
import RegistrationPage from "@/pages/RegistrationPage";
import ReportsPage from "@/pages/ReportsPage";
import ShareholdersPage from "@/pages/ShareholdersPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Navigate,
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

// Root route
const rootRoute = createRootRoute({ component: () => <Outlet /> });

// Public routes
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});
const changePasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/change-password",
  component: () => (
    <ProtectedRoute>
      <ChangePasswordPage />
    </ProtectedRoute>
  ),
});

// Protected routes
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => (
    <ProtectedRoute>
      <Navigate to="/dashboard" />
    </ProtectedRoute>
  ),
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: () => (
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  ),
});

const shareholdersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/shareholders",
  component: () => (
    <ProtectedRoute>
      <ShareholdersPage />
    </ProtectedRoute>
  ),
});

const importRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/import",
  component: () => (
    <ProtectedRoute
      allowedRoles={[UserRole.SuperAdmin, UserRole.RegistrationOfficer]}
    >
      <ImportPage />
    </ProtectedRoute>
  ),
});

const registrationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/registration",
  component: () => (
    <ProtectedRoute
      allowedRoles={[UserRole.SuperAdmin, UserRole.RegistrationOfficer]}
    >
      <RegistrationPage />
    </ProtectedRoute>
  ),
});

const checkinRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/checkin",
  component: () => (
    <ProtectedRoute
      allowedRoles={[UserRole.SuperAdmin, UserRole.RegistrationOfficer]}
    >
      <CheckInPage />
    </ProtectedRoute>
  ),
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: () => (
    <ProtectedRoute allowedRoles={[UserRole.SuperAdmin]}>
      <AdminPage />
    </ProtectedRoute>
  ),
});

const reportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reports",
  component: () => (
    <ProtectedRoute>
      <ReportsPage />
    </ProtectedRoute>
  ),
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  changePasswordRoute,
  indexRoute,
  dashboardRoute,
  shareholdersRoute,
  importRoute,
  registrationRoute,
  checkinRoute,
  adminRoute,
  reportsRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <RouterProvider router={router} />
            <ToastContainer />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
