"use client";

import Link from "next/link";
import type { ManagedBy } from "@/lib/demo/state";
import { useDemoStore } from "@/lib/demo/store";
import { formatPriceRange } from "@/lib/format";
import { ChannelBadge } from "./ChannelBadge";
import { PageHeader, primaryButtonClass, TableFrame, tdClass, thClass } from "./ui";

export function ArticlesTable() {
  const { state, changeManagedBy } = useDemoStore();

  return (
    <>
      <PageHeader
        title="Artículos"
        description="Maestro de artículos. Todo se carga desde el ERP."
        action={<Link href="/articulos/nuevo" className={primaryButtonClass}>Nuevo artículo</Link>}
      />

      <TableFrame>
        <thead>
          <tr>
            <th scope="col" className={thClass}>Artículo</th>
            <th scope="col" className={thClass}>Variantes</th>
            <th scope="col" className={thClass}>Precio</th>
            <th scope="col" className={`${thClass} text-right`}>Stock</th>
            <th scope="col" className={thClass}>Tiendanube</th>
            <th scope="col" className={thClass}>Gestionado en</th>
          </tr>
        </thead>
        <tbody>
          {state.articles.map((article) => (
            <tr key={article.id}>
              <td className={tdClass}>
                <div className="font-medium">{article.name}</div>
                {article.brand && <div className="text-xs text-slate-500">{article.brand}</div>}
              </td>
              <td className={tdClass}>
                <details>
                  <summary className="cursor-pointer">{article.variants.length}</summary>
                  <ul className="mt-2 space-y-1 text-xs text-slate-600">
                    {article.variants.map((variant) => (
                      <li key={variant.id} className="whitespace-nowrap">
                        <span className="font-mono">{variant.sku}</span>
                        {variant.values.length > 0 && ` · ${variant.values.join(" / ")}`}
                        {` · ${variant.stock} u.`}
                      </li>
                    ))}
                  </ul>
                </details>
              </td>
              <td className={`${tdClass} whitespace-nowrap`}>
                {formatPriceRange(article.variants.map((variant) => variant.price))}
              </td>
              <td className={`${tdClass} text-right tabular-nums`}>
                {article.variants.reduce((total, variant) => total + variant.stock, 0)}
              </td>
              <td className={tdClass}><ChannelBadge channel={article.channel} /></td>
              <td className={tdClass}>
                <label className="sr-only" htmlFor={`managed-${article.id}`}>Sistema que gestiona {article.name}</label>
                <select
                  id={`managed-${article.id}`}
                  value={article.managedBy}
                  onChange={(event) => changeManagedBy(article.id, event.target.value as ManagedBy)}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
                >
                  <option value="erp">ERP</option>
                  <option value="tango">Tango</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </TableFrame>
    </>
  );
}
