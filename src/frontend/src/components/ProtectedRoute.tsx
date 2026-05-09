import type { UserRole } from "@/backend";
import { useAuth } from "@/hooks/use-auth";
import { Navigate, useLocation } from "@tanstack/react-router";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, isLoading, mustChangePassword, sessionToken } = useAuth();
  const location = useLocation();

  if (isLoading && sessionToken && user) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-sm">Verifying session…</p>
        </div>
      </div>
    );
  }

  if (!sessionToken || !user) {
    return <Navigate to="/login" search={{ redirect: location.pathname }} />;
  }

  // If must change password, redirect to change-password page unless already there
  if (mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" />;
  }

  // Role-based guard
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}
