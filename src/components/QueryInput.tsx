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
  selected?: boolean; // Add this for individual selection
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
    // Remove everything except digits, dots and commas
    const cleaned = String(str).replace(/[^\d.,-]/g, "");
    
    // If empty, return 0
    if (!cleaned) return 0;
    
    // Handle Dominican format: 1,000.00 (comma as thousands separator, dot as decimal)
    // Check if we have both comma and dot
    if (cleaned.includes(",") && cleaned.includes(".")) {
      // Find the last dot (decimal separator)
      const lastDotIndex = cleaned.lastIndexOf(".");
      const lastCommaIndex = cleaned.lastIndexOf(",");
      
      // If dot comes after comma, treat comma as thousands separator
      if (lastDotIndex > lastCommaIndex) {
        const s = cleaned.replace(/,/g, ""); // Remove all commas (thousands separators)
        const n = parseFloat(s);
        return Number.isFinite(n) ? n : 0;
      } else {
        // Comma comes after dot, treat comma as decimal separator (European format)
        const s = cleaned.replace(/\./g, "").replace(",", ".");
        const n = parseFloat(s);
        return Number.isFinite(n) ? n : 0;
      }
    }
    
    // Only comma (could be thousands or decimal separator)
    if (cleaned.includes(",") && !cleaned.includes(".")) {
      // If there are more than 3 digits after comma, it's likely a thousands separator
      const parts = cleaned.split(",");
      if (parts.length === 2 && parts[1].length > 3) {
        // Treat as thousands separator
        const s = cleaned.replace(",", "");
        const n = parseFloat(s);
        return Number.isFinite(n) ? n : 0;
      } else {
        // Treat as decimal separator
        const s = cleaned.replace(",", ".");
        const n = parseFloat(s);
        return Number.isFinite(n) ? n : 0;
      }
    }
    
    // Only dot or no separators
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  const [rows, setRows] = useState(getInitialRows);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [isDownloading, setIsDownloading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    timestamp: number;
  }>>([]);

  const addNotification = useCallback((type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, type, message, timestamp: Date.now() }]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsProcessingFile(true);
    setUploadProgress(0);
    
    const reader = new FileReader();
    reader.onprogress = (evt) => {
      if (evt.lengthComputable) {
        const progress = (evt.loaded / evt.total) * 50; // First 50% for reading
        setUploadProgress(progress);
      }
    };
    
    reader.onload = (evt) => {
      try {
        setUploadProgress(60); // Processing file
        
        const wb = XLSX.read(evt.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        
        setUploadProgress(70); // Reading data
        
        // Get all data including headers and empty rows
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        if (rawData.length === 0) {
          addNotification('error', 'El archivo Excel está vacío o no contiene datos válidos.');
          setIsProcessingFile(false);
          setUploadProgress(0);
          return;
        }

        console.log('Raw Excel data:', rawData);

        // Find the header row by looking for our target columns
        let headerRowIndex = -1;
        let headerRow: any[] = [];
        
        console.log('Searching for headers in', rawData.length, 'rows');
        
        for (let i = 0; i < rawData.length; i++) {
          const row = rawData[i] as any[];
          if (row && row.length > 0) {
            const rowStr = row.join('|').toLowerCase();
            console.log(`Row ${i}:`, row);
            console.log(`Row ${i} string:`, rowStr);
            
            // Look for our key columns in this row - be more flexible
            const hasFactura = rowStr.includes('factura') || rowStr.includes('ncf');
            const hasRnc = rowStr.includes('rnc');
            const hasMonto = rowStr.includes('monto');
            
            console.log(`Row ${i} - hasFactura: ${hasFactura}, hasRnc: ${hasRnc}, hasMonto: ${hasMonto}`);
            
            if (hasFactura && hasRnc && hasMonto) {
              headerRowIndex = i;
              headerRow = row;
              console.log('Found header row at index:', headerRowIndex);
              break;
            }
          }
        }

        if (headerRowIndex === -1) {
          addNotification('error', 'No se encontró una fila de encabezados válida. Busque las columnas: Factura/NCF, RNC, Monto RD$');
          setIsProcessingFile(false);
          setUploadProgress(0);
          return;
        }

        console.log('Found header row at index:', headerRowIndex, 'Headers:', headerRow);

        // Define the column mappings we're looking for
        const columnMappings = {
          ncf: ['factura/ncf', 'factura', 'ncf', 'factura / ncf'],
          rnc: ['rnc', 'cédula', 'cedula', 'rnc/cédula', 'rnc / cédula'],
          securityCode: ['código', 'codigo', 'código de seguridad', 'codigo de seguridad', 'security code'],
          amount: ['monto rd$', 'monto', 'monto rd', 'valor', 'importe', 'precio'],
          category: ['detalle del gasto', 'detalle', 'gasto', 'descripcion', 'descripción', 'concepto']
        };

        // Function to detect category based on description text
        const detectCategory = (description: string): string => {
          if (!description) return CATEGORY_DEFAULT;
          
          const desc = description.toLowerCase().trim();
          
          // Keywords for Vehículo/Combustible
          const vehicleKeywords = [
            'vehiculo', 'vehículo', 'vehículo', 'vehiculos', 'vehículos',
            'combustible', 'combistible', 'combustibles', 'gasolina', 'gas',
            'diesel', 'diésel', 'petróleo', 'petroleo', 'carro', 'auto',
            'automóvil', 'automovil', 'transporte', 'viaje', 'taxi',
            'uber', 'chofer', 'conductor', 'parking', 'parqueo', 'peaje'
          ];
          
          // Keywords for Alimentación/Dieta
          const foodKeywords = [
            'alimentacion', 'alimentación', 'alimento', 'alimentos',
            'comida', 'comidas', 'dieta', 'dietas', 'almuerzo', 'desayuno',
            'cena', 'merienda', 'restaurant', 'restaurante', 'cafeteria',
            'cafetería', 'food', 'bebida', 'bebidas', 'snack', 'snacks',
            'lunch', 'breakfast', 'dinner', 'cafe', 'café', 'bar',
            'panaderia', 'panadería', 'supermercado', 'colmado'
          ];
          
          // Check for vehicle/fuel keywords
          for (const keyword of vehicleKeywords) {
            if (desc.includes(keyword)) {
              return "Vehículo/Combustible";
            }
          }
          
          // Check for food keywords
          for (const keyword of foodKeywords) {
            if (desc.includes(keyword)) {
              return "Alimentación/Dieta";
            }
          }
          
          // Default category if no keywords match
          return CATEGORY_DEFAULT;
        };

        // Function to find the correct column index
        const findColumnIndex = (headerRow: any[], possibleNames: string[]) => {
          for (let i = 0; i < headerRow.length; i++) {
            const header = (headerRow[i] || '').toString().toLowerCase().trim();
            if (header) {
              for (const possibleName of possibleNames) {
                if (header.includes(possibleName.toLowerCase()) || 
                    possibleName.toLowerCase().includes(header)) {
                  return i;
                }
              }
            }
          }
          return -1;
        };

        // Detect column indices
        const detectedColumns = {
          ncf: findColumnIndex(headerRow, columnMappings.ncf),
          rnc: findColumnIndex(headerRow, columnMappings.rnc),
          securityCode: findColumnIndex(headerRow, columnMappings.securityCode),
          amount: findColumnIndex(headerRow, columnMappings.amount),
          category: findColumnIndex(headerRow, columnMappings.category)
        };

        console.log('Detected column indices:', detectedColumns);

        // Check if we found the required columns
        const missingColumns = [];
        if (detectedColumns.ncf === -1) missingColumns.push('Factura/NCF');
        if (detectedColumns.rnc === -1) missingColumns.push('RNC');
        if (detectedColumns.amount === -1) missingColumns.push('Monto RD$');

        if (missingColumns.length > 0) {
          addNotification('error', `No se encontraron las siguientes columnas requeridas: ${missingColumns.join(', ')}\n\nColumnas disponibles: ${headerRow.join(', ')}`);
          setIsProcessingFile(false);
          setUploadProgress(0);
          return;
        }

        setUploadProgress(85); // Processing rows

        // Process data rows (starting after header row)
        const dataRows = rawData.slice(headerRowIndex + 1);
        const formatted = dataRows.map((row: any[]) => {
          if (!row || row.length === 0) return null;
          
          // Get category description to detect category
          const categoryDescription = detectedColumns.category !== -1 ? 
            (row[detectedColumns.category] || '').toString() : '';
          
          // Format amount using the same logic as onAmountBlur
          const rawAmount = (row[detectedColumns.amount] || '').toString();
          const parsedAmount = parseAmount(rawAmount);
          const formattedAmount = parsedAmount ? parsedAmount.toLocaleString("es-DO", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }) : rawAmount;
          
          return {
            rnc: (row[detectedColumns.rnc] || '').toString().replace(/\s/g, "").replace(/[^0-9]/g, ""),
            ncf: (row[detectedColumns.ncf] || '').toString().toUpperCase().trim().replace(/\s/g, ""),
            securityCode: detectedColumns.securityCode !== -1 ? (row[detectedColumns.securityCode] || '').toString() : "",
            amount: formattedAmount,
            status: "",
            category: detectCategory(categoryDescription),
          };
        }).filter((row: any) => row && (row.rnc || row.ncf)); // Filter out null and empty rows

        if (formatted.length === 0) {
          addNotification('warning', 'No se encontraron datos válidos en el archivo Excel.');
          setIsProcessingFile(false);
          setUploadProgress(0);
          return;
        }

        setUploadProgress(100); // Complete
        setRows(formatted);
        addNotification('success', `Se cargaron ${formatted.length} registros correctamente.`);
        
        // Reset progress after successful upload
        setTimeout(() => {
          setIsProcessingFile(false);
          setUploadProgress(0);
        }, 1000);
        
      } catch (error) {
        console.error('Error processing Excel file:', error);
        addNotification('error', 'Error al procesar el archivo Excel. Verifique que el archivo sea válido.');
        setIsProcessingFile(false);
        setUploadProgress(0);
      }
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

  const handleAddRow = useCallback(() =>
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
    ]), []);

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
      const isEType = r.ncf?.trim().toUpperCase().startsWith("E");
      
      // Basic validation requirements
      const hasValidRnc = r.rnc && r.rnc.length >= 9 && r.rnc.length <= 11;
      const hasValidNcf = r.ncf && r.ncf.length >= 11;
      const isPending = r.status === "";
      
      // For E-type NCF, also require security code
      const canValidate = hasValidRnc && hasValidNcf && isPending && (
        !isEType || (isEType && r.securityCode && r.securityCode.trim().length > 0)
      );
      
      if (canValidate) {
        debouncedValidateRow(r, i);
      }
    });
  }, [rows, debouncedValidateRow]);

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
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-start flex-1 min-w-0">
            <span
              className={`material-icons-outlined text-xl mr-2 mt-0.5 flex-shrink-0 ${info.color}`}
            >
              {name === "Vehículo/Combustible"
                ? "directions_car"
                : "restaurant"}
            </span>
            <h4 className="font-semibold text-base leading-tight break-words">{name}</h4>
          </div>
        </div>
        <p className="text-sm text-gray-600 mb-3">
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
          <div className="flex flex-col sm:flex-row sm:justify-between text-sm text-gray-500 mt-2 gap-1">
            <span className="break-words">Consumido: {formatCurrency(consumed)}</span>
            <span className="break-words">Disponible: {formatCurrency(remaining)}</span>
          </div>
        </div>
      </div>
    );
  };

  const handleSelectRow = (index: number, checked: boolean) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(index);
      } else {
        newSet.delete(index);
      }
      return newSet;
    });
  };

  const handleSelectAllValid = useCallback(() => {
    const validIndices = rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.status === 'valida')
      .map(({ index }) => index);
    
    setSelectedRows(new Set(validIndices));
  }, [rows]);

  const handleDeselectAll = () => {
    setSelectedRows(new Set());
  };

  const downloadPDF = useCallback(async (selectedIndices: number[]) => {
    if (selectedIndices.length === 0) {
      addNotification('warning', 'No hay comprobantes seleccionados para descargar');
      return;
    }

    setIsDownloading(true);
    try {
      const selectedQueries = selectedIndices.map(index => {
        const row = rows[index];
        return {
          rnc: row.rnc,
          ncf: row.ncf,
          ...(row.ncf.startsWith("E") ? { securityCode: row.securityCode } : {}),
        };
      });

      const payload = { queries: selectedQueries };

      const res = await fetch("http://localhost:3000/refund?action=download&format=stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      // Create blob and download
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comprobantes-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Clear selection after successful download
      setSelectedRows(new Set());
      addNotification('success', `PDF generado exitosamente con ${selectedIndices.length} comprobantes`);
    } catch (error) {
      console.error("PDF download error:", error);
      addNotification('error', 'Error al descargar el PDF. Por favor, intente nuevamente.');
    } finally {
      setIsDownloading(false);
    }
  }, [rows, addNotification]);

  const handleDownloadSelected = () => {
    const selectedIndices = Array.from(selectedRows);
    downloadPDF(selectedIndices);
  };

  const handleDownloadAllValid = useCallback(() => {
    const validIndices = rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.status === 'valida')
      .map(({ index }) => index);
    
    downloadPDF(validIndices);
  }, [rows, downloadPDF]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + R: Add new row (R for Row)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        handleAddRow();
        addNotification('info', 'Nueva fila agregada (Ctrl+Shift+R)');
      }
      
      // Ctrl/Cmd + Shift + D: Download all valid
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        const validCount = rows.filter(r => r.status === 'valida').length;
        if (validCount > 0) {
          handleDownloadAllValid();
        } else {
          addNotification('warning', 'No hay comprobantes válidos para descargar');
        }
      }
      
      // Ctrl/Cmd + Shift + A: Select all valid
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        handleSelectAllValid();
        const validCount = rows.filter(r => r.status === 'valida').length;
        if (validCount > 0) {
          addNotification('info', `${validCount} comprobantes válidos seleccionados (Ctrl+Shift+A)`);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [rows, handleDownloadAllValid, handleSelectAllValid, addNotification, handleAddRow]);

  return (
    <>
      {/* Notification Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map(notification => (
          <div
            key={notification.id}
            className={`max-w-md p-4 rounded-lg shadow-lg border transition-all duration-300 ${
              notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
              notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
              notification.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
              'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex">
                <span className="material-icons-outlined text-lg mr-2 mt-0.5">
                  {notification.type === 'success' ? 'check_circle' :
                   notification.type === 'error' ? 'error' :
                   notification.type === 'warning' ? 'warning' :
                   'info'}
                </span>
                <p className="text-sm font-medium whitespace-pre-line">{notification.message}</p>
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className="ml-3 text-gray-400 hover:text-gray-600"
              >
                <span className="material-icons-outlined text-lg">close</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
      <div className="xl:col-span-3">
        <div className="bg-white p-6 rounded-2xl shadow-lg">
          <div className="flex items-center mb-6">
            <span className="material-icons-outlined text-3xl text-blue-600 mr-4">
              receipt_long
            </span>
            <h2 className="text-2xl font-semibold text-gray-700 flex-1">
              Consulta de Comprobantes
            </h2>
            
            {/* Keyboard shortcuts help */}
            <div className="group relative">
              <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                <span className="material-icons-outlined">help_outline</span>
              </button>
              <div className="absolute right-0 top-full mt-2 hidden group-hover:block bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-10 w-80">
                <h4 className="font-semibold text-gray-800 mb-2">Atajos de Teclado</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Agregar fila:</span>
                    <code className="bg-gray-100 px-2 py-1 rounded">Ctrl+Shift+R</code>
                  </div>
                  <div className="flex justify-between">
                    <span>Seleccionar válidos:</span>
                    <code className="bg-gray-100 px-2 py-1 rounded">Ctrl+Shift+A</code>
                  </div>
                  <div className="flex justify-between">
                    <span>Descargar válidos:</span>
                    <code className="bg-gray-100 px-2 py-1 rounded">Ctrl+Shift+D</code>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Summary Statistics */}
          <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="flex items-center">
                <span className="material-icons-outlined text-blue-600 mr-2">receipt</span>
                <div>
                  <p className="text-xs text-blue-600 font-medium">Total</p>
                  <p className="text-lg font-bold text-blue-800">{rows.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <div className="flex items-center">
                <span className="material-icons-outlined text-green-600 mr-2">check_circle</span>
                <div>
                  <p className="text-xs text-green-600 font-medium">Válidas</p>
                  <p className="text-lg font-bold text-green-800">{rows.filter(r => r.status === 'valida').length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-red-50 p-3 rounded-lg border border-red-200">
              <div className="flex items-center">
                <span className="material-icons-outlined text-red-600 mr-2">error</span>
                <div>
                  <p className="text-xs text-red-600 font-medium">Inválidas</p>
                  <p className="text-lg font-bold text-red-800">{rows.filter(r => r.status === 'invalida' || r.status === 'error').length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div className="flex items-center">
                <span className="material-icons-outlined text-gray-600 mr-2">hourglass_empty</span>
                <div>
                  <p className="text-xs text-gray-600 font-medium">Pendientes</p>
                  <p className="text-lg font-bold text-gray-800">{rows.filter(r => r.status === '' || r.status === 'Validando...').length}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="py-3 px-4 font-semibold text-gray-600 w-12">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={selectedRows.size > 0 && selectedRows.size === rows.filter(r => r.status === 'valida').length}
                      onChange={(e) => e.target.checked ? handleSelectAllValid() : handleDeselectAll()}
                      disabled={rows.filter(r => r.status === 'valida').length === 0}
                    />
                  </th>
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
                      <td className="py-2 px-4">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={selectedRows.has(i)}
                          onChange={(e) => handleSelectRow(i, e.target.checked)}
                          disabled={r.status !== 'valida'}
                        />
                      </td>
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
                              const isEType = r.ncf?.trim().toUpperCase().startsWith("E");
                              const hasValidRnc = r.rnc && r.rnc.length >= 9 && r.rnc.length <= 11;
                              const hasValidNcf = r.ncf && r.ncf.length >= 11;
                              const hasSecurityCode = !isEType || (isEType && r.securityCode && r.securityCode.trim().length > 0);
                              
                              if (hasValidRnc && hasValidNcf && hasSecurityCode) {
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
                              const isEType = r.ncf?.trim().toUpperCase().startsWith("E");
                              const hasValidRnc = r.rnc && r.rnc.length >= 9 && r.rnc.length <= 11;
                              const hasValidNcf = r.ncf && r.ncf.length >= 11;
                              const hasSecurityCode = !isEType || (isEType && r.securityCode && r.securityCode.trim().length > 0);
                              
                              if (hasValidRnc && hasValidNcf && hasSecurityCode) {
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
                              className={`w-[180px] p-2 pl-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
                                needsSec && (!r.securityCode || r.securityCode.trim().length === 0)
                                  ? "border-red-500 bg-red-50"
                                  : "border-gray-300"
                              }`}
                              type="text"
                              placeholder="Requerido para e-CF"
                              value={r.securityCode}
                              onChange={(e) =>
                                updateRow(i, { securityCode: e.target.value })
                              }
                              onBlur={() => {
                                const isEType = r.ncf?.trim().toUpperCase().startsWith("E");
                                const hasValidRnc = r.rnc && r.rnc.length >= 9 && r.rnc.length <= 11;
                                const hasValidNcf = r.ncf && r.ncf.length >= 11;
                                const hasSecurityCode = r.securityCode && r.securityCode.trim().length > 0;
                                
                                if (isEType && hasValidRnc && hasValidNcf && hasSecurityCode) {
                                  debouncedValidateRow(r, i);
                                }
                              }}
                            />
                            {needsSec && (!r.securityCode || r.securityCode.trim().length === 0) && (
                              <div className="group relative">
                                <span className="material-icons-outlined text-red-500 text-lg cursor-help absolute right-2 top-1/2 -translate-y-1/2">
                                  error
                                </span>
                                <div className="absolute right-0 top-full mt-2 hidden group-hover:block bg-red-50 border border-red-200 rounded-lg px-3 py-1 text-xs text-red-600 whitespace-nowrap shadow-lg z-10">
                                  Código de seguridad requerido para e-CF
                                  <div className="absolute -top-1 right-4 w-2 h-2 bg-red-50 border-l border-t border-red-200 rotate-45"></div>
                                </div>
                              </div>
                            )}
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
          <div className="mt-8 flex flex-wrap justify-start gap-4">
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg flex items-center"
              onClick={handleAddRow}
            >
              <span className="material-icons-outlined mr-2">
                add_circle_outline
              </span>
              AGREGAR FILA
            </button>
            
            <label className="bg-white hover:bg-gray-100 text-green-600 font-semibold py-2 px-6 rounded-lg border border-green-600 flex items-center cursor-pointer relative">
              <span className="material-icons-outlined mr-2">file_upload</span>
              {isProcessingFile ? 'PROCESANDO...' : 'CARGAR EXCEL'}
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileUpload}
                disabled={isProcessingFile}
              />
              {isProcessingFile && (
                <div className="absolute inset-0 bg-green-100 rounded-lg flex items-center justify-center">
                  <div className="w-full mx-4">
                    <div className="text-xs text-green-700 mb-1 text-center">{Math.round(uploadProgress)}%</div>
                    <div className="w-full bg-green-200 rounded-full h-1">
                      <div 
                        className="bg-green-600 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
            </label>
            
            <button
              onClick={handleClearAll}
              className="bg-white hover:bg-gray-100 text-red-600 font-semibold py-2 px-6 rounded-lg border border-red-600 flex items-center"
            >
              <span className="material-icons-outlined mr-2">delete_sweep</span>
              LIMPIAR TODO
            </button>

            {/* Download buttons */}
            <div className="flex gap-2 ml-auto">
              <button
                onClick={handleDownloadAllValid}
                disabled={rows.filter(r => r.status === 'valida').length === 0 || isDownloading}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-6 rounded-lg flex items-center"
              >
                <span className="material-icons-outlined mr-2">
                  {isDownloading ? 'hourglass_empty' : 'download'}
                </span>
                {isDownloading ? 'DESCARGANDO...' : 'DESCARGAR VÁLIDOS'}
              </button>
              
              <button
                onClick={handleDownloadSelected}
                disabled={selectedRows.size === 0 || isDownloading}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-6 rounded-lg flex items-center"
              >
                <span className="material-icons-outlined mr-2">
                  {isDownloading ? 'hourglass_empty' : 'file_download'}
                </span>
                {isDownloading ? 'DESCARGANDO...' : `DESCARGAR SELECCIONADOS (${selectedRows.size})`}
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="xl:col-span-1">
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
    </>
  );
}
