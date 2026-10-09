import Link from "next/link";
import type { ReactNode } from "react";
import { enlaceCanal } from "@/lib/etiquetas";
import type { SnapshotPublico } from "@/lib/snapshot/esquema";
import { MenuMovil, type Enlace } from "./menu-movil";

export interface LegalesPublicados {
  privacidad: boolean;
  avisoLegal: boolean;
}

const TEXTO_PROPONER = "Proponer colaboración";

/** Enlaces del menú: solo a los bloques que existen en la versión publicada (D3). */
function enlacesMenu(snapshot: SnapshotPublico | null, base: string): Enlace[] {
  const enlaces: Enlace[] = [];
  if (snapshot?.familia) enlaces.push({ href: `${base}#familia`, texto: "La familia" });
  if (snapshot?.dia) enlaces.push({ href: `${base}#el-dia`, texto: "El día" });
  enlaces.push({ href: `${base}#colaborar`, texto: "Colaborar" });
  return enlaces;
}

export function Cabecera({ snapshot, enPortada }: { snapshot: SnapshotPublico | null; enPortada: boolean }) {
  const base = enPortada ? "" : "/";
  const enlaces = enlacesMenu(snapshot, base);
  const edicion = snapshot ? (snapshot.sitio.edicion.split(" ")[0] ?? "") : "";
  return (
    <header className="site-header">
      <div className="wrap header-inner">
        <a
          className="brand"
          href={`${base}#inicio`}
          aria-label={snapshot ? `${snapshot.sitio.nombre}, ${snapshot.sitio.edicion}: volver al inicio` : "Volver al inicio"}
        >
          {snapshot?.sitio.nombre ?? "Trofeo Escudero"} {edicion && <span>{edicion}</span>}
        </a>
        <nav className="nav-desktop" aria-label="Principal">
          <ul>
            {enlaces.map((enlace) => (
              <li key={enlace.href}>
                <a href={enlace.href}>{enlace.texto}</a>
              </li>
            ))}
          </ul>
        </nav>
        <Link className="btn btn-laton btn-sm nav-cta" href="/proponer">
          {TEXTO_PROPONER}
        </Link>
        <MenuMovil enlaces={enlaces} />
      </div>
    </header>
  );
}

export function Pie({ snapshot, legales }: { snapshot: SnapshotPublico | null; legales: LegalesPublicados }) {
  const canales = snapshot?.contacto.filter((canal) => canal.enPie) ?? [];
  const sitio = snapshot?.sitio;
  return (
    <footer className="site-footer">
      <div className="wrap footer-inner">
        <p>{sitio ? `${sitio.nombre} · ${sitio.edicion} · ${sitio.localidad}` : "Trofeo Escudero"}</p>
        <ul aria-label="Enlaces del pie">
          {canales.map((canal) => {
            const href = enlaceCanal(canal);
            return (
              <li key={`${canal.tipo}-${canal.valor}`}>
                {href ? <a href={href}>{canal.etiqueta}</a> : <span>{canal.etiqueta}</span>}
              </li>
            );
          })}
          {legales.privacidad && (
            <li>
              <Link href="/privacidad">Privacidad</Link>
            </li>
          )}
          {legales.avisoLegal && (
            <li>
              <Link href="/aviso-legal">Aviso legal</Link>
            </li>
          )}
        </ul>
      </div>
    </footer>
  );
}

/** La única acción fija en móvil (D3). */
export function AccionMovil() {
  return (
    <div className="mobile-action">
      <Link className="btn btn-laton btn-block" href="/proponer">
        {TEXTO_PROPONER}
      </Link>
    </div>
  );
}

/** Cabecera + contenido + pie + acción fija. `accionMovil` se desactiva en /proponer (ya estás en ella). */
export function MarcoPublico({
  snapshot,
  legales,
  enPortada = false,
  accionMovil = true,
  children,
}: {
  snapshot: SnapshotPublico | null;
  legales: LegalesPublicados;
  enPortada?: boolean;
  accionMovil?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <Cabecera snapshot={snapshot} enPortada={enPortada} />
      {children}
      <Pie snapshot={snapshot} legales={legales} />
      {accionMovil && <AccionMovil />}
    </>
  );
}
