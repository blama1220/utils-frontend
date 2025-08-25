import QueryInput from '../components/QueryInput';

export default function Consulta() {
  return (
    <main className="max-w-[1800px] mx-auto px-2 sm:px-4 lg:px-6 py-12">
      <h1 className="text-4xl font-bold text-center text-gray-800 mb-12">Consulta de Comprobante Fiscal</h1>
      <QueryInput />
    </main>
  );
}
