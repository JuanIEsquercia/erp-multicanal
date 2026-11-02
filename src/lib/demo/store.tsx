"use client";

import { createContext, use, useMemo, useState, type ReactNode } from "react";
import type { NewProduct } from "../schemas";
import { saleInputFromTiendanubeOrder, simulatedChannel, type TiendanubeOrder } from "./channel-adapter";
import {
  clearInvoice,
  consolidatePayment,
  markInvoiced,
  registerSale,
  reportPayment,
  type SaleInput,
} from "./sales";
import { SEED_STATE } from "./seed";
import {
  addArticle,
  adjustStock,
  applyStockImport,
  findExistingSkus,
  setChannelState,
  setManagedBy,
  type Article,
  type Context,
  type DemoState,
  type ManagedBy,
  type StockImportPreview,
} from "./state";

export type Result = { ok: true } | { ok: false; message: string };

type DemoStore = {
  state: DemoState;
  createArticle(product: NewProduct): Result;
  changeManagedBy(articleId: string, managedBy: ManagedBy): void;
  importStock(changes: StockImportPreview["changes"]): void;
  adjust(adjustment: { sku: string; delta: number; reason: string }): Result;
  publish(article: Article): Promise<void>;
  createSale(input: SaleInput): Result;
  simulateTiendanubeOrder(): Result;
  reportSalePayment(saleId: string, payment: { method: string; reference?: string }): Result;
  consolidateSalePayment(saleId: string, credited: number): Result;
  invoiceSale(saleId: string, reference: string): Result;
  removeSaleInvoice(saleId: string): Result;
};

const DemoContext = createContext<DemoStore | null>(null);

const createContextValues = (): Context => ({
  now: new Date().toISOString(),
  newId: () => crypto.randomUUID(),
});

// El estado vive solo en este componente: sobrevive a la navegación interna y
// se pierde al recargar, que es el comportamiento buscado para el modo de prueba.
export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(SEED_STATE);

  const store = useMemo<DemoStore>(() => {
    function apply(change: (current: DemoState, context: Context) => DemoState): Result {
      try {
        setState(change(state, createContextValues()));
        return { ok: true };
      } catch (error) {
        return { ok: false, message: error instanceof Error ? error.message : "No se pudo completar la operación." };
      }
    }

    return {
      state,
      createArticle(product) {
        const duplicated = findExistingSkus(state, product);
        if (duplicated.length > 0) {
          return { ok: false, message: `Estos SKU ya existen: ${duplicated.join(", ")}.` };
        }
        return apply((current, context) => addArticle(current, product, context));
      },
      changeManagedBy(articleId, managedBy) {
        apply((current) => setManagedBy(current, articleId, managedBy));
      },
      importStock(changes) {
        apply((current, context) => applyStockImport(current, changes, context));
      },
      adjust(adjustment) {
        return apply((current, context) => adjustStock(current, adjustment, context));
      },
      async publish(article) {
        setState((current) => setChannelState(current, article.id, { status: "publishing" }));
        try {
          const { externalId } = await simulatedChannel.publishProduct(article);
          setState((current) => setChannelState(current, article.id, { status: "published", externalId }));
        } catch (error) {
          const message = error instanceof Error ? error.message : "No se pudo publicar.";
          setState((current) => setChannelState(current, article.id, { status: "error", message }));
        }
      },
      createSale(input) {
        return apply((current, context) => registerSale(current, input, context));
      },
      simulateTiendanubeOrder() {
        const variant = state.articles
          .filter((article) => article.managedBy === "erp")
          .flatMap((article) => article.variants)
          .find((candidate) => candidate.stock > 0);
        if (!variant) return { ok: false, message: "No hay artículos del ERP con stock para simular una venta." };

        const channelSales = state.sales.filter((sale) => sale.origin === "tiendanube").length;
        const order: TiendanubeOrder = {
          id: 870000 + channelSales + 1,
          contact_name: "Comprador de prueba",
          // Alterna para probar los dos casos: pago informado y pago pendiente.
          payment_status: channelSales % 2 === 1 ? "paid" : "pending",
          gateway_name: "Mercado Pago",
          gateway_id: `MP-${channelSales + 1}`,
          products: [{ sku: variant.sku, quantity: 1 }],
        };
        return apply((current, context) =>
          registerSale(current, saleInputFromTiendanubeOrder(order, context.now), context),
        );
      },
      reportSalePayment(saleId, payment) {
        return apply((current, context) => reportPayment(current, saleId, payment, context));
      },
      consolidateSalePayment(saleId, credited) {
        return apply((current, context) => consolidatePayment(current, saleId, credited, context));
      },
      invoiceSale(saleId, reference) {
        return apply((current, context) => markInvoiced(current, saleId, reference, context));
      },
      removeSaleInvoice(saleId) {
        return apply((current) => clearInvoice(current, saleId));
      },
    };
  }, [state]);

  return <DemoContext value={store}>{children}</DemoContext>;
}

export function useDemoStore(): DemoStore {
  const store = use(DemoContext);
  if (!store) throw new Error("useDemoStore debe usarse dentro de DemoProvider.");
  return store;
}
