import Papa from "papaparse";
import { MAX_INT, MAX_STOCK_ROWS, type StockRow } from "./schemas";

const SKU_HEADERS = new Set(["sku"]);
const QUANTITY_HEADERS = new Set(["stock", "cantidad", "quantity"]);

export type StockCsvError = { line: number | null; message: string };
export type StockCsvResult = { rows: StockRow[]; errors: StockCsvError[] };

// Excel en español suele guardar los CSV en Windows-1252 en lugar de UTF-8.
export function decodeCsv(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

export function parseStockCsv(text: string): StockCsvResult {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    delimitersToGuess: [",", ";", "\t"],
    transformHeader: (header) => header.trim().toLowerCase(),
  });

  const fields = parsed.meta.fields ?? [];
  const skuField = fields.find((field) => SKU_HEADERS.has(field));
  const quantityField = fields.find((field) => QUANTITY_HEADERS.has(field));
  if (!skuField || !quantityField) {
    return {
      rows: [],
      errors: [{ line: 1, message: "El archivo debe tener las columnas sku y stock (o cantidad)." }],
    };
  }

  if (parsed.data.length > MAX_STOCK_ROWS) {
    return {
      rows: [],
      errors: [{ line: null, message: `El archivo supera el máximo de ${MAX_STOCK_ROWS} filas.` }],
    };
  }

  const rows: StockRow[] = [];
  const errors: StockCsvError[] = [];
  const firstLineBySku = new Map<string, number>();

  // Una coma decimal ("10,5") desplaza las columnas: mejor avisar que importar mal.
  const overflowingRows = new Set(
    parsed.errors.filter((error) => error.code === "TooManyFields").map((error) => error.row),
  );

  parsed.data.forEach((record, index) => {
    const line = index + 2;
    const sku = record[skuField]?.trim() ?? "";
    const rawQuantity = record[quantityField]?.trim() ?? "";

    if (overflowingRows.has(index)) {
      errors.push({ line, message: "La fila tiene más columnas que el encabezado." });
      return;
    }
    if (!sku) {
      errors.push({ line, message: "Falta el SKU." });
      return;
    }
    if (!/^\d+$/.test(rawQuantity) || Number(rawQuantity) > MAX_INT) {
      errors.push({ line, message: `Stock inválido para ${sku}: "${rawQuantity}".` });
      return;
    }

    const firstLine = firstLineBySku.get(sku);
    if (firstLine !== undefined) {
      errors.push({ line, message: `SKU ${sku} repetido (ya aparece en la línea ${firstLine}).` });
      return;
    }

    firstLineBySku.set(sku, line);
    rows.push({ sku, quantity: Number(rawQuantity) });
  });

  if (rows.length === 0 && errors.length === 0) {
    errors.push({ line: null, message: "El archivo no tiene filas para importar." });
  }

  return { rows, errors };
}
