import type { Metadata } from "next";
import { ModulePage } from "@/components/ModulePage";

export const metadata: Metadata = { title: "Cobranzas" };

export default function Page() {
  return <ModulePage moduleId="cobranzas" />;
}
