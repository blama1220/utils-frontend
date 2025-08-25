/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { CATEGORY_DEFAULT, CATEGORY_LIMITS } from "../constants/constants";

declare const XLSX: any;

const currencyFmt = new Intl.NumberFormat("es-DO", {
  style: "currency",
  currency: "DOP",
  minimumFractionDigits: 2,
});

const STORAGE_KEY = "comprobante-fiscal-rows";

interface Row {
  rnc: string;
  ncf: string;
  securityCode: string;
  amount: string;
  status: string;
  category: string;
  errors?: string[];
  dgii?: any;
}

const getInitialRows = (): Row[] => {
  const storedRows = localStorage.getItem(STORAGE_KEY);
  if (storedRows) {
    try {
      return JSON.parse(storedRows);
    } catch {
      // sigue al default
    }
  }
  return [
    {
      rnc: "",
      ncf: "",
      securityCode: "",
      amount: "",
      status: "",
      category: CATEGORY_DEFAULT,
    },
  ];
};

export default function QueryInput() {
  // Debounce sin re-renders
  function useDebounce<T extends (...args: any[]) => any>(
    callback: T,
    delay: number
  ) {
    const tRef = useRef<number | null>(null);
    const cbRef = useRef(callback);
    useEffect(() => {
      cbRef.current = callback;
      return () => {
        if (tRef.current) window.clearTimeout(tRef.current);
      };
    }, [callback]);
    return useCallback(
      (...args: Parameters<T>) => {
        if (tRef.current) window.clearTimeout(tRef.current);
        tRef.current = window.setTimeout(() => cbRef.current(...args), delay);
      },
      [delay]
    );
  }

  function formatCurrency(n: number) {
    return currencyFmt.format(Number.isFinite(n) ? n : 0);
  }

  function parseAmount(str: string) {
    if (str == null) return 0;
    const cleaned = String(str).replace(/[^\d.,-]/g, "");
    if (cleaned.includes(".") && cleaned.includes(",")) {
      const s = cleaned.replace(/\./g, "").replace(",", ".");
      const n = parseFloat(s);
      return Number.isFinite(n) ? n : 0;
    }
    const s = cleaned.replace(",", ".");
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  }

  const [rows, setRows] = useState(getInitialRows);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      const formatted = data.map((row: any) => {
        const low = Object.keys(row).reduce((acc: any, k: string) => {
          acc[k.toLowerCase()] = row[k];
          return acc;
        }, {} as any);
        return {
          rnc: low["rnc"]?.toString() || "",
          ncf: low["ncf"]?.toString().toUpperCase().trim() || "",
          securityCode: low["securitycode"]?.toString() || "",
          amount: low["monto"]?.toString() || "",
          status: "",
          category: CATEGORY_DEFAULT,
        };
      });
      setRows((prev) => (formatted.length ? formatted : prev));
    };
    reader.readAsBinaryString(file);
  };

  const updateRow = (i: number, patch: Partial<(typeof rows)[number]>) => {
    setRows((prev) => {
      const copy = [...prev];
      const oldRow = copy[i];
      copy[i] = { ...oldRow, ...patch };

      // reset de status si cambian campos relevantes
      if (
        (patch.rnc !== undefined &&
          patch.rnc !== oldRow.rnc &&
          (patch.rnc.length >= 9 || oldRow.rnc.length >= 9)) ||
        (patch.ncf !== undefined &&
          patch.ncf !== oldRow.ncf &&
          patch.ncf.length > 0) ||
        (patch.securityCode !== undefined &&
          patch.securityCode !== oldRow.securityCode &&
          patch.securityCode.length > 0)
      ) {
        copy[i].status = "";
      }
      return copy;
    });
  };

  const handleAddRow = () =>
    setRows((prev) => [
      ...prev,
      {
        rnc: "",
        ncf: "",
        securityCode: "",
        amount: "",
        status: "",
        category: CATEGORY_DEFAULT,
      },
    ]);

  const handleRemoveRow = (i: number) =>
    setRows((prev) => prev.filter((_, idx) => idx !== i));

  const onAmountBlur = (i: number) => {
    const raw = rows[i].amount;
    const n = parseAmount(raw);
    if (!n) {
      updateRow(i, { amount: "" });
      return;
    }
    const formatted = n.toLocaleString("es-DO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    updateRow(i, { amount: formatted });
  };

  function isValidFromResult(result: any) {
    if (!result) return false;
    const estado = (result.estado || "").toString().toUpperCase();
    return (
      estado.includes("ACEPT") ||
      estado.includes("VIGENTE") ||
      estado.includes("VALIDO") ||
      estado.includes("VÁLIDO")
    );
  }

  const validateRow = async (row: Row, index: number) => {
    if (!row.rnc || !row.ncf) return;
    setRows((prev) => {
      const copy = [...prev];
      if (!copy[index]) return prev;
      copy[index].status = "Validando...";
      copy[index].errors = [];
      return copy;
    });

    try {
      const payload = {
        queries: [
          {
            rnc: row.rnc,
            ncf: row.ncf,
            ...(row.ncf.startsWith("E")
              ? { securityCode: row.securityCode }
              : {}),
          },
        ],
      };

      const res = await fetch("http://localhost:3000/refund?action=validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      const item = json?.data?.validations?.[0];

      setRows((prev) => {
        const copy = [...prev];
        if (!copy[index]) return prev;

        if (!item) {
          copy[index].status = "error";
          copy[index].errors = ["Respuesta inválida del servidor"];
          copy[index].dgii = undefined;
          return copy;
        }

        if (item.error) {
          copy[index].status = "error";
          copy[index].errors = [item.error];
          copy[index].dgii = undefined;
          return copy;
        }

        copy[index].dgii = item.result;
        copy[index].errors = [];
        copy[index].status = isValidFromResult(item.result)
          ? "valida"
          : "invalida";
        return copy;
      });
    } catch (error) {
      console.error("Validation error:", error);
      setRows((prev) => {
        const copy = [...prev];
        if (!copy[index]) return prev;
        copy[index].status = "error";
        copy[index].errors = ["No se pudo validar el comprobante"];
        copy[index].dgii = undefined;
        return copy;
      });
    }
  };

  const debouncedValidateRow = useDebounce((row: any, index: number) => {
    if (
      row.rnc &&
      row.rnc.length >= 9 &&
      row.rnc.length <= 11 &&
      row.ncf &&
      row.status === ""
    ) {
      validateRow(row, index);
    }
  }, 500);

  useEffect(() => {
    rows.forEach((r, i) => {
      if (
        r.rnc &&
        r.rnc.length >= 9 &&
        r.rnc.length <= 11 &&
        r.ncf &&
        r.ncf.length >= 11 &&
        r.status === ""
      ) {
        debouncedValidateRow(r, i);
      }
    });
  }, [rows, debouncedValidateRow]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isText =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      if (isText && e.key === "Enter") {
        e.preventDefault();
        handleAddRow();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  }, [rows]);

  const handleClearAll = () => {
    if (window.confirm("¿Está seguro que desea limpiar toda la tabla?")) {
      setRows([
        {
          rnc: "",
          ncf: "",
          securityCode: "",
          amount: "",
          status: "",
          category: CATEGORY_DEFAULT,
        },
      ]);
    }
  };

  const sums = useMemo(() => {
    return rows.reduce((acc: Record<string, number>, r) => {
      const cat = r.category || CATEGORY_DEFAULT;
      acc[cat] = (acc[cat] || 0) + (parseAmount(r.amount) || 0);
      return acc;
    }, {} as Record<string, number>);
  }, [rows]);

  const BAR_HEX: Record<string, string> = {
    green: "#22c55e",
    yellow: "#eab308",
    red: "#ef4444",
  };

  const infoFor = (consumed: number, limit: number) => {
    const ratio = limit > 0 ? consumed / limit : 0;
    let color = "text-green-600",
      bar = "bg-green-500",
      hex = BAR_HEX.green,
      label = "Dentro del límite";
    if (ratio >= 1) {
      color = "text-red-600";
      bar = "bg-red-500";
      hex = BAR_HEX.red;
      label = "Excedido";
    } else if (ratio >= 0.8) {
      color = "text-yellow-600";
      bar = "bg-yellow-500";
      hex = BAR_HEX.yellow;
      label = "Alerta de tope";
    }
    return { ratio: Math.min(ratio, 1), color, bar, hex, label };
  };

  const StatusChip = ({
    status,
    row,
    index,
  }: {
    status: string;
    row: any;
    index: number;
  }) => {
    const showRetry = status === "error" || status === "invalida";
    return (
      <div className="flex items-center gap-2">
        <div className="relative group">
          {status === "valida" && (
            <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
              Válida
            </span>
          )}
          {status === "invalida" && (
            <span className="bg-red-100 text-red-800 text-sm font-medium px-3 py-1 rounded-full">
              Inválida
            </span>
          )}
          {status === "error" && (
            <span className="bg-yellow-100 text-yellow-800 text-sm font-medium px-3 py-1 rounded-full">
              Error
            </span>
          )}
          {status === "Validando..." && (
            <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
              Validando...
            </span>
          )}
          {status === "" && (
            <span className="bg-gray-100 text-gray-800 text-sm font-medium px-3 py-1 rounded-full">
              Pendiente
            </span>
          )}

          {row.errors && row.errors.length > 0 && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600 whitespace-pre-line shadow-lg z-10">
              {row.errors.join("\n")}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-50 border-r border-b border-red-200 rotate-45"></div>
            </div>
          )}
        </div>

        {showRetry && (
          <button
            onClick={() => validateRow(row, index)}
            className="text-blue-600 hover:text-blue-800 transition-colors"
            title="Reintentar validación"
          >
            <span className="material-icons-outlined text-lg">refresh</span>
          </button>
        )}
      </div>
    );
  };

  const CategoryRow = ({ name }: { name: string }) => {
    const consumed = sums[name] || 0;
    const limit = CATEGORY_LIMITS[name] || 0;
    const remaining = Math.max(limit - consumed, 0);
    const info = infoFor(consumed, limit);
    return (
      <div
        className="p-4 border-l-4 bg-gray-50 rounded-lg mb-6"
        style={{ borderColor: info.hex }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span
              className={`material-icons-outlined text-2xl mr-3 ${info.color}`}
            >
              {name === "Vehículo/Combustible"
                ? "directions_car"
                : "restaurant"}
            </span>
            <h4 className="font-semibold text-lg">{name}</h4>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Límite: {formatCurrency(limit)}{" "}
          <span className={info.color}>({info.label})</span>
        </p>
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className={`${info.bar} h-2.5 rounded-full`}
              style={{ width: `${info.ratio * 100}%` }}
            ></div>
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
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 xl:col-span-9 2xl:col-span-10">
        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <div className="flex items-center mb-6">
            <span className="material-icons-outlined text-3xl text-blue-600 mr-4">
              receipt_long
            </span>
            <h2 className="text-2xl font-semibold text-gray-700">
              Consulta de Comprobantes
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="py-3 px-4 font-semibold text-gray-600">
                    RNC / Cédula
                  </th>
                  <th className="py-3 px-4 font-semibold text-gray-600">NCF</th>
                  <th className="py-3 px-4 font-semibold text-gray-600">
                    Monto
                  </th>
                  <th className="py-3 px-4 font-semibold text-gray-600">
                    Código Seguridad
                  </th>
                  <th className="py-3 px-4 font-semibold text-gray-600">
                    Categoría
                  </th>
                  <th className="py-3 px-4 font-semibold text-gray-600">
                    Estado
                  </th>
                  <th className="py-3 px-4 font-semibold text-gray-600"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const needsSec = r.ncf?.trim().toUpperCase().startsWith("E");
                  return (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2 px-2">
                        <div className="relative flex items-center gap-1">
                          <input
                            className={`w-[180px] p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm uppercase ${
                              r.rnc && (r.rnc.length < 9 || r.rnc.length > 11)
                                ? "border-red-500 bg-red-50"
                                : "border-gray-300"
                            }`}
                            placeholder="RNC O CÉDULA"
                            type="text"
                            maxLength={11}
                            value={r.rnc}
                            onChange={(e) => {
                              const value = e.target.value
                                .replace(/\s/g, "")
                                .replace(/[^0-9]/g, "");
                              updateRow(i, { rnc: value });
                            }}
                            onBlur={() => {
                              if (
                                r.rnc &&
                                r.rnc.length >= 9 &&
                                r.rnc.length <= 11 &&
                                r.ncf &&
                                r.ncf.length >= 11
                              ) {
                                debouncedValidateRow(r, i);
                              }
                            }}
                          />
                          {r.rnc && (r.rnc.length < 9 || r.rnc.length > 11) && (
                            <div className="group relative">
                              <span className="material-icons-outlined text-red-500 text-lg cursor-help">
                                error
                              </span>
                              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-red-50 border border-red-200 rounded-lg px-3 py-1 text-xs text-red-600 whitespace-nowrap shadow-lg">
                                Debe tener entre 9 y 11 dígitos
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-50 border-r border-b border-red-200 rotate-45"></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <div className="relative flex items-center gap-1">
                          <input
                            className={`w-[180px] p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm uppercase ${
                              r.ncf && r.ncf.length > 0 && r.ncf.length < 11
                                ? "border-red-500 bg-red-50"
                                : "border-gray-300"
                            }`}
                            placeholder="NCF"
                            type="text"
                            value={r.ncf}
                            onChange={(e) =>
                              updateRow(i, {
                                ncf: e.target.value
                                  .replace(/\s/g, "")
                                  .toUpperCase(),
                              })
                            }
                            onBlur={() => {
                              if (
                                r.rnc &&
                                r.rnc.length >= 9 &&
                                r.rnc.length <= 11 &&
                                r.ncf &&
                                r.ncf.length >= 11
                              ) {
                                debouncedValidateRow(r, i);
                              }
                            }}
                          />
                          {r.ncf && r.ncf.length > 0 && r.ncf.length < 11 && (
                            <div className="group relative">
                              <span className="material-icons-outlined text-red-500 text-lg cursor-help">
                                error
                              </span>
                              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-red-50 border border-red-200 rounded-lg px-3 py-1 text-xs text-red-600 whitespace-nowrap shadow-lg">
                                NCF debe tener al menos 11 caracteres
                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-50 border-r border-b border-red-200 rotate-45"></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                            RD$
                          </span>
                          <input
                            className="w-[180px] p-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            type="text"
                            value={r.amount}
                            onChange={(e) =>
                              updateRow(i, { amount: e.target.value })
                            }
                            onBlur={() => onAmountBlur(i)}
                          />
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        {needsSec ? (
                          <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                              <span className="material-icons-outlined text-sm">
                                lock
                              </span>
                            </span>
                            <input
                              className="w-[180px] p-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                              type="password"
                              value={r.securityCode}
                              onChange={(e) =>
                                updateRow(i, { securityCode: e.target.value })
                              }
                            />
                          </div>
                        ) : (
                          <div className="flex items-center justify-center text-gray-400 h-[38px]">
                            <span className="material-icons-outlined text-sm">
                              lock
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        <div className="relative">
                          <select
                            className="w-[180px] appearance-none bg-white border border-gray-300 text-gray-700 p-2 pr-8 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 text-sm"
                            value={r.category}
                            onChange={(e) =>
                              updateRow(i, { category: e.target.value })
                            }
                          >
                            {Object.keys(CATEGORY_LIMITS).map((c) => (
                              <option key={c}>{c}</option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                            <span className="material-icons-outlined text-sm">
                              arrow_drop_down
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <StatusChip status={r.status} row={r} index={i} />
                      </td>
                      <td className="py-4 px-4 text-center">
                        {rows.length > 1 && (
                          <button
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleRemoveRow(i)}
                          >
                            <span className="material-icons-outlined">
                              delete
                            </span>
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
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg flex items-center"
              onClick={handleAddRow}
            >
              <span className="material-icons-outlined mr-2">
                add_circle_outline
              </span>
              AGREGAR FILA
            </button>
            <label className="bg-white hover:bg-gray-100 text-green-600 font-semibold py-2 px-6 rounded-lg border border-green-600 flex items-center cursor-pointer">
              <span className="material-icons-outlined mr-2">file_upload</span>
              CARGAR EXCEL
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
            <button
              onClick={handleClearAll}
              className="bg-white hover:bg-gray-100 text-red-600 font-semibold py-2 px-6 rounded-lg border border-red-600 flex items-center"
            >
              <span className="material-icons-outlined mr-2">delete_sweep</span>
              LIMPIAR TODO
            </button>
          </div>
        </div>
      </div>
      <div className="col-span-12 xl:col-span-3 2xl:col-span-2">
        <div className="bg-white p-6 rounded-2xl shadow-lg h-full">
          <h3 className="text-2xl font-semibold mb-6">Límites de Gastos</h3>
          <p className="text-gray-500 mb-6">
            Seguimiento por categoría (mensual).
          </p>
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
