import type { Metadata } from "next";
import { ModulePage } from "@/components/ModulePage";

export const metadata: Metadata = { title: "Configuración" };

export default function Page() {
  return <ModulePage moduleId="configuracion" />;
}
