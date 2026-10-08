import { abreviarCommit, describirEntorno } from "@/lib/entorno";
import { describirEstadoBase } from "@/lib/estado-base";
import { leerEstadoBase } from "@/server/estado-base";

// Página estática: los valores, incluidos los de la base de datos, se fijan en el momento del build.
export const dynamic = "force-static";

export default async function PaginaComprobacion() {
  const entorno = describirEntorno(process.env.VERCEL_ENV);
  const rama = process.env.VERCEL_GIT_COMMIT_REF ?? "—";
  const commit = abreviarCommit(process.env.VERCEL_GIT_COMMIT_SHA);
  const versionNode = process.version;
  const filasBase = describirEstadoBase(await leerEstadoBase());

  return (
    <main id="main" tabIndex={-1} className="contenedor comprobacion">
      <p className="etiqueta">XV Edición · 3 de agosto de 2027 · Golf El Rompido</p>
      <h1 className="titular">
        Fundación técnica <em>en construcción.</em>
      </h1>
      <p className="entradilla">
        Página provisional de comprobación de la Entrega 2. No forma parte de la web pública. La base
        de datos solo tiene la estructura: todavía no contiene datos del torneo.
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
        {filasBase.map((fila) => (
          <div className="tarjeta__fila" key={fila.etiqueta}>
            <dt>{fila.etiqueta}</dt>
            <dd>{fila.valor}</dd>
          </div>
        ))}
      </dl>

      <p className="nota">
        Los datos de la base se leen durante el build, no en cada visita. Lint, typecheck, tests, build
        y migraciones se comprueban en GitHub Actions; lint y typecheck, además, en los Native
        Deployment Checks de Vercel.
      </p>
    </main>
  );
}
