import Link from "next/link";
import type { CSSProperties } from "react";
import { enlaceCanal } from "@/lib/etiquetas";
import type { SnapshotPublico } from "@/lib/snapshot/esquema";
import { Colaborar } from "./colaborar";
import { Foto, ImagenResponsiva } from "./imagen";
import { ArteHero } from "./ilustraciones";
import { IndiceBloque } from "./indice-bloque";
import type { Ilustracion } from "./ilustraciones";

function Titular({ linea1, linea2 }: { linea1: string; linea2: string | null }) {
  return (
    <>
      {linea1} {linea2 && <em>{linea2}</em>}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1 · Hero y franja de cifras
// ─────────────────────────────────────────────────────────────────────────────

export function Hero({ snapshot }: { snapshot: SnapshotPublico }) {
  const { hero, colaborar } = snapshot;
  return (
    <section className="hero" id="inicio" aria-labelledby="hero-title">
      {hero.imagen ? (
        <div className="hero-foto">
          <ImagenResponsiva imagen={hero.imagen} sizes="100vw" prioritaria />
        </div>
      ) : (
        <ArteHero />
      )}
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <p className="eyebrow">{hero.antetitulo}</p>
          <h1 className="display" id="hero-title">
            <span>{hero.tituloLinea1}</span> {hero.tituloLinea2 && <span className="h1-b">{hero.tituloLinea2}</span>}
          </h1>
          <p className="lead">{hero.entradilla}</p>
          <div className="actions">
            <a className="btn btn-laton" href="#colaborar">
              {hero.ctaPrincipal}
            </a>
            <Link className="btn btn-ghost-light" href="/proponer">
              {hero.ctaSecundario}
            </Link>
          </div>
        </div>

        <aside className="brand-card" aria-labelledby="brand-card-title">
          <p className="label">Para marcas</p>
          <h2 className="display" id="brand-card-title">
            {hero.tarjetaMarcas.titulo}
          </h2>
          <p>{hero.tarjetaMarcas.texto}</p>
          {colaborar.vias.length > 0 && (
            <ol className="via-index" aria-label="Vías de colaboración">
              {colaborar.vias.map((via) => (
                <li key={via.clave}>
                  <a href={`#via-${via.clave.toLowerCase()}`}>
                    <span className="n">{String(via.numero).padStart(2, "0")}</span>
                    {via.titulo}
                    <span className="arrow" aria-hidden="true">
                      →
                    </span>
                  </a>
                </li>
              ))}
            </ol>
          )}
          <a className="text-link" href="#colaborar">
            {hero.tarjetaMarcas.enlace}
          </a>
        </aside>
      </div>
    </section>
  );
}

export function Cifras({ cifras }: { cifras: SnapshotPublico["hero"]["cifras"] }) {
  if (cifras.length === 0) return null;
  return (
    <section className="figures" aria-labelledby="figures-title">
      <div className="wrap">
        <h2 className="visually-hidden" id="figures-title">
          El Trofeo en cifras
        </h2>
        <dl className="scorecard" style={{ "--celdas": cifras.length } as CSSProperties}>
          {cifras.map((cifra) => {
            const palabra = !/^[~≈]?\d/.test(cifra.valor);
            const aproximada = /^[~≈]\s*\d/.test(cifra.valor);
            return (
              <div className="cell" key={cifra.etiqueta}>
                <dt className="label">{cifra.etiqueta}</dt>
                <dd>
                  <span
                    className={`num big${palabra ? " big--word" : ""}`}
                    aria-label={aproximada ? `unos ${cifra.valor.replace(/^[~≈]\s*/, "")}` : undefined}
                  >
                    {cifra.valor}
                  </span>
                  {cifra.pie && <span className="cap">{cifra.pie}</span>}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2 · Familia (editorial y fotográfica, sin tarjeta de resultados)
// ─────────────────────────────────────────────────────────────────────────────

const DIBUJOS_MIEMBRO: readonly Ilustracion[] = ["salida", "green"];

export function Familia({ familia }: { familia: NonNullable<SnapshotPublico["familia"]> }) {
  return (
    <section className="bloque familia" id="familia" aria-labelledby="familia-title">
      <div className="wrap">
        <header className="sec-head">
          <IndiceBloque indice={familia.indice} />
          <h2 className="display" id="familia-title">
            {familia.titulo}
          </h2>
        </header>

        <div className="familia-grid">
          {familia.miembros.map((miembro, indice) => (
            <article className="miembro" key={`${miembro.nombre}-${indice}`} aria-labelledby={`miembro-${indice}`}>
              <figure>
                <Foto
                  imagen={miembro.foto}
                  placeholder={DIBUJOS_MIEMBRO[indice] ?? "green"}
                  sizes="(min-width: 760px) 45vw, 100vw"
                />
                {miembro.pie && <figcaption className="pie-foto">{miembro.pie}</figcaption>}
              </figure>
              <div className="miembro-texto">
                <h3 className="display" id={`miembro-${indice}`}>
                  {miembro.nombre}
                </h3>
                {miembro.edad !== null && <p className="edad">{miembro.edad} años</p>}
                <p>{miembro.texto}</p>
              </div>
            </article>
          ))}

          <div className="generaciones">
            <section className="generacion" aria-labelledby="generacion-segunda">
              <Foto
                imagen={familia.segundaGeneracion.imagen}
                placeholder="cuatro-bolas"
                sizes="(min-width: 760px) 45vw, 100vw"
              />
              <h3 className="label" id="generacion-segunda">
                {familia.segundaGeneracion.etiqueta}
              </h3>
              <p>{familia.segundaGeneracion.texto}</p>
            </section>
            <section className="generacion" aria-labelledby="generacion-tercera">
              <figure>
                <Foto
                  imagen={familia.terceraGeneracion.imagen}
                  placeholder="trayectorias"
                  sizes="(min-width: 760px) 45vw, 100vw"
                />
                {familia.terceraGeneracion.pie && (
                  <figcaption className="pie-foto">{familia.terceraGeneracion.pie}</figcaption>
                )}
              </figure>
              <h3 className="label" id="generacion-tercera">
                {familia.terceraGeneracion.etiqueta}
              </h3>
              <p>{familia.terceraGeneracion.texto}</p>
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3 · El día + 3ª Generación
// ─────────────────────────────────────────────────────────────────────────────

export function Dia({ dia }: { dia: NonNullable<SnapshotPublico["dia"]> }) {
  return (
    <section className="bloque dia" id="el-dia" aria-labelledby="dia-title">
      <div className="wrap">
        <header className="sec-head">
          <IndiceBloque indice={dia.indice} />
          <h2 className="display" id="dia-title">
            {dia.titulo}
          </h2>
          <div className="sec-lead">
            <p>{dia.entradilla}</p>
          </div>
        </header>

        <div className="campos">
          <article className="campo-card campo-card--norte" aria-labelledby="campo-norte">
            <Foto imagen={dia.norte.imagen} placeholder="curvas-norte" sizes="(min-width: 900px) 55vw, 100vw" />
            <p className="label">{dia.norte.etiqueta}</p>
            <h3 className="display" id="campo-norte">
              {dia.norte.titulo}
            </h3>
            <p>{dia.norte.texto}</p>
            {dia.norte.destacado && <p className="destacado">{dia.norte.destacado}</p>}
            {dia.norte.puente && <p className="puente">{dia.norte.puente}</p>}
          </article>
          <article className="campo-card" aria-labelledby="campo-sur">
            {dia.sur.imagen && <Foto imagen={dia.sur.imagen} placeholder="curvas-sur" sizes="(min-width: 900px) 35vw, 100vw" />}
            <p className="label">{dia.sur.etiqueta}</p>
            <h3 className="display" id="campo-sur">
              {dia.sur.titulo}
            </h3>
            <p>{dia.sur.texto}</p>
          </article>
          <article className="campo-card" aria-labelledby="campo-despues">
            {dia.despues.imagen && (
              <Foto imagen={dia.despues.imagen} placeholder="horizonte" sizes="(min-width: 900px) 35vw, 100vw" />
            )}
            <p className="label">{dia.despues.etiqueta}</p>
            <h3 className="display" id="campo-despues">
              {dia.despues.titulo}
            </h3>
            <p>{dia.despues.texto}</p>
          </article>
        </div>

        {dia.recorrido.length > 0 && (
          <section className="recorrido" aria-labelledby="recorrido-title">
            <h3 className="visually-hidden" id="recorrido-title">
              El recorrido del día
            </h3>
            <ol>
              {dia.recorrido.map((paso, indice) => (
                <li key={`${paso.etiqueta}-${indice}`}>
                  <span className="label paso-n" aria-hidden="true">
                    {String(indice + 1).padStart(2, "0")}
                  </span>
                  <span className="paso">{paso.etiqueta}</span>
                  {paso.hora && <span className="hora">{paso.hora}</span>}
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5 · Patrocinadores y colaboradores anteriores + dalecandELA + contacto y cierre
// ─────────────────────────────────────────────────────────────────────────────

export function Cierre({ cierre, contacto }: { cierre: NonNullable<SnapshotPublico["cierre"]>; contacto: SnapshotPublico["contacto"] }) {
  const canales = contacto.filter((canal) => canal.enCierre);
  return (
    <section className="bloque cierre" id="cierre" aria-labelledby="cierre-title">
      <div className="wrap">
        <div className="historial">
          <header className="sec-head">
            <IndiceBloque indice={cierre.indice} />
            <h2 className="display" id="cierre-title">
              {cierre.historial.titulo}
            </h2>
          </header>
          <p>{cierre.historial.texto}</p>
          {cierre.historial.marcas.length > 0 && (
            <>
              <h3 className="label muro-titulo" id="muro-title">
                {cierre.historial.etiquetaMuro}
              </h3>
              <ul className="muro" aria-labelledby="muro-title">
                {cierre.historial.marcas.map((marca) => {
                  const contenido = marca.logo ? (
                    <ImagenResponsiva imagen={marca.logo} sizes="11rem" alt={marca.nombre} />
                  ) : (
                    marca.nombre
                  );
                  return (
                    <li key={marca.slug}>
                      {marca.url ? (
                        <a href={marca.url} rel="noopener noreferrer">
                          {contenido}
                        </a>
                      ) : (
                        contenido
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        {cierre.solidaria && (
          <aside className="solidaria" aria-labelledby="solidaria-title">
            <h3 className="display" id="solidaria-title">
              {cierre.solidaria.titulo}
            </h3>
            <p>{cierre.solidaria.texto}</p>
          </aside>
        )}

        {cierre.imagen && (
          <Foto imagen={cierre.imagen} placeholder="horizonte" sizes="(min-width: 1240px) 1240px, 100vw" className="foto-cierre" />
        )}

        <div className="final">
          <h2 className="display">
            <Titular linea1={cierre.tituloLinea1} linea2={cierre.tituloLinea2} />
          </h2>
          <p>{cierre.texto}</p>
          {cierre.microcopy && <p className="micro">{cierre.microcopy}</p>}
          <div className="actions">
            <Link className="btn btn-laton" href="/proponer">
              {cierre.cta}
            </Link>
          </div>
          {canales.length > 0 && (
            <ul className="canales" aria-label="Otros canales de contacto">
              {canales.map((canal) => {
                const href = enlaceCanal(canal);
                return (
                  <li key={`${canal.tipo}-${canal.valor}`}>
                    {href ? (
                      <a href={href} rel={href.startsWith("http") ? "noopener noreferrer" : undefined}>
                        {canal.etiqueta}
                      </a>
                    ) : (
                      <span>
                        {canal.etiqueta}: {canal.valor}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

/** Los cinco bloques principales, en orden. Se usa en la portada y en la vista previa del panel. */
export function Landing({ snapshot }: { snapshot: SnapshotPublico }) {
  return (
    <>
      <Hero snapshot={snapshot} />
      <Cifras cifras={snapshot.hero.cifras} />
      {snapshot.familia && <Familia familia={snapshot.familia} />}
      {snapshot.dia && <Dia dia={snapshot.dia} />}
      <Colaborar colaborar={snapshot.colaborar} />
      {snapshot.cierre && <Cierre cierre={snapshot.cierre} contacto={snapshot.contacto} />}
    </>
  );
}
