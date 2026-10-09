import type { Metadata } from "next";
import Link from "next/link";
import { IconoSistema } from "@/components/publico/ilustraciones";
import { MarcoPublico } from "@/components/publico/marco";
import { leerLegales, leerVersionPublicada, legalesPublicados } from "@/server/snapshot-publico";

export const metadata: Metadata = {
  title: "Bola perdida",
  robots: { index: false, follow: false },
};

export default async function NoEncontrada() {
  const [version, legales] = await Promise.all([leerVersionPublicada(), leerLegales()]);
  return (
    <MarcoPublico snapshot={version?.snapshot ?? null} legales={legalesPublicados(legales)}>
      <main id="main" tabIndex={-1} className="pagina sistema">
        <div className="wrap pagina-head">
          <IconoSistema tipo="perdida" />
          <h1 className="display">Bola perdida.</h1>
          <p className="lead">Esta página no está en el campo. Vuelve al inicio o cuéntanos tu propuesta.</p>
          <div className="pagina-acciones">
            <Link className="btn btn-verde" href="/">
              Volver al inicio
            </Link>
            <Link className="btn btn-ghost" href="/proponer">
              Proponer colaboración
            </Link>
          </div>
        </div>
      </main>
    </MarcoPublico>
  );
}
