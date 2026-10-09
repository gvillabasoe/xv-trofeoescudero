import Link from "next/link";
import type { SnapshotPublico } from "@/lib/snapshot/esquema";
import { leerVersionPublicada } from "@/server/snapshot-publico";

// Portada provisional de la Fase 3: comprueba que la web lee la versión publicada (el snapshot), y nada más.
// La maquetación definitiva de los cinco bloques llega en la Fase 4.

const NOMBRE_ELEMENTO: Record<string, string> = {
  NECESITAMOS: "Qué necesitamos",
  PUEDES_APORTAR: "Qué puedes aportar",
  RECIBES: "Qué recibes",
  CONDICION: "Condiciones",
  EJEMPLO: "Ejemplos",
};

const NOMBRE_CONCURSO: Record<string, string> = {
  BOLA_MAS_CERCANA: "Bola más cercana",
  DRIVE_MAS_LARGO: "Drive más largo",
};

export default async function PortadaProvisional() {
  const version = await leerVersionPublicada();

  if (!version) {
    return (
      <main id="main" tabIndex={-1} className="contenedor comprobacion">
        <p className="etiqueta">Portada provisional</p>
        <h1 className="titular">
          Todavía no hay <em>ninguna versión publicada.</em>
        </h1>
        <p className="entradilla">
          Este build no tiene base de datos (CI o local). En Vercel, el seed publica la versión nº 1
          durante el build.
        </p>
        <p className="nota">
          <Link href="/estado">Ver el estado técnico</Link>
        </p>
      </main>
    );
  }

  const { snapshot } = version;

  return (
    <main id="main" tabIndex={-1} className="portada">
      <p className="contenedor aviso-provisional">
        Portada provisional · versión publicada nº {version.numero}. Solo comprueba que la web lee el
        contenido publicado; el diseño llega en la Fase 4. <Link href="/estado">Estado técnico</Link>
      </p>
      <Hero hero={snapshot.hero} />
      {snapshot.familia && <Familia familia={snapshot.familia} />}
      {snapshot.dia && <Dia dia={snapshot.dia} />}
      <Colaborar colaborar={snapshot.colaborar} />
      {snapshot.cierre && <Cierre cierre={snapshot.cierre} />}
    </main>
  );
}

