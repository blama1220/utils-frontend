import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export default function UserProfile() {
  const { accounts, logout, inProgress } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const account = accounts[0];

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoading(false);
      setShowDropdown(false);
    }
  };

  if (!account) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/20 text-white px-4 py-2 rounded-xl hover:bg-white/20 transition-all duration-300"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-[var(--brand-accent)] to-white rounded-full flex items-center justify-center">
          <span className="text-[var(--brand-primary)] font-bold text-sm">
            {account.name?.charAt(0)?.toUpperCase() || "U"}
          </span>
        </div>
        <div className="hidden md:block text-left">
          <div className="text-sm font-medium">{account.name}</div>
          <div className="text-xs text-white/70">{account.username}</div>
        </div>
        <span className="material-icons-outlined text-sm">
          {showDropdown ? "keyboard_arrow_up" : "keyboard_arrow_down"}
        </span>
      </button>

      {showDropdown && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowDropdown(false)}
          ></div>
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-[var(--gray-200)] z-20 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)] text-white">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {account.name?.charAt(0)?.toUpperCase() || "U"}
                  </span>
                </div>
                <div>
                  <div className="font-semibold">{account.name}</div>
                  <div className="text-sm text-white/80">{account.username}</div>
                </div>
              </div>
            </div>
            
            <div className="p-2">
              <button
                onClick={handleLogout}
                disabled={inProgress || isLoading}
                className="w-full flex items-center gap-3 px-4 py-3 text-[var(--gray-700)] hover:bg-[var(--gray-50)] rounded-lg transition-colors duration-200 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-[var(--brand-accent)] border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span className="material-icons-outlined text-[var(--brand-accent)]">logout</span>
                )}
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
