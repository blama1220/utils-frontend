export default function Home() {
  return (
    <main>
      <section className="py-24 sm:py-32 bg-gradient-to-br from-white to-blue-50">
        <div className="container mx-auto px-6 text-center">
          <div className="flex justify-center mb-6">
            <span className="material-icons-outlined text-[var(--brand-accent)]" style={{ fontSize: '64px' }}>widgets</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-[var(--brand-primary)] mb-4 tracking-tight">Utilidades para tu día a día</h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">Herramientas simples y eficientes, diseñadas para cubrir nuestras necesidades.</p>
        </div>
      </section>
      <section className="pb-20 sm:pb-32 -mt-16">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12 text-[var(--brand-primary)] flex items-center justify-center gap-3">
            <span className="material-icons-outlined text-3xl">construction</span>Nuestras Herramientas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden group hover:border-[var(--brand-secondary)] transition-all duration-300 shadow-lg hover:shadow-xl">
              <div className="p-8 text-center">
                <div className="flex justify-center mb-4">
                  <div className="bg-[var(--brand-accent)] bg-opacity-20 p-4 rounded-full">
                    <span className="material-icons-outlined text-[var(--brand-accent)] text-3xl">receipt_long</span>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-[var(--brand-primary)] mb-2">Consulta Comprobante</h3>
                <p className="text-gray-600 mb-6">Verifica el estado de tus comprobantes fiscales de manera rápida y segura.</p>
                <a className="inline-flex items-center justify-center gap-2 bg-[var(--brand-secondary)] text-white font-semibold px-8 py-3 rounded-full hover:bg-opacity-90 transition-all duration-300 w-full" href="/consulta">
                  Acceder <span className="material-icons-outlined">arrow_forward</span>
                </a>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 flex flex-col items-center justify-center text-center p-8 hover:border-[var(--brand-accent)] hover:bg-blue-50 transition-all duration-300">
              <div className="bg-gray-200 p-4 rounded-full mb-4">
                <span className="material-icons-outlined text-gray-500 text-3xl">hourglass_top</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Próximamente</h3>
              <p className="text-gray-500">Estamos trabajando en nuevas herramientas para ti.</p>
            </div>
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 flex flex-col items-center justify-center text-center p-8 hover:border-[var(--brand-accent)] hover:bg-blue-50 transition-all duration-300">
              <div className="bg-gray-200 p-4 rounded-full mb-4">
                <span className="material-icons-outlined text-gray-500 text-3xl">hourglass_top</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Próximamente</h3>
              <p className="text-gray-500">Estamos trabajando en nuevas herramientas para ti.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
