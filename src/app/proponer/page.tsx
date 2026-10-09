import type { Metadata } from "next";
import Link from "next/link";
import { FormularioPropuesta } from "@/components/publico/formulario-propuesta";
import { MarcoPublico } from "@/components/publico/marco";
import { enlaceCanal } from "@/lib/etiquetas";
import { TEXTOS_ESTADO } from "@/lib/proponer";
import { leerLegales, leerVersionPublicada, legalesPublicados } from "@/server/snapshot-publico";

export const metadata: Metadata = {
  title: "Proponer una colaboración",
  description:
    "Producto, premios, hoyos o experiencias: cuéntanos dónde encaja tu marca en la XV edición del Trofeo Escudero.",
  alternates: { canonical: "/proponer" },
};

export default async function PaginaProponer() {
  const [version, legales] = await Promise.all([leerVersionPublicada(), leerLegales()]);
  const snapshot = version?.snapshot ?? null;
  const vias = snapshot?.colaborar.vias ?? [];
  const canales = snapshot?.contacto.filter((canal) => canal.enCierre || canal.enPie) ?? [];
  const turnstileClave = process.env.TURNSTILE_SECRET_KEY ? (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null) : null;

  return (
    <MarcoPublico snapshot={snapshot} legales={legalesPublicados(legales)} accionMovil={false}>
      <main id="main" tabIndex={-1} className="pagina">
        <div className="wrap">
          <header className="pagina-head">
            <h1 className="display">Cuéntanos la idea.</h1>
            <p className="lead">No hace falta una presentación de 40 páginas.</p>
          </header>

          <div className="proponer-grid">
            {legales.privacidad ? (
              <FormularioPropuesta
                versionLegalId={legales.privacidad.id}
                vias={vias.map((via) => ({ clave: via.clave, titulo: via.titulo }))}
                turnstileClave={turnstileClave}
              />
            ) : (
              <div className="form">
                <p className="aviso">{TEXTOS_ESTADO.cerrado}</p>
                {canales.length > 0 && (
                  <ul className="canales" aria-label="Canales de contacto">
                    {canales.map((canal) => {
                      const href = enlaceCanal(canal);
                      return (
                        <li key={`${canal.tipo}-${canal.valor}`}>
                          {href ? <a href={href}>{canal.etiqueta}</a> : `${canal.etiqueta}: ${canal.valor}`}
                        </li>
                      );
                    })}
                  </ul>
                )}
                <p>
                  <Link className="text-link" href="/#colaborar">
                    Ver dónde puede entrar tu marca
                  </Link>
                </p>
              </div>
            )}

            {vias.length > 0 && (
              <aside className="lateral" aria-labelledby="lateral-titulo">
                <h2 className="display" id="lateral-titulo">
                  Dónde puede entrar tu marca
                </h2>
                <ul>
                  {vias.map((via) => (
                    <li key={via.clave}>
                      <a href={`/#via-${via.clave.toLowerCase()}`}>
                        <strong>{via.titulo}</strong>
                      </a>{" "}
                      · {via.subtitulo}
                    </li>
                  ))}
                </ul>
                {snapshot && <p>{snapshot.colaborar.notaTransparencia}</p>}
              </aside>
            )}
          </div>
        </div>
      </main>
    </MarcoPublico>
  );
}
