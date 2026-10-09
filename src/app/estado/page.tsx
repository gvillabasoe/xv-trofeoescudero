import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { abreviarCommit, describirEntorno } from "@/lib/entorno";
import { describirEstadoBase, describirVersionPublicada } from "@/lib/estado-base";
import { sitioIndexable } from "@/lib/sitio";
import { leerEstadoBase } from "@/server/estado-base";
import { leerVersionPublicada } from "@/server/snapshot-publico";

// Página técnica, sin secretos ni datos personales. Desaparece (404) al lanzar la web (SITIO_PUBLICO=si).
export const metadata: Metadata = {
  title: "Estado técnico",
  robots: { index: false, follow: false },
};

export default async function EstadoTecnico() {
  if (sitioIndexable()) notFound();
  const entorno = describirEntorno(process.env.VERCEL_ENV);
  const rama = process.env.VERCEL_GIT_COMMIT_REF ?? "—";
  const commit = abreviarCommit(process.env.VERCEL_GIT_COMMIT_SHA);
  const versionNode = process.version;
  const filasBase = describirEstadoBase(await leerEstadoBase());
  const version = await leerVersionPublicada();
  const filasVersion = describirVersionPublicada(version);

  return (
    <main id="main" tabIndex={-1} className="pagina">
      <div className="wrap pagina-head">
        <p className="eyebrow">Trofeo Escudero · comprobación técnica</p>
        <h1 className="display">Estado técnico.</h1>
        <p className="lead">
          Solo para la organización mientras la web no esté lanzada. Todo lo que muestra se lee durante el build o al
          publicar, y queda en caché: no hay consultas a la base en cada visita.
        </p>
        <dl className="estado-tecnico">
          <dt>Entorno</dt>
          <dd>{entorno}</dd>
          <dt>Rama</dt>
          <dd>{rama}</dd>
          <dt>Commit</dt>
          <dd>{commit}</dd>
          <dt>Node.js del build</dt>
          <dd>{versionNode}</dd>
          {[...filasBase, ...filasVersion].map((fila) => (
            <div key={fila.etiqueta} style={{ display: "contents" }}>
              <dt>{fila.etiqueta}</dt>
              <dd>{fila.etiqueta === "contentHash" || fila.etiqueta === "ID de la revisión" ? <code>{fila.valor}</code> : fila.valor}</dd>
            </div>
          ))}
        </dl>
        <p className="legal-meta">
          Cada lectura real de la base deja en los logs de Vercel una línea «[cache:site-public] Lectura real de Neon». Si
          una visita no deja esa línea, se ha servido desde la caché.
        </p>
      </div>
    </main>
  );
}
