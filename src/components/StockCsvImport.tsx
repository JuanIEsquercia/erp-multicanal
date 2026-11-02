"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { previewStockImport } from "@/lib/demo/state";
import { useDemoStore } from "@/lib/demo/store";
import { decodeCsv, parseStockCsv, type StockCsvResult } from "@/lib/stock-csv";
import { Card, primaryButtonClass, secondaryButtonClass } from "./ui";

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MAX_VISIBLE_ROWS = 10;

export function StockCsvImport() {
  const { state, importStock } = useDemoStore();
  const fileInput = useRef<HTMLInputElement>(null);
  const [csv, setCsv] = useState<StockCsvResult | null>(null);
  const [appliedCount, setAppliedCount] = useState<number | null>(null);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setCsv(null);
    setAppliedCount(null);
    if (!file) return;

    if (file.size > MAX_FILE_BYTES) {
      setCsv({ rows: [], errors: [{ line: null, message: "El archivo supera los 4 MB." }] });
      return;
    }
    try {
      setCsv(parseStockCsv(decodeCsv(await file.arrayBuffer())));
    } catch {
      setCsv({ rows: [], errors: [{ line: null, message: "No se pudo leer el archivo." }] });
    }
  }

  function reset() {
    setCsv(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  const preview = csv ? previewStockImport(state, csv.rows) : null;

  function handleApply() {
    if (!preview) return;
    importStock(preview.changes);
    setAppliedCount(preview.changes.length);
    reset();
  }

  return (
    <Card
      title="Carga de stock por CSV"
      description={<>Columnas: <code>sku</code> y <code>stock</code> (o <code>cantidad</code>). El valor del archivo es el stock real y reemplaza al actual.</>}
    >
      <input
        ref={fileInput}
        type="file"
        accept=".csv,text/csv"
        aria-label="Archivo CSV de stock"
        onChange={handleFile}
        className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-200 file:px-3 file:py-2"
      />

      {csv && csv.errors.length > 0 && (
        <div role="alert" className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-800">
          <p className="font-medium">
            {csv.rows.length > 0 ? `Se van a omitir ${csv.errors.length} filas con errores:` : "No se puede importar el archivo:"}
          </p>
          <ul className="mt-1 list-disc pl-5">
            {csv.errors.slice(0, MAX_VISIBLE_ROWS).map((error, index) => (
              <li key={index}>{error.line !== null && `Línea ${error.line}: `}{error.message}</li>
            ))}
          </ul>
          {csv.errors.length > MAX_VISIBLE_ROWS && <p className="mt-1">y {csv.errors.length - MAX_VISIBLE_ROWS} más.</p>}
        </div>
      )}

      {preview && csv && csv.rows.length > 0 && (
        <div className="mt-3 space-y-3 text-sm">
          <p>
            {preview.changes.length} cambios · {preview.unchanged} sin cambios · {preview.unknownSkus.length} SKU desconocidos
          </p>

          {preview.unknownSkus.length > 0 && (
            <p className="rounded-md bg-amber-50 p-3 text-amber-900">
              Se van a omitir porque no existen: {preview.unknownSkus.slice(0, 20).join(", ")}
              {preview.unknownSkus.length > 20 && "…"}
            </p>
          )}

          {preview.changes.length > 0 && (
            <ul className="font-mono text-xs text-slate-700">
              {preview.changes.slice(0, MAX_VISIBLE_ROWS).map((change) => (
                <li key={change.sku}>{change.sku}: {change.current} → {change.next}</li>
              ))}
              {preview.changes.length > MAX_VISIBLE_ROWS && <li>y {preview.changes.length - MAX_VISIBLE_ROWS} más</li>}
            </ul>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleApply} disabled={preview.changes.length === 0} className={primaryButtonClass}>
              Aplicar {preview.changes.length} cambios
            </button>
            <button type="button" onClick={reset} className={secondaryButtonClass}>Cancelar</button>
          </div>
        </div>
      )}

      {appliedCount !== null && (
        <p role="status" className="mt-3 rounded-md bg-green-50 p-3 text-sm text-green-900">
          Stock actualizado en {appliedCount} variantes.
        </p>
      )}
    </Card>
  );
}
