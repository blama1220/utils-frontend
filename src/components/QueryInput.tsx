/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react';
import { CATEGORY_DEFAULT, CATEGORY_LIMITS } from '../constants/categories';
import { formatCurrency, parseAmount } from '../utils/formatting';

declare const XLSX: any;

export default function QueryInput() {
  const [rows, setRows] = useState([
    { rnc: '', ncf: '', securityCode: '', amount: '', status: '', category: CATEGORY_DEFAULT },
  ]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      const formatted = data.map((row: any) => {
        const low = Object.keys(row).reduce((acc: any, k: string) => {
          acc[k.toLowerCase()] = row[k];
          return acc;
        }, {} as any);
        return {
          rnc: low['rnc']?.toString() || '',
          ncf: low['ncf']?.toString().toUpperCase().trim() || '',
          securityCode: low['securitycode']?.toString() || '',
          amount: low['monto']?.toString() || '',
          status: '',
          category: CATEGORY_DEFAULT,
        };
      });
      setRows(formatted.length ? formatted : rows);
    };
    reader.readAsBinaryString(file);
  };

  const updateRow = (i: number, patch: Partial<typeof rows[number]>) => {
    setRows((prev) => {
      const copy = [...prev];
      copy[i] = { ...copy[i], ...patch };
      if (patch.rnc !== undefined || patch.ncf !== undefined || patch.securityCode !== undefined) {
        copy[i].status = '';
      }
      return copy;
    });
  };

  const handleAddRow = () =>
    setRows((prev) => [...prev, { rnc: '', ncf: '', securityCode: '', amount: '', status: '', category: CATEGORY_DEFAULT }]);

  const handleRemoveRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  const onAmountBlur = (i: number) => {
    const raw = rows[i].amount;
    const n = parseAmount(raw);
    updateRow(i, { amount: n ? n.toFixed(2) : '' });
  };

  const validateRow = async (row: any, index: number) => {
    if (!row.rnc || !row.ncf) return;
    setRows((prev) => {
      const copy = [...prev];
      if (!copy[index]) return prev;
      copy[index].status = 'Validando...';
      return copy;
    });
    try {
      const payload: any = { rnc: row.rnc, ncf: row.ncf };
      if (row.ncf.startsWith('E')) payload.securityCode = row.securityCode;
      const res = await fetch('http://localhost:3000/refund/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setRows((prev) => {
        const copy = [...prev];
        if (!copy[index]) return prev;
        copy[index].status = data.status === 'valido' ? 'valida' : 'invalida';
        return copy;
      });
    } catch {
      setRows((prev) => {
        const copy = [...prev];
        if (!copy[index]) return prev;
        copy[index].status = 'error';
        return copy;
      });
    }
  };

  useEffect(() => {
    rows.forEach((r, i) => {
      if (r.rnc && r.ncf && r.status === '') validateRow(r, i);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(rows.map(({ rnc, ncf, securityCode, status }) => ({ rnc, ncf, securityCode, status })))]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isText = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      if (isText && e.key === 'Enter') {
        e.preventDefault();
        handleAddRow();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const sums = useMemo(() => {
    return rows.reduce((acc: Record<string, number>, r) => {
      const cat = r.category || CATEGORY_DEFAULT;
      acc[cat] = (acc[cat] || 0) + (parseAmount(r.amount) || 0);
      return acc;
    }, {} as Record<string, number>);
  }, [rows]);

  const infoFor = (consumed: number, limit: number) => {
    const ratio = limit > 0 ? consumed / limit : 0;
    let color = 'text-green-600';
    let bar = 'bg-green-500';
    let label = 'Dentro del límite';
    if (ratio >= 1) {
      color = 'text-red-600';
      bar = 'bg-red-500';
      label = 'Excedido';
    } else if (ratio >= 0.8) {
      color = 'text-yellow-600';
      bar = 'bg-yellow-500';
      label = 'Alerta de tope';
    }
    return { ratio: Math.min(ratio, 1), color, bar, label };
  };

  const StatusChip = ({ status }: { status: string }) => {
    if (status === 'valida') return <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">Válida</span>;
    if (status === 'invalida') return <span className="bg-red-100 text-red-800 text-sm font-medium px-3 py-1 rounded-full">Inválida</span>;
    if (status === 'error') return <span className="bg-yellow-100 text-yellow-800 text-sm font-medium px-3 py-1 rounded-full">Error</span>;
    if (status === 'Validando...') return <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">Validando...</span>;
    return <span className="bg-gray-100 text-gray-800 text-sm font-medium px-3 py-1 rounded-full">Pendiente</span>;
  };

  const CategoryRow = ({ name }: { name: string }) => {
    const consumed = sums[name] || 0;
    const limit = CATEGORY_LIMITS[name] || 0;
    const remaining = Math.max(limit - consumed, 0);
    const info = infoFor(consumed, limit);
    return (
      <div className="p-4 border-l-4 bg-gray-50 rounded-lg mb-6" style={{ borderColor: info.bar.replace('bg', '#').replace('-500', '') }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className={`material-icons-outlined text-2xl mr-3 ${info.color}`}>{name === 'Vehículo/Combustible' ? 'directions_car' : 'restaurant'}</span>
            <h4 className="font-semibold text-lg">{name}</h4>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">Límite: {formatCurrency(limit)} <span className={info.color}>({info.label})</span></p>
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className={`${info.bar} h-2.5 rounded-full`} style={{ width: `${info.ratio * 100}%` }}></div>
          </div>
          <div className="flex justify-between text-sm text-gray-500 mt-1">
            <span>Consumido: {formatCurrency(consumed)}</span>
            <span>Disponible: {formatCurrency(remaining)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2">
        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <div className="flex items-center mb-6">
            <span className="material-icons-outlined text-3xl text-blue-600 mr-4">receipt_long</span>
            <h2 className="text-2xl font-semibold text-gray-700">Consulta de Comprobantes</h2>
          </div>
          <div className="w-full">
            <table className="w-full text-left table-fixed">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="py-3 px-2 font-semibold text-gray-600 w-[140px]">RNC / Cédula</th>
                  <th className="py-3 px-2 font-semibold text-gray-600 w-[100px]">NCF</th>
                  <th className="py-3 px-2 font-semibold text-gray-600 w-[120px]">Monto</th>
                  <th className="py-3 px-2 font-semibold text-gray-600 w-[100px]">Código Seg.</th>
                  <th className="py-3 px-2 font-semibold text-gray-600 w-[180px]">Categoría</th>
                  <th className="py-3 px-2 font-semibold text-gray-600 w-[100px]">Estado</th>
                  <th className="py-3 px-2 font-semibold text-gray-600 w-[40px]"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const needsSec = r.ncf?.trim().toUpperCase().startsWith('E');
                  return (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2 px-2">
                        <input className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" placeholder="RNC o cédula" type="text" value={r.rnc} onChange={(e) => updateRow(i, { rnc: e.target.value })} />
                      </td>
                      <td className="py-2 px-2">
                        <input className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" placeholder="NCF" type="text" value={r.ncf} onChange={(e) => updateRow(i, { ncf: e.target.value.toUpperCase().trim() })} />
                      </td>
                      <td className="py-2 px-2">
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-gray-500 text-sm">RD$</span>
                          <input className="w-full p-2 pl-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" type="text" value={r.amount} onChange={(e) => updateRow(i, { amount: e.target.value })} onBlur={() => onAmountBlur(i)} />
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        {needsSec ? (
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-2 flex items-center text-gray-400">
                              <span className="material-icons-outlined text-sm">lock</span>
                            </span>
                            <input className="w-full p-2 pl-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm" type="password" value={r.securityCode} onChange={(e) => updateRow(i, { securityCode: e.target.value })} />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center text-gray-400">
                            <span className="material-icons-outlined text-sm">lock</span>
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        <div className="relative">
                          <select className="w-full bg-white border border-gray-300 text-gray-700 py-2 px-2 pr-8 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 text-sm" value={r.category} onChange={(e) => updateRow(i, { category: e.target.value })}>
                            {Object.keys(CATEGORY_LIMITS).map((c) => (
                              <option key={c}>{c}</option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                            <svg className="fill-current h-4 w-4" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <StatusChip status={r.status} />
                      </td>
                      <td className="py-2 px-2 text-center">
                        {rows.length > 1 && (
                          <button className="text-red-500 hover:text-red-700" onClick={() => handleRemoveRow(i)}>
                            <span className="material-icons-outlined">delete</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-8 flex justify-start space-x-4">
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg flex items-center" onClick={handleAddRow}>
              <span className="material-icons-outlined mr-2">add_circle_outline</span>
              AGREGAR FILA
            </button>
            <label className="bg-white hover:bg-gray-100 text-green-600 font-semibold py-2 px-6 rounded-lg border border-green-600 flex items-center cursor-pointer">
              <span className="material-icons-outlined mr-2">file_upload</span>
              CARGAR EXCEL
              <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        </div>
      </div>
      <div className="lg:col-span-1">
        <div className="bg-white p-6 rounded-2xl shadow-lg h-full">
          <h3 className="text-2xl font-semibold mb-6">Límites de Gastos</h3>
          <p className="text-gray-500 mb-6">Seguimiento por categoría (mensual).</p>
          <div>
            {Object.keys(CATEGORY_LIMITS).map((c) => (
              <CategoryRow key={c} name={c} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

