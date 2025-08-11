import QueryInput from '../components/QueryInput';

export default function Consulta() {
  return (
    <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-4xl font-bold text-center text-gray-800 mb-12">Consulta de Comprobante Fiscal</h1>
      <QueryInput />
    </main>
  );
}
