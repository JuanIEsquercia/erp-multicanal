"use client";

import { SIMULATED_FAILURE_MARKER } from "@/lib/demo/channel-adapter";
import { useDemoStore } from "@/lib/demo/store";
import { buildTiendanubeProductPayload } from "@/lib/tiendanube-payload";
import { ChannelBadge } from "./ChannelBadge";
import { Badge, PageHeader, secondaryButtonClass, TableFrame, tdClass, thClass } from "./ui";

export function TiendanubeChannel() {
  const { state, publish } = useDemoStore();

  return (
    <>
      <PageHeader
        title="Tiendanube"
        description={`Publicación simulada: no se conecta con ninguna tienda. Para probar un error, usá un SKU que contenga "${SIMULATED_FAILURE_MARKER}".`}
        action={<Badge tone="warning">Sin conexión real</Badge>}
      />

      <TableFrame>
        <thead>
          <tr>
            <th scope="col" className={thClass}>Artículo</th>
            <th scope="col" className={thClass}>Estado</th>
            <th scope="col" className={thClass}>Datos a enviar</th>
            <th scope="col" className={thClass}><span className="sr-only">Acción</span></th>
          </tr>
        </thead>
        <tbody>
          {state.articles.map((article) => (
            <tr key={article.id}>
              <td className={`${tdClass} font-medium`}>{article.name}</td>
              <td className={tdClass}>
                <ChannelBadge channel={article.channel} />
                {article.channel.status === "error" && (
                  <p role="alert" className="mt-1 text-xs text-red-800">{article.channel.message}</p>
                )}
              </td>
              <td className={tdClass}>
                <details>
                  <summary className="cursor-pointer">Ver JSON</summary>
                  <pre className="mt-2 max-w-md overflow-x-auto rounded bg-slate-50 p-2 text-xs">
                    {JSON.stringify(buildTiendanubeProductPayload(article), null, 2)}
                  </pre>
                </details>
              </td>
              <td className={`${tdClass} text-right`}>
                {article.managedBy === "tango" && <span className="text-xs text-slate-500">Gestionado en Tango</span>}
                {article.managedBy === "erp" && (article.channel.status === "unpublished" || article.channel.status === "error") && (
                  <button type="button" onClick={() => publish(article)} className={secondaryButtonClass}>
                    {article.channel.status === "error" ? "Reintentar" : "Publicar"}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </TableFrame>
    </>
  );
}
