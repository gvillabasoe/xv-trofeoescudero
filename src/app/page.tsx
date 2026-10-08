import { abreviarCommit, describirEntorno } from "@/lib/entorno";

// Página estática: los valores se fijan en el momento del build.
export const dynamic = "force-static";

export default function PaginaComprobacion() {
  const entorno = describirEntorno(process.env.VERCEL_ENV);
  const rama = process.env.VERCEL_GIT_COMMIT_REF ?? "—";
  const commit = abreviarCommit(process.env.VERCEL_GIT_COMMIT_SHA);
  const versionNode = process.version;

  return (
    <main id="main" tabIndex={-1} className="contenedor comprobacion">
      <p className="etiqueta">XV Edición · 3 de agosto de 2027 · Golf El Rompido</p>
      <h1 className="titular">
        Fundación técnica <em>en construcción.</em>
      </h1>
      <p className="entradilla">
        Página provisional de comprobación del PR-1. No forma parte de la web pública ni contiene
        datos del torneo en base de datos.
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
      </dl>

      <p className="nota">
        Si ves esta página, el despliegue de Vercel funciona. Lint, typecheck, tests y build se
        comprueban en GitHub Actions; lint y typecheck, además, en los Native Deployment Checks de
        Vercel.
      </p>
    </main>
  );
}
