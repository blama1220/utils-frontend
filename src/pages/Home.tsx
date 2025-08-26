export default function Home() {
  return (
    <div>
      {/* Hero Section - V2A Style */}
      <section className="relative py-32 sm:py-40 bg-gradient-to-br from-[var(--brand-primary)] via-[var(--brand-secondary)] to-[var(--brand-light)] overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent"></div>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/5 rounded-full blur-xl"></div>
          <div className="absolute top-40 right-20 w-24 h-24 bg-[var(--brand-accent)]/10 rounded-full blur-xl"></div>
          <div className="absolute bottom-20 left-1/3 w-40 h-40 bg-white/5 rounded-full blur-xl"></div>
        </div>

        <div className="relative container mx-auto px-6 text-center">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="absolute inset-0 bg-[var(--brand-accent)] rounded-full blur-lg opacity-30"></div>
              <div className="relative bg-white p-4 rounded-full shadow-2xl">
                <img 
                  src="/v2alogo.png" 
                  alt="V2A Consulting Logo" 
                  className="w-16 h-16 object-contain"
                />
              </div>
            </div>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
            Utilidades
            <span className="block bg-gradient-to-r from-[var(--brand-accent)]  to-white bg-clip-text text-transparent pb-1">
              V2A Consulting
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto mb-8 leading-relaxed">
            Herramientas digitales profesionales diseñadas para optimizar tus
            procesos empresariales con la calidad y excelencia de V2A.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href="https://v2aconsulting.com/es/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-full border border-white/20 hover:bg-white/20 transition-all duration-300"
            >
              <span className="material-icons-outlined mr-2">launch</span>
              Visitar V2A Consulting
            </a>
          </div>
        </div>
      </section>

      {/* Services Section - Professional Layout */}
      <section className="py-24 sm:py-32 bg-[var(--gray-50)]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-[var(--brand-primary)] mb-6">
              Nuestras Herramientas
            </h2>
            <p className="text-xl text-[var(--gray-600)] max-w-3xl mx-auto">
              Desarrolladas con los más altos estándares de calidad, siguiendo
              las mejores prácticas de V2A Consulting en transformación digital.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Main Tool Card */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-[var(--gray-200)] overflow-hidden group hover:border-[var(--brand-secondary)] transition-all duration-300 shadow-xl hover:shadow-2xl">
              <div className="p-10">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center">
                    <div className="bg-gradient-to-br from-[var(--brand-secondary)] to-[var(--brand-accent)] p-4 rounded-2xl mr-4">
                      <span className="material-icons-outlined text-white text-3xl">
                        receipt_long
                      </span>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-[var(--brand-primary)] mb-2">
                        Consulta de Comprobantes Fiscales
                      </h3>
                      <span className="bg-[var(--brand-accent)] text-white text-xs font-bold px-3 py-1 rounded-full">
                        DISPONIBLE
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-[var(--gray-600)] mb-8 text-lg leading-relaxed">
                  Valida y gestiona comprobantes fiscales con tecnología
                  avanzada. Incluye validación automática, categorización
                  inteligente y generación de reportes en PDF.
                </p>
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="flex items-center text-[var(--gray-600)]">
                    <span className="material-icons-outlined text-[var(--brand-accent)] mr-2">
                      check_circle
                    </span>
                    <span>Validación DGII</span>
                  </div>
                  <div className="flex items-center text-[var(--gray-600)]">
                    <span className="material-icons-outlined text-[var(--brand-accent)] mr-2">
                      check_circle
                    </span>
                    <span>Carga Excel</span>
                  </div>
                  <div className="flex items-center text-[var(--gray-600)]">
                    <span className="material-icons-outlined text-[var(--brand-accent)] mr-2">
                      check_circle
                    </span>
                    <span>Reportes PDF</span>
                  </div>
                  <div className="flex items-center text-[var(--gray-600)]">
                    <span className="material-icons-outlined text-[var(--brand-accent)] mr-2">
                      check_circle
                    </span>
                    <span>Categorización</span>
                  </div>
                </div>
                <a
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[var(--brand-secondary)] to-[var(--brand-accent)] text-white font-semibold px-8 py-4 rounded-xl hover:shadow-lg transition-all duration-300 w-full"
                  href="/consulta"
                >
                  Acceder a la Herramienta
                  <span className="material-icons-outlined">arrow_forward</span>
                </a>
              </div>
            </div>

            {/* Coming Soon Cards */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-dashed border-[var(--gray-300)] p-8 text-center hover:border-[var(--brand-light)] hover:bg-[var(--gray-50)] transition-all duration-300">
                <div className="bg-[var(--gray-100)] p-4 rounded-full mb-4 mx-auto w-fit">
                  <span className="material-icons-outlined text-[var(--gray-600)] text-2xl">
                    analytics
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-[var(--gray-700)] mb-2">
                  Próximamente
                </h3>
                <p className="text-[var(--gray-600)] text-sm mb-4">
                  Estamos trabajando en nuevas herramientas para ti.
                </p>
                <span className="bg-[var(--gray-200)] text-[var(--gray-600)] text-xs font-medium px-3 py-1 rounded-full">
                  PRÓXIMAMENTE
                </span>
              </div>

              <div className="bg-white rounded-2xl border border-dashed border-[var(--gray-300)] p-8 text-center hover:border-[var(--brand-light)] hover:bg-[var(--gray-50)] transition-all duration-300">
                <div className="bg-[var(--gray-100)] p-4 rounded-full mb-4 mx-auto w-fit">
                  <span className="material-icons-outlined text-[var(--gray-600)] text-2xl">
                    psychology
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-[var(--gray-700)] mb-2">
                  Próximamente
                </h3>
                <p className="text-[var(--gray-600)] text-sm mb-4">
                  Estamos trabajando en nuevas herramientas para ti.
                </p>
                <span className="bg-[var(--gray-200)] text-[var(--gray-600)] text-xs font-medium px-3 py-1 rounded-full">
                  Próximamente
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* V2A Connection Section */}
      <section className="py-20 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)]">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Respaldado por V2A Consulting
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Más que planificación (P+). Somos el puente entre la estrategia y la
            ejecución.
          </p>
          <a
            href="https://v2aconsulting.com/es/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-8 py-4 bg-white text-[var(--brand-primary)] font-semibold rounded-full hover:bg-white/90 transition-all duration-300 shadow-lg"
          >
            <span className="material-icons-outlined mr-2">open_in_new</span>
            Conocer V2A Consulting
          </a>
        </div>
      </section>
    </div>
  );
}
