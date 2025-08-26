import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export default function LoginButton() {
  const { login, inProgress } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  // Hide login button if auth is disabled
  const authEnabled = import.meta.env.VITE_ENABLE_AUTH !== 'false';
  
  if (!authEnabled) {
    return null; // Don't render anything if auth is disabled
  }

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      await login();
    } catch (error) {
      console.error("Login error:", error);
      // You can add toast notification here
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogin}
      disabled={inProgress || isLoading}
      className="inline-flex items-center justify-center gap-3 bg-gradient-to-r from-[var(--brand-secondary)] to-[var(--brand-accent)] text-white font-semibold px-6 py-3 rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading || inProgress ? (
        <>
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          <span>Iniciando sesión...</span>
        </>
      ) : (
        <>
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 9.74s9-4.19 9-9.74V7l-10-5z" />
          </svg>
          <span>Iniciar sesión con Microsoft</span>
        </>
      )}
    </button>
  );
}
