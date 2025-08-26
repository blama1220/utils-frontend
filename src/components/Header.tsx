import { useAuth } from "../hooks/useAuth";
import UserProfile from "./UserProfile";
import LoginButton from "./LoginButton";

export default function Header() {
  const { isAuthenticated, inProgress } = useAuth();

  return (
    <header className="bg-white/95 backdrop-blur-md sticky top-0 z-50 border-b border-[var(--gray-200)] shadow-sm">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          {/* V2A Logo/Brand */}
          <div className="flex items-center space-x-3">
            <div className="bg-white p-1 rounded-lg shadow-sm border border-[var(--gray-200)]">
              <img 
                src="/v2alogo.png" 
                alt="V2A Consulting Logo" 
                className="w-8 h-8 object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-[var(--brand-primary)] leading-tight">
                V2A Utilities
              </span>
              <span className="text-xs text-[var(--gray-600)] font-medium">
                Powered by V2A Consulting
              </span>
            </div>
          </div>
          <span className="bg-gradient-to-r from-[var(--brand-accent)] to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
            BETA
          </span>
        </div>
        
        <div className="flex items-center space-x-6">
          <nav className="hidden md:flex items-center space-x-8">
            <a
              className="text-[var(--gray-600)] hover:text-[var(--brand-primary)] transition-colors duration-300 flex items-center space-x-2 font-medium"
              href="/"
            >
              <span className="material-icons-outlined text-lg">home</span>
              <span>Inicio</span>
            </a>
            <a
              className="text-[var(--gray-600)] hover:text-[var(--brand-primary)] transition-colors duration-300 flex items-center space-x-2 font-medium"
              href="/consulta"
            >
              <span className="material-icons-outlined text-lg">receipt_long</span>
              <span>Comprobantes</span>
            </a>
            <a
              className="text-[var(--gray-600)] hover:text-[var(--brand-primary)] transition-colors duration-300 flex items-center space-x-2 font-medium"
              href="https://v2aconsulting.com/es/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="material-icons-outlined text-lg">launch</span>
              <span>V2A Consulting</span>
            </a>
          </nav>

          {/* Authentication Section */}
          <div className="flex items-center space-x-4">
            {!inProgress && (
              <>
                {isAuthenticated ? (
                  <UserProfile />
                ) : (
                  <div className="hidden md:block">
                    <LoginButton />
                  </div>
                )}
              </>
            )}
            
            {/* Mobile menu button */}
            <button className="md:hidden text-[var(--gray-600)] hover:text-[var(--brand-primary)] transition-colors">
              <span className="material-icons-outlined text-2xl">menu</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
