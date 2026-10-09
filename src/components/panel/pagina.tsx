import Link from "next/link";
import { Suspense, type ReactNode } from "react";

/**
 * Página del panel: título, descripción y migas. El contenido va en un Suspense porque depende de la sesión
 * (cabeceras) y de la base de datos: con Cache Components, la parte estática se sirve al instante.
 */
export function PaginaPanel({
  titulo,
  descripcion,
  migas,
  children,
}: {
  titulo: string;
  descripcion?: ReactNode;
  migas?: Array<{ href: string; texto: string }>;
  children: ReactNode;
}) {
  return (
    <main id="main" tabIndex={-1} className="panel-pagina">
      <header className="panel-titulo">
        {migas && migas.length > 0 && (
          <nav aria-label="Estás en" className="migas">
            {migas.map((miga, indice) => (
              <span key={miga.href}>
                {indice > 0 && " › "}
                <Link href={miga.href}>{miga.texto}</Link>
              </span>
            ))}
          </nav>
        )}
        <h1>{titulo}</h1>
        {descripcion && <p>{descripcion}</p>}
      </header>
      <Suspense fallback={<p role="status">Cargando…</p>}>{children}</Suspense>
    </main>
  );
}

export function Seccion({
  titulo,
  id,
  acciones,
  children,
}: {
  titulo: string;
  id?: string;
  acciones?: ReactNode;
  children: ReactNode;
}) {
  const idTitulo = id ? `${id}-titulo` : undefined;
  return (
    <section className="cms-seccion" id={id} aria-labelledby={idTitulo}>
      <header>
        <h2 id={idTitulo}>{titulo}</h2>
        {acciones}
      </header>
      {children}
    </section>
  );
}

export function Chip({ tono = "neutro", children }: { tono?: "neutro" | "ok" | "aviso" | "error" | "nuevo"; children: ReactNode }) {
  return <span className={`chip${tono === "neutro" ? "" : ` chip--${tono}`}`}>{children}</span>;
}
