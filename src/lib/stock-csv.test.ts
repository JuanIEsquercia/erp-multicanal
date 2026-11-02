import { describe, expect, it } from "vitest";
import { decodeCsv, parseStockCsv } from "./stock-csv";

describe("parseStockCsv", () => {
  it("lee el formato de Excel: BOM, punto y coma y encabezados con mayúsculas", () => {
    const result = parseStockCsv("﻿SKU;Cantidad\r\n001;12\r\nB-2;0\r\n");
    expect(result).toEqual({
      rows: [{ sku: "001", quantity: 12 }, { sku: "B-2", quantity: 0 }],
      errors: [],
    });
  });

  it("exige las columnas requeridas", () => {
    expect(parseStockCsv("codigo,stock\nA,1").errors[0].message).toMatch(/columnas/);
  });

  it.each(["-1", "1.5", "abc", "", "2147483648"])("rechaza el stock %j", (quantity) => {
    const result = parseStockCsv(`sku,stock\nA,${quantity}`);
    expect(result.rows).toEqual([]);
    expect(result.errors[0].line).toBe(2);
  });

  it("marca los SKU repetidos con su línea", () => {
    const { errors } = parseStockCsv("sku,stock\nA,1\nB,2\nA,3");
    expect(errors).toEqual([{ line: 4, message: "SKU A repetido (ya aparece en la línea 2)." }]);
  });

  it("no acepta una coma decimal que desplaza las columnas", () => {
    const { rows, errors } = parseStockCsv("sku,stock\nA,10,5\nB,2");
    expect(rows).toEqual([{ sku: "B", quantity: 2 }]);
    expect(errors[0].line).toBe(2);
  });

  it("informa un archivo sin filas", () => {
    expect(parseStockCsv("sku,stock\n").errors).toHaveLength(1);
  });
});

describe("decodeCsv", () => {
  it("decodifica Windows-1252 cuando no es UTF-8 válido", () => {
    const bytes = Uint8Array.from([0x41, 0xf1, 0x6f]);
    expect(decodeCsv(bytes.buffer)).toBe("Año");
  });
});
