import type { Metadata } from "next";
import Link from "next/link";
import { abreviarCommit, describirEntorno } from "@/lib/entorno";
import { describirEstadoBase, describirVersionPublicada } from "@/lib/estado-base";
import { leerEstadoBase } from "@/server/estado-base";
import { leerVersionPublicada } from "@/server/snapshot-publico";

// Página técnica de la Fase 3. Antes del lanzamiento pasa a /admin o se elimina.
export const metadata: Metadata = {
  title: "Estado técnico · Trofeo Escudero",
};

export default async function EstadoTecnico() {
  const entorno = describirEntorno(process.env.VERCEL_ENV);
  const rama = process.env.VERCEL_GIT_COMMIT_REF ?? "—";
  const commit = abreviarCommit(process.env.VERCEL_GIT_COMMIT_SHA);
  const versionNode = process.version;
  const filasBase = describirEstadoBase(await leerEstadoBase());
  const version = await leerVersionPublicada();
  const filasVersion = describirVersionPublicada(version);

  return (
    <main id="main" tabIndex={-1} className="contenedor comprobacion">
      <p className="etiqueta">XV Edición · 3 de agosto de 2027 · Golf El Rompido</p>
      <h1 className="titular">
        Estado técnico <em>de la fundación.</em>
      </h1>
      <p className="entradilla">
        Página provisional de la Fase 3. No forma parte de la web pública. Todo lo que muestra se lee
        durante el build y queda en caché: no hay consultas a la base en cada visita.
      </p>

      <dl className="tarjeta">
        <div className="tarjeta__fila">
          <dt>Entorno</dt>
          <dd>{entorno}</dd>
        </div>
        <div className="tarjeta__fila">
          <dt>Rama</dt>
          <dd>{rama}</dd>
        </div>
        <div className="tarjeta__fila">
          <dt>Commit</dt>
          <dd>{commit}</dd>
        </div>
        <div className="tarjeta__fila">
          <dt>Node.js del build</dt>
          <dd>{versionNode}</dd>
        </div>
        {[...filasBase, ...filasVersion].map((fila) => (
          <div className="tarjeta__fila" key={fila.etiqueta}>
            <dt>{fila.etiqueta}</dt>
            <dd>{fila.valor}</dd>
          </div>
        ))}
      </dl>

      <p className="nota">
        <strong>Prueba de caché:</strong> recarga la página. Si «Snapshot leído de Neon» no cambia, la web
        sirve la versión publicada desde la caché. Solo cambia con un despliegue nuevo o, a partir de la
        Entrega 4, al publicar desde el panel. <Link href="/">Ver la portada provisional</Link>.
      </p>
    </main>
  );
}
