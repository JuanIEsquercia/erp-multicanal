import type { ReactNode } from "react";

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function Card({ title, description, children }: { title?: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      {title && <h2 className="font-semibold">{title}</h2>}
      {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      <div className={title || description ? "mt-3" : undefined}>{children}</div>
    </section>
  );
}

export function TableFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[600px] text-left text-sm">{children}</table>
    </div>
  );
}

export const thClass = "border-b border-slate-200 bg-slate-50 px-4 py-2 font-medium whitespace-nowrap text-slate-600";
export const tdClass = "border-b border-slate-100 px-4 py-3 align-top";

export const primaryButtonClass =
  "inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50";
export const secondaryButtonClass =
  "inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50";
export const inputClass = "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";

const BADGE_TONES = {
  neutral: "bg-slate-100 text-slate-700",
  success: "bg-green-100 text-green-900",
  warning: "bg-amber-100 text-amber-900",
  danger: "bg-red-100 text-red-800",
};

export function Badge({ tone = "neutral", children }: { tone?: keyof typeof BADGE_TONES; children: ReactNode }) {
  return <span className={`rounded px-2 py-0.5 text-xs whitespace-nowrap ${BADGE_TONES[tone]}`}>{children}</span>;
}
