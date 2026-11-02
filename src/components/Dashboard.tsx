"use client";

import Link from "next/link";
import { LOW_STOCK_THRESHOLD } from "@/lib/demo/seed";
import { allVariants } from "@/lib/demo/state";
import { useDemoStore } from "@/lib/demo/store";
import { formatDateTime } from "@/lib/format";
import { Card, PageHeader } from "./ui";

export function Dashboard() {
  const { state } = useDemoStore();
  const variants = allVariants(state);

  const stats = [
    { label: "Artículos", value: state.articles.length, href: "/articulos" },
    { label: "Unidades en stock", value: variants.reduce((total, variant) => total + variant.stock, 0), href: "/inventario" },
    { label: `Variantes con menos de ${LOW_STOCK_THRESHOLD} u.`, value: variants.filter((variant) => variant.stock < LOW_STOCK_THRESHOLD).length, href: "/inventario" },
    { label: "Sin publicar", value: state.articles.filter((article) => article.managedBy === "erp" && article.channel.status !== "published").length, href: "/canales/tiendanube" },
    { label: "Ventas sin facturar", value: state.sales.filter((sale) => sale.invoice.status === "pending").length, href: "/ventas" },
    { label: "Pagos por consolidar", value: state.sales.filter((sale) => sale.payment.status === "reported").length, href: "/ventas" },
  ];

  return (
    <>
      <PageHeader title="Panel" description="Resumen de la operación, calculado con los datos de prueba." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-400">
            <p className="text-2xl font-semibold tabular-nums">{stat.value}</p>
            <p className="mt-1 text-sm text-slate-600">{stat.label}</p>
          </Link>
        ))}
      </div>

      <Card title="Últimos movimientos de stock">
        <ul className="divide-y divide-slate-100 text-sm">
          {state.movements.slice(0, 5).map((movement) => (
            <li key={movement.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2">
              <span>
                <span className="font-mono text-xs">{movement.sku}</span>
                {` · ${movement.delta > 0 ? "+" : ""}${movement.delta} u. · ${movement.reason}`}
              </span>
              <span className="text-slate-500">{formatDateTime(movement.at)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
