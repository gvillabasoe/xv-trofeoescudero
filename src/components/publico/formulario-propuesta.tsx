"use client";

import Link from "next/link";
import Script from "next/script";
import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { enviarPropuesta, type EstadoPropuesta } from "@/app/proponer/acciones";
import { NOMBRE_TIPO_COLABORACION, ORDEN_TIPOS_COLABORACION, PARAMETRO_TIPO, PARAMETRO_VIA } from "@/lib/etiquetas";
import {
  CLAVES_UTM,
  LIMITES,
  TEXTOS_ESTADO,
  origenDesdeParametros,
  resumenErrores,
  type CampoPropuesta,
  type OrigenPropuesta,
} from "@/lib/proponer";
import type { ClaveVia } from "@/lib/snapshot/comun";

const INICIAL: EstadoPropuesta = { estado: "inicial" };

/** Hora a la que se cargó el script en el navegador (trampa de tiempo). En el servidor no se usa. */
const INICIO_CARGA = typeof window === "undefined" ? 0 : Date.now();
const sinSuscripcion = () => () => {};

const ETIQUETAS: Readonly<Record<CampoPropuesta, string>> = {
  nombre: "Nombre y apellidos",
  empresa: "Empresa o marca",
  cargo: "Cargo",
  email: "Email",
  telefono: "Teléfono",
  tipo: "¿Dónde encaja tu marca?",
  mensaje: "Tu propuesta",
  privacidad: "Política de privacidad",
};

/**
 * Formulario de /proponer (fase-1 §6).
 * - Sin JavaScript: es un formulario HTML normal; el servidor responde con la misma página y los errores.
 * - Con JavaScript: se envía sin recargar; si falla la red, no se pierde nada de lo escrito.
 * - La preselección (?tipo=, ?via=, ?hoyo=) se aplica en el navegador: la página es estática y está en caché.
 */
