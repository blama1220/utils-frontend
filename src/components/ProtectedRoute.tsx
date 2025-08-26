import type { ReactNode } from "react";
import { useAuth } from "../hooks/useAuth";
import LoginButton from "./LoginButton";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, inProgress } = useAuth();

  // Bypass authentication if disabled in environment
  const authEnabled = import.meta.env.VITE_ENABLE_AUTH !== "false";

  if (!authEnabled) {
    return <>{children}</>; // Render children directly if auth is disabled
  }

  if (inProgress) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--brand-primary)] via-[var(--brand-secondary)] to-[var(--brand-light)]">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Acceso Requerido
            </h2>
            <p className="text-gray-600">
              Inicia sesión para acceder a las herramientas de V2A Utilities
            </p>
          </div>
          <LoginButton />
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
      {!authEnabled && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-2 py-1 rounded text-sm">
          Dev Mode - Auth Disabled
        </div>
      )}
    </>
  );
}
