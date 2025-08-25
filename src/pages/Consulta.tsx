import QueryInput from '../components/QueryInput';

const handleDownloadTemplate = async () => {
  try {
    const response = await fetch('/Recuadro de reembolsos - Transporte y Alimentos.xlsx');
    if (!response.ok) {
      throw new Error('No se pudo descargar el template');
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Plantilla-Comprobantes-Fiscales.xlsx';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Error downloading template:', error);
    alert('Error al descargar la plantilla. Por favor, intente nuevamente.');
  }
};

export default function Consulta() {
  return (
    <main className="max-w-[1800px] mx-auto px-2 sm:px-4 lg:px-6 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Consulta de Comprobante Fiscal</h1>
        <p className="text-gray-600 mb-6">Valida y gestiona tus comprobantes fiscales de manera fácil y rápida</p>
        <button
          onClick={handleDownloadTemplate}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
        >
          <span className="material-icons-outlined text-lg mr-2">download</span>
          Descargar Plantilla Excel
        </button>
      </div>
      <QueryInput />
    </main>
  );
}
