import type { Metadata } from "next";
import { TiendanubeChannel } from "@/components/TiendanubeChannel";

export const metadata: Metadata = { title: "Tiendanube" };

export default function Page() {
  return <TiendanubeChannel />;
}
