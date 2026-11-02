"use client";

import { useState, type FormEvent } from "react";
import { LOW_STOCK_THRESHOLD } from "@/lib/demo/seed";
import { useDemoStore } from "@/lib/demo/store";
import { formatDateTime } from "@/lib/format";
import { StockCsvImport } from "./StockCsvImport";
import { Badge, Card, inputClass, PageHeader, primaryButtonClass, TableFrame, tdClass, thClass } from "./ui";

const MOVEMENT_LABELS = { alta: "Alta", csv: "CSV", ajuste: "Ajuste", venta: "Venta" };

function StockAdjustmentForm() {
  const { state, adjust } = useDemoStore();
  const [sku, setSku] = useState("");
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const quantity = Number(delta);
    if (!Number.isInteger(quantity) || quantity === 0) {
      setError("Indicá una cantidad entera distinta de cero, por ejemplo 5 o -2.");
      return;
    }
    const result = adjust({ sku, delta: quantity, reason: reason.trim() });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(null);
    setDelta("");
    setReason("");
  }

  return (
    <Card title="Ajuste manual" description="Suma o resta unidades y deja registrado el motivo.">
      <form onSubmit={handleSubmit} className="grid items-end gap-3 sm:grid-cols-4">
        <label className="text-sm">
          Variante
          <select required value={sku} onChange={(event) => setSku(event.target.value)} className={inputClass}>
            <option value="">Elegir…</option>
            {state.articles.flatMap((article) =>
              article.variants.map((variant) => (
                <option key={variant.id} value={variant.sku}>{variant.sku} ({variant.stock} u.)</option>
              )),
            )}
          </select>
        </label>
        <label className="text-sm">
          Cantidad (+/−)
          <input required inputMode="numeric" value={delta} onChange={(event) => setDelta(event.target.value)} className={inputClass} />
        </label>
        <label className="text-sm">
          Motivo
          <input required value={reason} onChange={(event) => setReason(event.target.value)} className={inputClass} />
        </label>
        <button type="submit" className={`${primaryButtonClass} justify-center`}>Registrar ajuste</button>
      </form>
      {error && <p role="alert" className="mt-3 text-sm text-red-800">{error}</p>}
    </Card>
  );
}

export function InventoryView() {
  const { state } = useDemoStore();

  return (
    <>
      <PageHeader title="Inventario" description="Stock por variante, en un único depósito. Lo marcado como Tango es informativo: el stock que manda está en ese sistema." />

      <TableFrame>
        <thead>
          <tr>
            <th scope="col" className={thClass}>SKU</th>
            <th scope="col" className={thClass}>Artículo</th>
            <th scope="col" className={thClass}>Variante</th>
            <th scope="col" className={`${thClass} text-right`}>Stock</th>
          </tr>
        </thead>
        <tbody>
          {state.articles.flatMap((article) =>
            article.variants.map((variant) => (
              <tr key={variant.id}>
                <td className={`${tdClass} font-mono text-xs`}>{variant.sku}</td>
                <td className={tdClass}>
                  {article.name}
                  {article.managedBy === "tango" && <span className="ml-2"><Badge>Tango</Badge></span>}
                </td>
                <td className={tdClass}>{variant.values.join(" / ") || "—"}</td>
                <td className={`${tdClass} text-right tabular-nums`}>
                  {variant.stock < LOW_STOCK_THRESHOLD && (
                    <span className="mr-2"><Badge tone={variant.stock === 0 ? "danger" : "warning"}>{variant.stock === 0 ? "Sin stock" : "Bajo"}</Badge></span>
                  )}
                  {variant.stock}
                </td>
              </tr>
            )),
          )}
        </tbody>
      </TableFrame>

      <div className="grid gap-6">
        <StockCsvImport />
        <StockAdjustmentForm />
      </div>

      <div>
        <h2 className="mb-2 font-semibold">Movimientos</h2>
        <TableFrame>
          <thead>
            <tr>
              <th scope="col" className={thClass}>Fecha</th>
              <th scope="col" className={thClass}>SKU</th>
              <th scope="col" className={thClass}>Tipo</th>
              <th scope="col" className={`${thClass} text-right`}>Cambio</th>
              <th scope="col" className={`${thClass} text-right`}>Resultado</th>
              <th scope="col" className={thClass}>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {state.movements.map((movement) => (
              <tr key={movement.id}>
                <td className={`${tdClass} whitespace-nowrap`}>{formatDateTime(movement.at)}</td>
                <td className={`${tdClass} font-mono text-xs`}>{movement.sku}</td>
                <td className={tdClass}>{MOVEMENT_LABELS[movement.type]}</td>
                <td className={`${tdClass} text-right tabular-nums`}>{movement.delta > 0 ? "+" : ""}{movement.delta}</td>
                <td className={`${tdClass} text-right tabular-nums`}>{movement.resulting}</td>
                <td className={tdClass}>{movement.reason}</td>
              </tr>
            ))}
          </tbody>
        </TableFrame>
      </div>
    </>
  );
}
