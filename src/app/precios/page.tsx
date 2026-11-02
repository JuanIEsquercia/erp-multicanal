import type { Metadata } from "next";
import { ModulePage } from "@/components/ModulePage";

export const metadata: Metadata = { title: "Listas de precios" };

export default function Page() {
  return <ModulePage moduleId="precios" />;
}
