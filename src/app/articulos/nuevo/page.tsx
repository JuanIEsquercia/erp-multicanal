import type { Metadata } from "next";
import { NewProductForm } from "@/components/NewProductForm";

export const metadata: Metadata = { title: "Nuevo artículo" };

export default function Page() {
  return <NewProductForm />;
}
