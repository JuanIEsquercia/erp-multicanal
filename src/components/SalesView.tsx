"use client";

import Link from "next/link";
import { Fragment, useState, type FormEvent } from "react";
import type { Sale, SaleOrigin, SalePayment } from "@/lib/demo/sales";
import { useDemoStore, type Result } from "@/lib/demo/store";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  Badge,
  Card,
  inputClass,
  PageHeader,
  primaryButtonClass,
  secondaryButtonClass,
  TableFrame,
  tdClass,
  thClass,
} from "./ui";

const ORIGIN_LABELS: Record<SaleOrigin, string> = {
  tiendanube: "Tiendanube",
  portal: "Portal",
  local: "Local",
};

const PAYMENT_LABELS: Record<SalePayment["status"], string> = {
  pending: "Pendiente",
  reported: "Informado",
  consolidated: "Consolidado",
  voided: "Anulado",
};

const PAYMENT_TONES = {
  pending: "warning",
  reported: "neutral",
  consolidated: "success",
  voided: "danger",
} as const;

function useActionError() {
  const [error, setError] = useState<string | null>(null);
  return {
    error,
    run(action: () => Result): boolean {
      const result = action();
      setError(result.ok ? null : result.message);
      return result.ok;
    },
  };
}

function PaymentPanel({ sale }: { sale: Sale }) {
  const { reportSalePayment, consolidateSalePayment } = useDemoStore();
  const { error, run } = useActionError();
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [credited, setCredited] = useState(String(sale.total));
  const { payment } = sale;

  function handleReport(event: FormEvent) {
    event.preventDefault();
    run(() => reportSalePayment(sale.id, { method, reference }));
  }

  function handleConsolidate(event: FormEvent) {
    event.preventDefault();
    run(() => consolidateSalePayment(sale.id, Number(credited.trim().replace(",", "."))));
  }

  return (
    <div>
      <h3 className="font-medium">Pago</h3>
      {payment.status === "pending" && (
        <form onSubmit={handleReport} className="mt-2 space-y-2">
          <label className="block text-xs">
            Medio de pago
            <input required value={method} onChange={(e) => setMethod(e.target.value)} className={inputClass} />
          </label>
          <label className="block text-xs">
            Referencia (opcional)
            <input value={reference} onChange={(e) => setReference(e.target.value)} className={inputClass} />
          </label>
          <button type="submit" className={secondaryButtonClass}>Registrar pago</button>
        </form>
      )}
      {(payment.status === "reported" || payment.status === "consolidated") && (
        <p className="mt-1 text-xs text-slate-600">
          {payment.method}
          {payment.reference && ` · ${payment.reference}`} · informado {formatDateTime(payment.reportedAt)}
        </p>
      )}
      {payment.status === "reported" && (
        <form onSubmit={handleConsolidate} className="mt-2 space-y-2">
          <label className="block text-xs">
            Monto acreditado
            <input required inputMode="decimal" value={credited} onChange={(e) => setCredited(e.target.value)} className={inputClass} />
          </label>
          <button type="submit" className={secondaryButtonClass}>Consolidar pago</button>
        </form>
      )}
      {payment.status === "consolidated" && (
        <p className="mt-1 text-xs text-slate-600">
          Acreditado {formatCurrency(payment.credited)} · diferencia {formatCurrency(sale.total - payment.credited)} ·{" "}
          {formatDateTime(payment.consolidatedAt)}
        </p>
      )}
      {payment.status === "voided" && <p className="mt-1 text-xs text-slate-600">El canal informó el pago como anulado o devuelto.</p>}
      {error && <p role="alert" className="mt-2 text-xs text-red-800">{error}</p>}
    </div>
  );
}

function InvoicePanel({ sale }: { sale: Sale }) {
  const { invoiceSale, removeSaleInvoice } = useDemoStore();
  const { error, run } = useActionError();
  const [reference, setReference] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (run(() => invoiceSale(sale.id, reference))) setReference("");
  }

  return (
    <div>
      <h3 className="font-medium">Factura</h3>
      {sale.invoice.status === "invoiced" ? (
        <>
          <p className="mt-1 text-xs text-slate-600">
            {sale.invoice.reference} · {formatDateTime(sale.invoice.invoicedAt)}
          </p>
          <button type="button" onClick={() => run(() => removeSaleInvoice(sale.id))} className={`${secondaryButtonClass} mt-2`}>
            Quitar marca
          </button>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="mt-2 space-y-2">
          <label className="block text-xs">
            Comprobante emitido fuera del ERP
            <input required placeholder="B 0001-00000000" value={reference} onChange={(e) => setReference(e.target.value)} className={inputClass} />
          </label>
          <button type="submit" className={secondaryButtonClass}>Marcar facturada</button>
        </form>
      )}
      {error && <p role="alert" className="mt-2 text-xs text-red-800">{error}</p>}
    </div>
  );
}