function Hero({ hero }: { hero: SnapshotPublico["hero"] }) {
  return (
    <section className="bloque" aria-labelledby="titulo-inicio" id="inicio">
      <div className="contenedor bloque__interior">
        <p className="etiqueta">{hero.antetitulo}</p>
        <h1 className="titular" id="titulo-inicio">
          {hero.tituloLinea1} {hero.tituloLinea2 && <em>{hero.tituloLinea2}</em>}
        </h1>
        <p className="entradilla">{hero.entradilla}</p>
        <p>
          {hero.ctaPrincipal} · {hero.ctaSecundario}
        </p>
        <div className="via">
          <h2 className="via__titulo">{hero.tarjetaMarcas.titulo}</h2>
          <p>{hero.tarjetaMarcas.texto}</p>
          <p>{hero.tarjetaMarcas.enlace}</p>
        </div>
        {hero.cifras.length > 0 && (
          <dl className="cifras">
            {hero.cifras.map((cifra) => (
              <div key={cifra.etiqueta}>
                <dt>{cifra.etiqueta}</dt>
                <dd>
                  {cifra.valor}
                  {cifra.pie && <span>{cifra.pie}</span>}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}

function Familia({ familia }: { familia: NonNullable<SnapshotPublico["familia"]> }) {
  return (
    <section className="bloque" aria-labelledby="titulo-familia" id="familia">
      <div className="contenedor bloque__interior">
        <p className="etiqueta">{familia.indice}</p>
        <h2 id="titulo-familia">{familia.titulo}</h2>
        {familia.miembros.map((miembro) => (
          <div key={miembro.nombre}>
            <p>{miembro.texto}</p>
            {miembro.pie && <p className="pie">{miembro.pie}</p>}
          </div>
        ))}
        <h3>{familia.segundaGeneracion.etiqueta}</h3>
        <p>{familia.segundaGeneracion.texto}</p>
        <h3>{familia.terceraGeneracion.etiqueta}</h3>
        <p>{familia.terceraGeneracion.texto}</p>
        {familia.terceraGeneracion.pie && <p className="pie">{familia.terceraGeneracion.pie}</p>}
      </div>
    </section>
  );
}

function Dia({ dia }: { dia: NonNullable<SnapshotPublico["dia"]> }) {
  return (
    <section className="bloque" aria-labelledby="titulo-dia" id="el-dia">
      <div className="contenedor bloque__interior">
        <p className="etiqueta">{dia.indice}</p>
        <h2 id="titulo-dia">{dia.titulo}</h2>
        <p className="entradilla">{dia.entradilla}</p>
        <div className="vias">
          <div className="via">
            <p className="etiqueta">{dia.norte.etiqueta}</p>
            <h3>{dia.norte.titulo}</h3>
            <p>{dia.norte.texto}</p>
            {dia.norte.destacado && (
              <p>
                <strong>{dia.norte.destacado}</strong>
              </p>
            )}
            {dia.norte.puente && <p>{dia.norte.puente}</p>}
          </div>
          <div className="via">
            <p className="etiqueta">{dia.sur.etiqueta}</p>
            <h3>{dia.sur.titulo}</h3>
            <p>{dia.sur.texto}</p>
          </div>
          <div className="via">
            <p className="etiqueta">{dia.despues.etiqueta}</p>
            <h3>{dia.despues.titulo}</h3>
            <p>{dia.despues.texto}</p>
          </div>
        </div>
        {dia.recorrido.length > 0 && (
          <ol className="recorrido">
            {dia.recorrido.map((paso) => (
              <li key={paso.etiqueta}>
                {paso.etiqueta}
                {paso.hora && ` · ${paso.hora}`}
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

function Colaborar({ colaborar }: { colaborar: SnapshotPublico["colaborar"] }) {
  return (
    <section className="bloque bloque--marfil" aria-labelledby="titulo-colaborar" id="colaborar">
      <div className="contenedor bloque__interior">
        <p className="etiqueta">{colaborar.indice}</p>
        <h2 id="titulo-colaborar">
          {colaborar.tituloLinea1} {colaborar.tituloLinea2}
        </h2>
        <p className="entradilla">{colaborar.entradilla}</p>
        {colaborar.remate && <p>{colaborar.remate}</p>}

        <div className="vias">
          {colaborar.vias.map((via) => (
            <details className="via" key={via.clave}>
              <summary>
                <span className="etiqueta">{String(via.numero).padStart(2, "0")}</span>{" "}
                <span className="via__titulo">{via.titulo}</span> · {via.subtitulo}
              </summary>
              <p>{via.texto}</p>
              {Object.entries(NOMBRE_ELEMENTO).map(([tipo, nombre]) => {
                const elementos = via.elementos.filter((elemento) => elemento.tipo === tipo);
                return elementos.length > 0 ? (
                  <div key={tipo}>
                    <h3>{nombre}</h3>
                    <ul className="lista">
                      {elementos.map((elemento) => (
                        <li key={elemento.texto}>{elemento.texto}</li>
                      ))}
                    </ul>
                  </div>
                ) : null;
              })}
              <p>
                <strong>{via.cta}</strong>
              </p>
            </details>
          ))}
        </div>

        <p className="etiqueta">{colaborar.concursos.etiqueta}</p>
        <h3>{colaborar.concursos.titulo}</h3>
        <p>{colaborar.concursos.entradilla}</p>
        <ul className="lista">
          {colaborar.concursos.hoyos.map((hoyo) => (
            <li key={hoyo.numero}>
              Hoyo {hoyo.numero} · {NOMBRE_CONCURSO[hoyo.concurso]}
              {hoyo.par && ` · Par ${hoyo.par}`}
            </li>
          ))}
        </ul>
        {colaborar.concursos.modelos && <p>{colaborar.concursos.modelos}</p>}
        {colaborar.concursos.denominacion && <p>{colaborar.concursos.denominacion}</p>}
        <p>
          <strong>{colaborar.concursos.cta}</strong>
        </p>

        <h3>{colaborar.dieciochoHoyos.titulo}</h3>
        <p>{colaborar.dieciochoHoyos.texto}</p>
        <p className="nota">{colaborar.notaTransparencia}</p>
      </div>
    </section>
  );
}

function Cierre({ cierre }: { cierre: NonNullable<SnapshotPublico["cierre"]> }) {
  return (
    <section className="bloque" aria-labelledby="titulo-cierre" id="cierre">
      <div className="contenedor bloque__interior">
        <p className="etiqueta">{cierre.indice}</p>
        <h2 id="titulo-cierre">{cierre.historial.titulo}</h2>
        <p>{cierre.historial.texto}</p>
        {cierre.historial.marcas.length > 0 && (
          <>
            <h3>{cierre.historial.etiquetaMuro}</h3>
            <ul className="muro">
              {cierre.historial.marcas.map((marca) => (
                <li key={marca.slug}>{marca.nombre}</li>
              ))}
            </ul>
          </>
        )}
        {cierre.solidaria && (
          <div className="via">
            <h3>{cierre.solidaria.titulo}</h3>
            <p>{cierre.solidaria.texto}</p>
          </div>
        )}
        <h3>
          {cierre.tituloLinea1} {cierre.tituloLinea2}
        </h3>
        <p>{cierre.texto}</p>
        {cierre.microcopy && <p className="pie">{cierre.microcopy}</p>}
        <p>
          <strong>{cierre.cta}</strong>
        </p>
      </div>
    </section>
  );
}