export function FormularioPropuesta({
  versionLegalId,
  vias,
  turnstileClave,
}: {
  versionLegalId: string;
  vias: Array<{ clave: ClaveVia; titulo: string }>;
  turnstileClave: string | null;
}) {
  const [estadoServidor, accion] = useActionState(enviarPropuesta, INICIAL);
  const [estadoLocal, setEstadoLocal] = useState<EstadoPropuesta | null>(null);
  const [enviando, iniciar] = useTransition();
  const [sinOrigen, setSinOrigen] = useState(false);
  const formulario = useRef<HTMLFormElement>(null);
  const resumen = useRef<HTMLDivElement>(null);
  const confirmacion = useRef<HTMLHeadingElement>(null);
  const grupoTipo = useRef<HTMLFieldSetElement>(null);

  // Datos del navegador (URL, referencia y hora de carga). En el servidor y al hidratar valen vacío.
  const busqueda = useSyncExternalStore(sinSuscripcion, () => window.location.search, () => "");
  const referencia = useSyncExternalStore(sinSuscripcion, () => document.referrer, () => "");
  const inicio = useSyncExternalStore(sinSuscripcion, () => INICIO_CARGA, () => 0);
  const parametros = useMemo(() => new URLSearchParams(busqueda), [busqueda]);
  const desdeUrl = useMemo(() => origenDesdeParametros(parametros), [parametros]);
  const origen: OrigenPropuesta = sinOrigen ? { tipo: null, via: null, hoyo: null } : desdeUrl;
  const extra = useMemo(() => {
    const datos: Record<string, string> = {};
    if (inicio > 0) datos.inicio = String(inicio);
    if (referencia && !referencia.startsWith(window.location.origin)) datos.referencia = referencia.slice(0, 500);
    for (const clave of CLAVES_UTM) {
      const valor = parametros.get(clave);
      if (valor) datos[clave] = valor.slice(0, 100);
    }
    return datos;
  }, [inicio, referencia, parametros]);

  const estado = estadoLocal ?? estadoServidor;
  const errores = estado.estado === "errores" ? estado.errores : {};
  const valores = estado.estado === "errores" || estado.estado === "error" ? estado.valores : {};
  const versionLegal = (estado.estado === "error" && estado.versionLegalVigente) || versionLegalId;
  const numeroErrores = Object.keys(errores).length;
  const tipoElegido = valores.tipo;

  // Preselección del tipo desde ?tipo= (solo si no viene ya elegido del servidor).
  useEffect(() => {
    if (!desdeUrl.tipo || tipoElegido) return;
    const radio = formulario.current?.querySelector<HTMLInputElement>(`input[name="tipo"][value="${desdeUrl.tipo}"]`);
    if (radio) radio.checked = true;
  }, [desdeUrl.tipo, tipoElegido]);

  useEffect(() => {
    if (estado.estado === "enviada") confirmacion.current?.focus();
    else if (estado.estado === "errores" || estado.estado === "error") resumen.current?.focus();
  }, [estado]);

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    iniciar(async () => {
      try {
        setEstadoLocal(await enviarPropuesta(estado, datos));
      } catch {
        setEstadoLocal({ estado: "error", mensaje: TEXTOS_ESTADO.red, valores: {} });
      }
    });
  }

  if (estado.estado === "enviada") {
    return (
      <section className="confirmacion" role="status" aria-labelledby="confirmacion-titulo">
        <h2 className="display" id="confirmacion-titulo" tabIndex={-1} ref={confirmacion}>
          Ya estás en juego.
        </h2>
        <p>Hemos recibido la propuesta. Te escribiremos al email que nos has dejado.</p>
        <p>
          <Link className="btn btn-verde" href="/">
            Volver al Trofeo
          </Link>
        </p>
      </section>
    );
  }

  const nombreVia = vias.find((via) => via.clave === origen.via)?.titulo;
  const descripcion = (campo: CampoPropuesta, ayuda?: string) =>
    [ayuda ? `ayuda-${campo}` : null, errores[campo] ? `error-${campo}` : null].filter(Boolean).join(" ") || undefined;

  return (
    <form ref={formulario} className="form" action={accion} onSubmit={alEnviar} noValidate>
      {(numeroErrores > 0 || estado.estado === "error") && (
        <div className="resumen-errores" role="alert" tabIndex={-1} ref={resumen}>
          {estado.estado === "error" ? (
            <p>{estado.mensaje}</p>
          ) : (
            <>
              <p>{resumenErrores(numeroErrores)}</p>
              <ul>
                {(Object.keys(errores) as CampoPropuesta[]).map((campo) => (
                  <li key={campo}>
                    <a href={`#campo-${campo}`}>{ETIQUETAS[campo]}</a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {(origen.via || origen.hoyo) && (
        <p className="origen">
          <span>
            Vienes desde:{" "}
            <strong>{[nombreVia, origen.hoyo ? `Hoyo ${origen.hoyo}` : null].filter(Boolean).join(" · ")}</strong>
          </span>
          <button
            type="button"
            onClick={() => {
              setSinOrigen(true);
              grupoTipo.current?.querySelector<HTMLInputElement>("input")?.focus();
            }}
          >
            Cambiar
          </button>
        </p>
      )}

      <div className="form-fila">
        <Campo campo="nombre" etiqueta={ETIQUETAS.nombre} error={errores.nombre}>
          <input
            id="campo-nombre"
            name="nombre"
            autoComplete="name"
            required
            maxLength={LIMITES.nombre}
            defaultValue={valores.nombre}
            aria-invalid={Boolean(errores.nombre)}
            aria-describedby={descripcion("nombre")}
          />
        </Campo>
        <Campo campo="empresa" etiqueta={ETIQUETAS.empresa} error={errores.empresa}>
          <input
            id="campo-empresa"
            name="empresa"
            autoComplete="organization"
            required
            maxLength={LIMITES.empresa}
            defaultValue={valores.empresa}
            aria-invalid={Boolean(errores.empresa)}
            aria-describedby={descripcion("empresa")}
          />
        </Campo>
      </div>

      <div className="form-fila">
        <Campo campo="cargo" etiqueta={ETIQUETAS.cargo} opcional error={errores.cargo}>
          <input
            id="campo-cargo"
            name="cargo"
            autoComplete="organization-title"
            maxLength={LIMITES.cargo}
            defaultValue={valores.cargo}
            aria-invalid={Boolean(errores.cargo)}
            aria-describedby={descripcion("cargo")}
          />
        </Campo>
        <Campo campo="email" etiqueta={ETIQUETAS.email} ayuda="Te responderemos aquí." error={errores.email}>
          <input
            id="campo-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            maxLength={LIMITES.email}
            defaultValue={valores.email}
            aria-invalid={Boolean(errores.email)}
            aria-describedby={descripcion("email", "si")}
          />
        </Campo>
      </div>

      <Campo
        campo="telefono"
        etiqueta={ETIQUETAS.telefono}
        ayuda="Opcional, por si es más rápido hablar."
        error={errores.telefono}
      >
        <input
          id="campo-telefono"
          name="telefono"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={LIMITES.telefono}
          defaultValue={valores.telefono}
          aria-invalid={Boolean(errores.telefono)}
          aria-describedby={descripcion("telefono", "si")}
        />
      </Campo>

      <fieldset
        className="f-campo"
        id="campo-tipo"
        ref={grupoTipo}
        aria-describedby={descripcion("tipo", "si")}
        aria-invalid={Boolean(errores.tipo)}
      >
        <legend>{ETIQUETAS.tipo}</legend>
        <p className="f-ayuda" id="ayuda-tipo">
          Elige la que más se acerque; luego lo hablamos.
        </p>
        <div className="opciones">
          {ORDEN_TIPOS_COLABORACION.map((tipo) => (
            <label className="opcion" key={tipo}>
              <input type="radio" name="tipo" value={tipo} defaultChecked={valores.tipo === tipo} required />
              {NOMBRE_TIPO_COLABORACION[tipo]}
            </label>
          ))}
        </div>
        {errores.tipo && (
          <p className="f-error" id="error-tipo">
            {errores.tipo}
          </p>
        )}
      </fieldset>

      <Campo
        campo="mensaje"
        etiqueta={ETIQUETAS.mensaje}
        ayuda="Qué hace tu marca y qué te gustaría aportar."
        error={errores.mensaje}
      >
        <textarea
          id="campo-mensaje"
          name="mensaje"
          required
          minLength={LIMITES.mensajeMinimo}
          maxLength={LIMITES.mensaje}
          rows={7}
          defaultValue={valores.mensaje}
          aria-invalid={Boolean(errores.mensaje)}
          aria-describedby={descripcion("mensaje", "si")}
        />
      </Campo>

      <div className="f-campo" id="campo-privacidad">
        <label className="casilla">
          <input
            type="checkbox"
            name="privacidad"
            value="si"
            required
            defaultChecked={valores.privacidad === "si"}
            aria-invalid={Boolean(errores.privacidad)}
            aria-describedby={descripcion("privacidad", "si")}
          />
          <span>
            He leído y acepto la{" "}
            <Link href="/privacidad" target="_blank">
              política de privacidad
            </Link>
            .
          </span>
        </label>
        <p className="f-ayuda" id="ayuda-privacidad">
          Usamos tus datos solo para responder a esta propuesta.
        </p>
        {errores.privacidad && (
          <p className="f-error" id="error-privacidad">
            {errores.privacidad}
          </p>
        )}
      </div>

      {/* Campo trampa: invisible para las personas; los robots que lo rellenan quedan fuera. */}
      <div className="trampa" aria-hidden="true">
        <label htmlFor="sitio_web">No rellenes este campo</label>
        <input id="sitio_web" name="sitio_web" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
      <input type="hidden" name="version_legal" value={versionLegal} />
      {origen.tipo && <input type="hidden" name="origen_tipo" value={PARAMETRO_TIPO[origen.tipo]} />}
      {origen.via && <input type="hidden" name="origen_via" value={PARAMETRO_VIA[origen.via]} />}
      {origen.hoyo && <input type="hidden" name="origen_hoyo" value={String(origen.hoyo)} />}
      {Object.entries(extra).map(([nombre, valor]) => (
        <input key={nombre} type="hidden" name={nombre} value={valor} />
      ))}

      {turnstileClave && (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" />
          <div className="cf-turnstile" data-sitekey={turnstileClave} />
        </>
      )}

      <div>
        <button type="submit" className="btn btn-verde" disabled={enviando}>
          {enviando ? "Enviando…" : "Enviar propuesta"}
        </button>
      </div>
    </form>
  );
}

function Campo({
  campo,
  etiqueta,
  opcional = false,
  ayuda,
  error,
  children,
}: {
  campo: CampoPropuesta;
  etiqueta: string;
  opcional?: boolean;
  ayuda?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="f-campo">
      <label htmlFor={`campo-${campo}`}>
        {etiqueta} {opcional && <span className="f-opcional">(opcional)</span>}
      </label>
      {children}
      {ayuda && (
        <p className="f-ayuda" id={`ayuda-${campo}`}>
          {ayuda}
        </p>
      )}
      {error && (
        <p className="f-error" id={`error-${campo}`}>
          {error}
        </p>
      )}
    </div>
  );
}