export function SalesView() {
  const { state, simulateTiendanubeOrder } = useDemoStore();
  const [origin, setOrigin] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [invoiceStatus, setInvoiceStatus] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);

  const sales = state.sales.filter(
    (sale) =>
      (!origin || sale.origin === origin) &&
      (!paymentStatus || sale.payment.status === paymentStatus) &&
      (!invoiceStatus || sale.invoice.status === invoiceStatus),
  );

  function handleSimulate() {
    const result = simulateTiendanubeOrder();
    setSimulationError(result.ok ? null : result.message);
  }

  return (
    <>
      <PageHeader
        title="Ventas"
        description="Pedidos de todos los canales, con su origen, pago y factura."
        action={
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleSimulate} className={secondaryButtonClass}>Simular venta de Tiendanube</button>
            <Link href="/ventas/nueva" className={primaryButtonClass}>Nueva venta</Link>
          </div>
        }
      />
      {simulationError && <p role="alert" className="text-sm text-red-800">{simulationError}</p>}

      <Card>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            Origen
            <select value={origin} onChange={(e) => setOrigin(e.target.value)} className={inputClass}>
              <option value="">Todos</option>
              {Object.entries(ORIGIN_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="text-sm">
            Pago
            <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className={inputClass}>
              <option value="">Todos</option>
              {Object.entries(PAYMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="text-sm">
            Factura
            <select value={invoiceStatus} onChange={(e) => setInvoiceStatus(e.target.value)} className={inputClass}>
              <option value="">Todas</option>
              <option value="pending">Sin facturar</option>
              <option value="invoiced">Facturada</option>
            </select>
          </label>
        </div>
      </Card>

      {sales.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">
          No hay ventas con estos filtros.
        </p>
      ) : (
        <TableFrame>
          <thead>
            <tr>
              <th scope="col" className={thClass}>Venta</th>
              <th scope="col" className={thClass}>Fecha</th>
              <th scope="col" className={thClass}>Origen</th>
              <th scope="col" className={thClass}>Cliente</th>
              <th scope="col" className={`${thClass} text-right`}>Total</th>
              <th scope="col" className={thClass}>Pago</th>
              <th scope="col" className={thClass}>Factura</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => {
              const isExpanded = expandedId === sale.id;
              return (
                <Fragment key={sale.id}>
                  <tr>
                    <td className={tdClass}>
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        onClick={() => setExpandedId(isExpanded ? null : sale.id)}
                        className="font-medium whitespace-nowrap underline"
                      >
                        {sale.number}
                      </button>
                    </td>
                    <td className={`${tdClass} whitespace-nowrap`}>{formatDateTime(sale.createdAt)}</td>
                    <td className={tdClass}>
                      {ORIGIN_LABELS[sale.origin]}
                      {sale.externalRef && <div className="text-xs text-slate-500">#{sale.externalRef}</div>}
                    </td>
                    <td className={tdClass}>{sale.customer}</td>
                    <td className={`${tdClass} text-right whitespace-nowrap tabular-nums`}>{formatCurrency(sale.total)}</td>
                    <td className={tdClass}><Badge tone={PAYMENT_TONES[sale.payment.status]}>{PAYMENT_LABELS[sale.payment.status]}</Badge></td>
                    <td className={tdClass}>
                      <Badge tone={sale.invoice.status === "invoiced" ? "success" : "warning"}>
                        {sale.invoice.status === "invoiced" ? "Facturada" : "Sin facturar"}
                      </Badge>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={7} className={`${tdClass} bg-slate-50`}>
                        <div className="grid max-w-3xl gap-6 sm:grid-cols-3">
                          <div>
                            <h3 className="font-medium">Artículos</h3>
                            <ul className="mt-1 space-y-1 text-xs text-slate-600">
                              {sale.items.map((item) => (
                                <li key={item.sku}>
                                  {item.quantity} × {item.name} (<span className="font-mono">{item.sku}</span>) a {formatCurrency(item.unitPrice)}
                                </li>
                              ))}
                            </ul>
                            {sale.customerDocument && <p className="mt-2 text-xs text-slate-600">Documento: {sale.customerDocument}</p>}
                          </div>
                          <PaymentPanel sale={sale} />
                          <InvoicePanel sale={sale} />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </TableFrame>
      )}
    </>
  );
}
