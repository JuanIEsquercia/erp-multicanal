"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useDemoStore } from "@/lib/demo/store";
import { formatCurrency } from "@/lib/format";
import { Card, inputClass, PageHeader, primaryButtonClass, secondaryButtonClass } from "./ui";

type ItemDraft = { sku: string; quantity: string };

const emptyItem: ItemDraft = { sku: "", quantity: "1" };

export function NewSaleForm() {
  const router = useRouter();
  const { state, createSale } = useDemoStore();
  const [origin, setOrigin] = useState<"local" | "portal">("local");
  const [customer, setCustomer] = useState("");
  const [customerDocument, setCustomerDocument] = useState("");
  const [items, setItems] = useState<ItemDraft[]>([emptyItem]);
  const [method, setMethod] = useState("");
  const [error, setError] = useState<string | null>(null);

  const sellable = state.articles
    .filter((article) => article.managedBy === "erp")
    .flatMap((article) => article.variants.map((variant) => ({ article, variant })))
    .filter(({ variant }) => variant.stock > 0);

  const updateItem = (index: number, field: keyof ItemDraft, value: string) =>
    setItems((current) => current.map((item, i) => (i === index ? { ...item, [field]: value } : item)));

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = createSale({
      origin,
      customer,
      customerDocument,
      items: items.map((item) => ({ sku: item.sku, quantity: Number(item.quantity) })),
      payment: method.trim()
        ? { status: "reported", method: method.trim(), reportedAt: new Date().toISOString() }
        : undefined,
    });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setOrigin("local");
    setCustomer("");
    setCustomerDocument("");
    setItems([emptyItem]);
    setMethod("");
    setError(null);
    router.push("/ventas");
  }

  return (
    <>
      <PageHeader title="Nueva venta" description="Solo se pueden vender artículos gestionados en el ERP. El stock se descuenta al confirmar." />

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm">
              Origen
              <select value={origin} onChange={(e) => setOrigin(e.target.value as "local" | "portal")} className={inputClass}>
                <option value="local">Local</option>
                <option value="portal">Portal</option>
              </select>
            </label>
            <label className="text-sm">
              Cliente
              <input required value={customer} onChange={(e) => setCustomer(e.target.value)} className={inputClass} />
            </label>
            <label className="text-sm">
              CUIT o DNI (opcional)
              <input value={customerDocument} onChange={(e) => setCustomerDocument(e.target.value)} className={inputClass} />
            </label>
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Artículos</legend>
            {items.map((item, index) => (
              <div key={index} className="grid items-end gap-2 sm:grid-cols-[1fr_7rem_auto]">
                <label className="text-xs">
                  Artículo
                  <select required value={item.sku} onChange={(e) => updateItem(index, "sku", e.target.value)} className={inputClass}>
                    <option value="">Elegir…</option>
                    {sellable.map(({ article, variant }) => (
                      <option key={variant.id} value={variant.sku}>
                        {article.name} · {variant.sku} · {formatCurrency(variant.promotionalPrice ?? variant.price)} · {variant.stock} u.
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs">
                  Cantidad
                  <input required inputMode="numeric" value={item.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value)} className={inputClass} />
                </label>
                <button
                  type="button"
                  disabled={items.length === 1}
                  onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
                  className={`${secondaryButtonClass} justify-center`}
                >
                  Quitar
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setItems((current) => [...current, emptyItem])} className={secondaryButtonClass}>
              Agregar artículo
            </button>
          </fieldset>

          <label className="block text-sm sm:max-w-xs">
            Medio de pago (vacío si todavía no pagó)
            <input placeholder="Efectivo, transferencia…" value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass} />
          </label>

          {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</p>}

          <div className="flex flex-wrap gap-2">
            <button type="submit" className={primaryButtonClass}>Confirmar venta</button>
            <Link href="/ventas" className={secondaryButtonClass}>Cancelar</Link>
          </div>
        </form>
      </Card>
    </>
  );
}
