export default function Header() {
  return (
    <header className="bg-white/80 backdrop-blur-sm sticky top-0 z-50 border-b border-gray-200">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <span className="text-lg font-semibold text-[var(--brand-primary)]">V2A Utilities</span>
        </div>
        <nav className="hidden md:flex items-center space-x-8">
          <a className="text-gray-500 hover:text-[var(--brand-primary)] transition-colors duration-300 flex items-center space-x-2" href="/">
            <span className="material-icons-outlined">home</span>
            <span>Inicio</span>
          </a>
          <a className="text-gray-500 hover:text-[var(--brand-primary)] transition-colors duration-300 flex items-center space-x-2" href="#">
            <span className="material-icons-outlined">design_services</span>
            <span>Servicios</span>
          </a>
          <a className="text-gray-500 hover:text-[var(--brand-primary)] transition-colors duration-300 flex items-center space-x-2" href="#">
            <span className="material-icons-outlined">group</span>
            <span>Nosotros</span>
          </a>
          <a className="text-gray-500 hover:text-[var(--brand-primary)] transition-colors duration-300 flex items-center space-x-2" href="#">
            <span className="material-icons-outlined">mail</span>
            <span>Contacto</span>
          </a>
        </nav>
        <div className="flex items-center space-x-4">
          <a className="bg-[var(--brand-primary)] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-opacity-90 transition-opacity flex items-center space-x-2" href="#">
            <span className="material-icons-outlined">login</span>
            <span>Iniciar Sesión</span>
          </a>
          <button className="md:hidden text-gray-600">
            <span className="material-icons-outlined">menu</span>
          </button>
        </div>
      </div>
    </header>
  );
}
