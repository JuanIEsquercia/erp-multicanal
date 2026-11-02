import type { Metadata } from "next";
import { ArticlesTable } from "@/components/ArticlesTable";

export const metadata: Metadata = { title: "Artículos" };

export default function Page() {
  return <ArticlesTable />;
}
