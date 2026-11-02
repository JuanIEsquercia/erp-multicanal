import type { Metadata } from "next";
import { ModulePage } from "@/components/ModulePage";

export const metadata: Metadata = { title: "Reportes" };

export default function Page() {
  return <ModulePage moduleId="reportes" />;
}
