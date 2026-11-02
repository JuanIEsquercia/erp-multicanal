import type { Metadata } from "next";
import { ModulePage } from "@/components/ModulePage";

export const metadata: Metadata = { title: "Clientes" };

export default function Page() {
  return <ModulePage moduleId="clientes" />;
}
