import type { Metadata } from "next";
import { ModulePage } from "@/components/ModulePage";

export const metadata: Metadata = { title: "Usuarios y roles" };

export default function Page() {
  return <ModulePage moduleId="usuarios" />;
}
