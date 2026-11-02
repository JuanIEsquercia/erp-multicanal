import type { Metadata } from "next";
import { ModulePage } from "@/components/ModulePage";

export const metadata: Metadata = { title: "Facturación" };

export default function Page() {
  return <ModulePage moduleId="facturacion" />;
}
