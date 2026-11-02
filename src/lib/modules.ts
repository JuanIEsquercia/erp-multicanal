import {
  BadgeDollarSign,
  BarChart3,
  Boxes,
  Building2,
  FileSpreadsheet,
  LayoutDashboard,
  type LucideIcon,
  Package,
  Receipt,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Store,
  Tags,
  Truck,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";

export type ModuleLink = { id: string; label: string; href: string; icon: LucideIcon };
export type ModuleGroup = { label: string; modules: ModuleLink[] };

// Única definición del menú: agregar un módulo acá lo suma al sidebar y al menú móvil.
export const MODULE_GROUPS: ModuleGroup[] = [
  {
    label: "General",
    modules: [{ id: "panel", label: "Panel", href: "/", icon: LayoutDashboard }],
  },
  {
    label: "Comercial",
    modules: [
      { id: "ventas", label: "Ventas", href: "/ventas", icon: ShoppingCart },
      { id: "cotizaciones", label: "Cotizaciones", href: "/cotizaciones", icon: FileSpreadsheet },
      { id: "clientes", label: "Clientes", href: "/clientes", icon: Users },
    ],
  },
  {
    label: "Catálogo y stock",
    modules: [
      { id: "articulos", label: "Artículos", href: "/articulos", icon: Package },
      { id: "precios", label: "Listas de precios", href: "/precios", icon: Tags },
      { id: "inventario", label: "Inventario", href: "/inventario", icon: Boxes },
    ],
  },
  {
    label: "Abastecimiento",
    modules: [
      { id: "compras", label: "Compras", href: "/compras", icon: ShoppingBag },
      { id: "proveedores", label: "Proveedores", href: "/proveedores", icon: Building2 },
    ],
  },
  {
    label: "Logística",
    modules: [{ id: "envios", label: "Envíos", href: "/envios", icon: Truck }],
  },
  {
    label: "Administración",
    modules: [
      { id: "facturacion", label: "Facturación", href: "/facturacion", icon: Receipt },
      { id: "cobranzas", label: "Cobranzas", href: "/cobranzas", icon: Wallet },
      { id: "reportes", label: "Reportes", href: "/reportes", icon: BarChart3 },
    ],
  },
  {
    label: "Canales de venta",
    modules: [
      { id: "tiendanube", label: "Tiendanube", href: "/canales/tiendanube", icon: Store },
      { id: "portal", label: "Portal de compradores", href: "/canales/portal", icon: BadgeDollarSign },
    ],
  },
  {
    label: "Sistema",
    modules: [
      { id: "usuarios", label: "Usuarios y roles", href: "/usuarios", icon: UserCog },
      { id: "configuracion", label: "Configuración", href: "/configuracion", icon: Settings },
    ],
  },
];

export function findModule(id: string): ModuleLink | undefined {
  return MODULE_GROUPS.flatMap((group) => group.modules).find((module) => module.id === id);
}

export function isActiveLink(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
