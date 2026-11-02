import { MODULE_CONTENT } from "@/lib/demo/module-data";
import { findModule } from "@/lib/modules";
import { Badge, Card, PageHeader, TableFrame, tdClass, thClass } from "./ui";

export function ModulePage({ moduleId }: { moduleId: string }) {
  const moduleLink = findModule(moduleId);
  const content = MODULE_CONTENT[moduleId];
  if (!moduleLink || !content) throw new Error(`Módulo sin definir: ${moduleId}`);

  return (
    <>
      <PageHeader title={moduleLink.label}description={content.description} action={<Badge>En estructura</Badge>} />

      {content.table && (
        <div>
          <p className="mb-2 text-sm text-slate-600">Datos de ejemplo, solo de lectura.</p>
          <TableFrame>
            <thead>
              <tr>
                {content.table.columns.map((column) => (
                  <th key={column} scope="col" className={thClass}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {content.table.rows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell, index) => (
                    <td key={index} className={tdClass}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </TableFrame>
        </div>
      )}

      <Card title="Funciones previstas">
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          {content.planned.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </Card>
    </>
  );
}
