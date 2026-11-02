import { describe, expect, it } from "vitest";
import { saleInputFromTiendanubeOrder, type TiendanubeOrder } from "./channel-adapter";
import {
  clearInvoice,
  consolidatePayment,
  markInvoiced,
  registerSale,
  reportPayment,
  type SaleInput,
} from "./sales";
import { SEED_STATE } from "./seed";
import { allVariants, setManagedBy } from "./state";

let counter = 0;
const context = { now: "2026-11-01T00:00:00.000Z", newId: () => `id-${++counter}` };
const input: SaleInput = { origin: "local", customer: "Ana", items: [{ sku: "BUZ-M", quantity: 2 }] };

describe("registerSale", () => {
  it("descuenta stock, registra el movimiento y congela el precio promocional", () => {
    const next = registerSale(SEED_STATE, input, context);

    expect(next.sales[0]).toMatchObject({
      number: "V-1004",
      origin: "local",
      total: 76000,
      payment: { status: "pending" },
      invoice: { status: "pending" },
    });
    expect(allVariants(next).find((v) => v.sku === "BUZ-M")?.stock).toBe(10);
    expect(next.movements[0]).toMatchObject({ type: "venta", delta: -2, resulting: 10, reason: "Venta V-1004" });
  });

  it.each([
    ["stock insuficiente", { items: [{ sku: "BUZ-L", quantity: 1 }] }, /insuficiente/],
    ["artículo gestionado en Tango", { items: [{ sku: "GOR-UNI", quantity: 1 }] }, /Tango/],
    ["SKU inexistente", { items: [{ sku: "NOPE", quantity: 1 }] }, /No existe/],
    ["SKU repetido", { items: [{ sku: "BUZ-M", quantity: 1 }, { sku: "BUZ-M", quantity: 1 }] }, /repetido/],
    ["cantidad inválida", { items: [{ sku: "BUZ-M", quantity: 0 }] }, /inválida/],
    ["sin cliente", { customer: " " }, /cliente/],
    ["sin artículos", { items: [] }, /artículo/],
  ])("rechaza %s", (_label, override, message) => {
    expect(() => registerSale(SEED_STATE, { ...input, ...override }, context)).toThrow(message);
  });

  it("acepta un artículo que pasó de Tango al ERP", () => {
    const migrated = setManagedBy(SEED_STATE, "art-3", "erp");
    const next = registerSale(migrated, { ...input, items: [{ sku: "GOR-UNI", quantity: 1 }] }, context);
    expect(next.sales[0].total).toBe(12900);
  });
});

describe("circuito de pago", () => {
  const sale = registerSale(SEED_STATE, input, context);
  const saleId = sale.sales[0].id;

  it("pasa de pendiente a informado y a consolidado, con el monto acreditado", () => {
    const reported = reportPayment(sale, saleId, { method: "Transferencia", reference: " T1 " }, context);
    expect(reported.sales[0].payment).toMatchObject({ status: "reported", method: "Transferencia", reference: "T1" });

    const consolidated = consolidatePayment(reported, saleId, 70000, context);
    expect(consolidated.sales[0].payment).toMatchObject({ status: "consolidated", credited: 70000 });
  });

  it("no consolida un pago que no fue informado", () => {
    expect(() => consolidatePayment(sale, saleId, 100, context)).toThrow(/informado/);
  });

  it.each([0, -1, 76001, Number.NaN])("rechaza acreditar %s", (credited) => {
    const reported = reportPayment(sale, saleId, { method: "Efectivo" }, context);
    expect(() => consolidatePayment(reported, saleId, credited, context)).toThrow(/monto/);
  });

  it("no informa dos veces el mismo pago", () => {
    const reported = reportPayment(sale, saleId, { method: "Efectivo" }, context);
    expect(() => reportPayment(reported, saleId, { method: "Efectivo" }, context)).toThrow(/pendiente/);
  });
});

describe("facturación", () => {
  const sale = registerSale(SEED_STATE, input, context);
  const saleId = sale.sales[0].id;

  it("marca y desmarca una venta como facturada", () => {
    const invoiced = markInvoiced(sale, saleId, " B 0001-1 ", context);
    expect(invoiced.sales[0].invoice).toMatchObject({ status: "invoiced", reference: "B 0001-1" });
    expect(clearInvoice(invoiced, saleId).sales[0].invoice).toEqual({ status: "pending" });
  });

  it("exige comprobante y no permite repetirlo en otra venta", () => {
    expect(() => markInvoiced(sale, saleId, " ", context)).toThrow(/comprobante/);
    expect(() => markInvoiced(sale, saleId, "B 0001-00004521", context)).toThrow(/V-1002/);
  });
});

describe("saleInputFromTiendanubeOrder", () => {
  const order: TiendanubeOrder = {
    id: 5,
    contact_name: "Ana",
    payment_status: "paid",
    gateway_name: "Pago Nube",
    gateway_id: "X1",
    paid_at: "2026-10-01T00:00:00.000Z",
    products: [{ sku: "A", quantity: 1 }],
  };

  it("toma un pedido pagado como pago informado, no consolidado", () => {
    expect(saleInputFromTiendanubeOrder(order, context.now)).toMatchObject({
      origin: "tiendanube",
      externalRef: "5",
      payment: { status: "reported", method: "Pago Nube", reference: "X1", reportedAt: "2026-10-01T00:00:00.000Z" },
    });
  });

  it.each([
    ["pending", "pending"],
    ["authorized", "pending"],
    ["partially_paid", "pending"],
    ["abandoned", "pending"],
    ["partially_refunded", "reported"],
    ["refunded", "voided"],
    ["voided", "voided"],
  ] as const)("convierte %s en %s", (paymentStatus, expected) => {
    const result = saleInputFromTiendanubeOrder({ ...order, payment_status: paymentStatus }, context.now);
    expect(result.payment?.status).toBe(expected);
  });
});
