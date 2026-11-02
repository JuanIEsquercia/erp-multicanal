import type { Metadata } from "next";
import { ModulePage } from "@/components/ModulePage";

export const metadata: Metadata = { title: "Cotizaciones" };

export default function Page() {
  return <ModulePage moduleId="cotizaciones" />;
}
