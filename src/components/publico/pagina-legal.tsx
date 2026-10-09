import { notFound } from "next/navigation";
import { MarcoPublico } from "@/components/publico/marco";
import { TextoLegal } from "@/components/publico/texto-legal";
import { formatearFechaHora } from "@/lib/estado-base";
import { leerLegales, leerVersionPublicada, legalesPublicados } from "@/server/snapshot-publico";

/** Página de un texto legal: la última versión publicada (inmutable). Sin versión publicada, 404. */
export async function PaginaLegal({ cual }: { cual: "privacidad" | "avisoLegal" }) {
  const [version, legales] = await Promise.all([leerVersionPublicada(), leerLegales()]);
  const documento = legales[cual];
  if (!documento) notFound();

  return (
    <MarcoPublico snapshot={version?.snapshot ?? null} legales={legalesPublicados(legales)}>
      <main id="main" tabIndex={-1} className="pagina">
        <article className="wrap">
          <header className="pagina-head">
            <h1 className="display">{documento.titulo}</h1>
            <p className="legal-meta">
              Versión {documento.etiquetaVersion} · publicada el {formatearFechaHora(documento.publicadoEn)}
            </p>
          </header>
          <TextoLegal fuente={documento.cuerpo} />
        </article>
      </main>
    </MarcoPublico>
  );
}
