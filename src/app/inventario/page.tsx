import type { Metadata } from "next";
import { InventoryView } from "@/components/InventoryView";

export const metadata: Metadata = { title: "Inventario" };

export default function Page() {
  return <InventoryView />;
}
