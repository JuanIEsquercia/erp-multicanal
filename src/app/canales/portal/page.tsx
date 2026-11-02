import type { Metadata } from "next";
import { ModulePage } from "@/components/ModulePage";

export const metadata: Metadata = { title: "Portal de compradores" };

export default function Page() {
  return <ModulePage moduleId="portal" />;
}
