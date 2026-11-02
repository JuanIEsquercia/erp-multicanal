"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { isActiveLink, MODULE_GROUPS } from "@/lib/modules";

const SIDEBAR_ID = "app-sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const mobileMenuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  function closeMobileMenu() {
    setIsMobileOpen(false);
    mobileMenuButton.current?.focus();
  }

  useEffect(() => {
    if (!isMobileOpen) return;
    closeButton.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileOpen(false);
        mobileMenuButton.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMobileOpen]);

  return (
    <div className="min-h-dvh">
      {isMobileOpen && (
        <div aria-hidden="true" onClick={closeMobileMenu} className="fixed inset-0 z-30 bg-black/50 lg:hidden" />
      )}

      <aside
        id={SIDEBAR_ID}
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-slate-900 text-slate-200 transition-transform duration-200 motion-reduce:transition-none ${
          isMobileOpen ? "translate-x-0" : "invisible -translate-x-full"
        } ${isDesktopCollapsed ? "" : "lg:visible lg:translate-x-0"}`}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 px-4">
          <Link href="/" onClick={() => setIsMobileOpen(false)} className="font-semibold text-white">
            ERP Ventas
          </Link>
          <button
            ref={closeButton}
            type="button"
            onClick={closeMobileMenu}
            aria-label="Cerrar menú"
            className="rounded-md p-2 hover:bg-slate-800 lg:hidden"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Módulos" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {MODULE_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="px-3 text-xs font-medium tracking-wide text-slate-400 uppercase">{group.label}</p>
              <ul className="mt-1 space-y-0.5">
                {group.modules.map(({ id, label, href, icon: Icon }) => {
                  const isActive = isActiveLink(pathname, href);
                  return (
                    <li key={id}>
                      <Link
                        href={href}
                        aria-current={isActive ? "page" : undefined}
                        onClick={() => setIsMobileOpen(false)}
                        className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                          isActive ? "bg-slate-700 font-medium text-white" : "hover:bg-slate-800"
                        }`}
                      >
                        <Icon className="size-4 shrink-0" aria-hidden="true" />
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <div className={`flex min-h-dvh flex-col transition-[padding] duration-200 motion-reduce:transition-none ${isDesktopCollapsed ? "" : "lg:pl-64"}`}>
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4">
          <button
            ref={mobileMenuButton}
            type="button"
            onClick={() => setIsMobileOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={isMobileOpen}
            aria-controls={SIDEBAR_ID}
            className="rounded-md p-2 hover:bg-slate-100 lg:hidden"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setIsDesktopCollapsed((collapsed) => !collapsed)}
            aria-label={isDesktopCollapsed ? "Mostrar menú lateral" : "Ocultar menú lateral"}
            aria-expanded={!isDesktopCollapsed}
            aria-controls={SIDEBAR_ID}
            className="hidden rounded-md p-2 hover:bg-slate-100 lg:block"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
          <p className="rounded bg-amber-100 px-2 py-1 text-xs text-amber-900">
            Modo prueba: los datos se borran al recargar
          </p>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
