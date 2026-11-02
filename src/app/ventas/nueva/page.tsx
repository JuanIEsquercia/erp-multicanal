import type { Metadata } from "next";
import { NewSaleForm } from "@/components/NewSaleForm";

export const metadata: Metadata = { title: "Nueva venta" };

export default function Page() {
  return <NewSaleForm />;
}
