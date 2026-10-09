import type { Metadata } from "next";
import { PaginaLegal } from "@/components/publico/pagina-legal";

export const metadata: Metadata = {
  title: "Aviso legal",
  alternates: { canonical: "/aviso-legal" },
};

export default function PaginaAvisoLegal() {
  return <PaginaLegal cual="avisoLegal" />;
}
