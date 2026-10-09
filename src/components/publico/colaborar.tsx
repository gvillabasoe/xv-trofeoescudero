import Link from "next/link";
import type { CSSProperties } from "react";
import {
  NOMBRE_CAMPO,
  NOMBRE_CONCURSO,
  NOMBRE_DISPONIBILIDAD,
  NOMBRE_ELEMENTO_VIA,
  NOMBRE_TIPO_COLABORACION,
  enlaceProponer,
} from "@/lib/etiquetas";
import type { SnapshotPublico } from "@/lib/snapshot/esquema";
import { DialogoVia } from "./dialogo-via";
import { Foto } from "./imagen";
import { Dibujo, IconoConcurso } from "./ilustraciones";
import { IndiceBloque } from "./indice-bloque";

type Colaboracion = SnapshotPublico["colaborar"];
type Via = Colaboracion["vias"][number];

const ORDEN_ELEMENTOS = ["NECESITAMOS", "PUEDES_APORTAR", "RECIBES", "CONDICION", "EJEMPLO"] as const;

function numero(n: number) {
  return String(n).padStart(2, "0");
}

/** Contenido del detalle de una vía: Qué necesitamos · Qué puedes aportar · Qué recibes · Condiciones · CTA. */
function DetalleVia({ via, id }: { via: Via; id: string }) {
  const conInformacion = via.oportunidades.filter((oportunidad) => oportunidad.estado || oportunidad.descripcion);
  const enlace = enlaceProponer({ tipo: via.tipoFormulario, via: via.clave });
  return (
    <article className="detail">
      <header className="detail-head">
        <p className="via-n label">
          {numero(via.numero)} · {via.titulo}
        </p>
        <h2 className="display" id={`${id}-titulo`}>
          {via.subtitulo}
        </h2>
        <p className="micro">{via.texto}</p>
      </header>

      {via.clave === "PECHO" && !via.imagen ? (
        <figure className="polo">
          <Dibujo tipo="polo" />
          <figcaption>
            Un lado del pecho para el Trofeo y el otro para tu marca. La posición exacta depende del diseño técnico del
            polo. Nada más en el frontal.
          </figcaption>
        </figure>
      ) : (
        via.imagen && <Foto imagen={via.imagen} placeholder="polo" sizes="(min-width: 760px) 40rem, 100vw" />
      )}

      <div className="detail-body">
        {ORDEN_ELEMENTOS.map((tipo) => {
          const elementos = via.elementos.filter((elemento) => elemento.tipo === tipo);
          if (elementos.length === 0) return null;
          const idSeccion = `${id}-${tipo.toLowerCase()}`;
          return (
            <section key={tipo} aria-labelledby={idSeccion}>
              <h3 className="label" id={idSeccion}>
                {NOMBRE_ELEMENTO_VIA[tipo]}
              </h3>
              {elementos.length === 1 ? (
                <p>{elementos[0]?.texto}</p>
              ) : (
                <ul>
                  {elementos.map((elemento, indice) => (
                    <li key={indice}>{elemento.texto}</li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
        {conInformacion.length > 0 && (
          <section aria-labelledby={`${id}-oportunidades`}>
            <h3 className="label" id={`${id}-oportunidades`}>
              Oportunidades
            </h3>
            <ul>
              {conInformacion.map((oportunidad) => (
                <li key={oportunidad.clave}>
                  {oportunidad.nombre}
                  {oportunidad.estado && (
                    <span className="estado-oportunidad">{NOMBRE_DISPONIBILIDAD[oportunidad.estado]}</span>
                  )}
                  {oportunidad.descripcion && <> · {oportunidad.descripcion}</>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <footer className="detail-foot">
        <Link className="btn btn-verde" href={enlace}>
          {via.cta}
        </Link>
        <p className="hint">Se abrirá el formulario con «{NOMBRE_TIPO_COLABORACION[via.tipoFormulario]}» ya elegido.</p>
      </footer>
    </article>
  );
}

export function Colaborar({ colaborar }: { colaborar: Colaboracion }) {
  const { concursos } = colaborar;
  const conConcurso = new Set(concursos.hoyos.map((hoyo) => hoyo.numero));

  return (
    <section className="bloque colaborar" id="colaborar" aria-labelledby="colaborar-title">
      <div className="wrap">
        <header className="sec-head">
          <IndiceBloque indice={colaborar.indice} />
          <h2 className="display" id="colaborar-title">
            {colaborar.tituloLinea1} {colaborar.tituloLinea2 && <em>{colaborar.tituloLinea2}</em>}
          </h2>
          <div className="sec-lead">
            <p>{colaborar.entradilla}</p>
            {colaborar.remate && <p className="remate">{colaborar.remate}</p>}
          </div>
        </header>

        {colaborar.vias.length > 0 && (
          <ol className="vias" aria-label="Vías de colaboración" style={{ "--vias": colaborar.vias.length } as CSSProperties}>
            {colaborar.vias.map((via) => {
              const id = `detalle-${via.clave.toLowerCase()}`;
              return (
                <li className="via" id={`via-${via.clave.toLowerCase()}`} key={via.clave}>
                  <p className="via-n label">{numero(via.numero)}</p>
                  <h3 className="display">{via.titulo}</h3>
                  <p className="via-sub">{via.subtitulo}</p>
                  <p className="via-copy">{via.texto}</p>
                  <div className="via-acciones">
                    <DialogoVia id={id} etiquetaBoton="Ver el detalle" nombreAccesible={`${numero(via.numero)} · ${via.titulo}`}>
                      <DetalleVia via={via} id={id} />
                    </DialogoVia>
                    <Link className="via-cta" href={enlaceProponer({ tipo: via.tipoFormulario, via: via.clave })}>
                      {via.cta} <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {concursos.hoyos.length > 0 && (
          <section className="holes" aria-labelledby="holes-title">
            <div className="holes-head">
              <p className="label">{concursos.etiqueta}</p>
              <h3 className="display" id="holes-title">
                {concursos.titulo}
              </h3>
              <p>{concursos.entradilla}</p>
            </div>
            <ol className="holes-card" aria-label="Hoyos con concurso" style={{ "--hoyos": concursos.hoyos.length } as CSSProperties}>
              {concursos.hoyos.map((hoyo) => (
                <li className="hole" key={hoyo.numero}>
                  <p className="num hole-n">
                    <small>Hoyo</small>
                    {hoyo.numero}
                  </p>
                  <IconoConcurso concurso={hoyo.concurso} />
                  <p className="hole-contest">
                    {NOMBRE_CONCURSO[hoyo.concurso]}
                    <span>
                      {[
                        hoyo.par ? `Par ${hoyo.par}` : hoyo.concurso === "DRIVE_MAS_LARGO" ? "Desde la salida" : null,
                        hoyo.campo ? NOMBRE_CAMPO[hoyo.campo] : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </p>
                </li>
              ))}
            </ol>
            <div className="holes-foot">
              <p>
                {concursos.modelos}
                {concursos.modelos && concursos.denominacion && " "}
                {concursos.denominacion && <>Ejemplos de denominación: {concursos.denominacion}</>}
              </p>
              <Link className="btn btn-verde" href={enlaceProponer({ tipo: "PREMIO_CONCURSO", via: "JUEGO" })}>
                {concursos.cta}
              </Link>
            </div>
          </section>
        )}

        <section className="eighteen" aria-labelledby="eighteen-title">
          <div className="strip" aria-hidden="true">
            {Array.from({ length: 18 }, (_, indice) => indice + 1).map((n) => (
              <span key={n} className={conConcurso.has(n) ? "on" : undefined}>
                {n}
              </span>
            ))}
          </div>
          <h3 className="display" id="eighteen-title">
            {colaborar.dieciochoHoyos.titulo}
          </h3>
          <p>{colaborar.dieciochoHoyos.texto}</p>
        </section>

        <aside className="transparency" aria-label="Nota de transparencia">
          <p>{colaborar.notaTransparencia}</p>
        </aside>
      </div>
    </section>
  );
}
