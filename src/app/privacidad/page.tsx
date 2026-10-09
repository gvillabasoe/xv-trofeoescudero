import type { Metadata } from "next";
import { PaginaLegal } from "@/components/publico/pagina-legal";

export const metadata: Metadata = {
  title: "Política de privacidad",
  alternates: { canonical: "/privacidad" },
};

export default function PaginaPrivacidad() {
  return <PaginaLegal cual="privacidad" />;
}
