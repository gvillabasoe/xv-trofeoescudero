"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { valorParaFormulario, type Campo, type Opcion, type ValorCampo } from "@/lib/panel/campos";
import {
  accionBorrarEntidad,
  accionCrearEntidad,
  accionGuardarEntidad,
  accionMoverEntidad,
  type EstadoEdicion,
} from "@/server/panel/acciones";

const INICIAL: EstadoEdicion = {};

/**
 * Formulario genérico del CMS. Al editar, envía la versión que se ve (control optimista).
 * `opcionesDinamicas`: opciones que vienen de la base de datos (p. ej., categorías).
 */
export function FormularioEntidad({
  modo = "editar",
  entidad,
  id,
  padre,
  version,
  campos,
  valores = {},
  boton,
  opcionesDinamicas = {},
  bloqueados = [],
  compacto = false,
}: {
  modo?: "editar" | "crear";
  entidad: string;
  id?: string | number;
  padre?: string;
  version?: number;
  campos: Campo[];
  valores?: Record<string, ValorCampo>;
  boton?: string;
  opcionesDinamicas?: Record<string, Opcion[]>;
  bloqueados?: string[];
  compacto?: boolean;
}) {
  const [estado, enviar, enviando] = useActionState(modo === "crear" ? accionCrearEntidad : accionGuardarEntidad, INICIAL);
  const [, iniciar] = useTransition();
  const formulario = useRef<HTMLFormElement>(null);
  const prefijo = `${entidad}-${id ?? padre ?? "nuevo"}`;

  // Al crear, el formulario se vacía después de un alta correcta.
  useEffect(() => {
    if (modo === "crear" && estado.ok) formulario.current?.reset();
  }, [estado.marca, estado.ok, modo]);

  return (
    <form
      ref={formulario}
      action={enviar}
      // Con JavaScript, se envía sin el reinicio automático del formulario de React: si hay errores,
      // lo escrito se conserva. Sin JavaScript, funciona como un formulario normal.
      onSubmit={(evento) => {
        evento.preventDefault();
        const datos = new FormData(evento.currentTarget);
        iniciar(() => enviar(datos));
      }}
      className={`cms-form${compacto ? " cms-form--compacto" : ""}`}
      noValidate
    >
      <input type="hidden" name="_entidad" value={entidad} />
      {id !== undefined && <input type="hidden" name="_id" value={String(id)} />}
      {padre && <input type="hidden" name="_padre" value={padre} />}
      {version !== undefined && <input type="hidden" name="_version" value={String(version)} />}
      <div className="cms-campos">
        {campos.map((campo) => (
          <CampoCms
            key={campo.nombre}
            campo={{ ...campo, opciones: campo.opciones ?? opcionesDinamicas[campo.nombre] }}
            prefijo={prefijo}
            valor={valores[campo.nombre]}
            error={estado.errores?.[campo.nombre]}
            bloqueado={bloqueados.includes(campo.nombre) || campo.soloLectura === true}
          />
        ))}
      </div>
      <div className="cms-pie">
        <button type="submit" className="boton" disabled={enviando}>
          {enviando ? "Guardando…" : (boton ?? (modo === "crear" ? "Añadir" : "Guardar"))}
        </button>
        <Estado estado={estado} />
      </div>
    </form>
  );
}

export function Estado({ estado }: { estado: EstadoEdicion }) {
  if (!estado.mensaje) return null;
  return (
    <p className={estado.ok ? "cms-ok" : "cms-error"} role={estado.ok ? "status" : "alert"}>
      {estado.mensaje}
    </p>
  );
}

function CampoCms({
  campo,
  prefijo,
  valor,
  error,
  bloqueado,
}: {
  campo: Campo;
  prefijo: string;
  valor: ValorCampo | undefined;
  error?: string;
  bloqueado: boolean;
}) {
  const id = `${prefijo}-${campo.nombre}`;
  const inicial = valorParaFormulario(valor);
  const descripcion = [campo.ayuda ? `${id}-ayuda` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  const comunes = {
    id,
    name: campo.nombre,
    disabled: bloqueado,
    "aria-invalid": Boolean(error),
    "aria-describedby": descripcion,
  };

  if (campo.tipo === "casilla") {
    return (
      <div className={`campo campo--casilla-cms${campo.ancho ? " campo--ancho" : ""}`}>
        <label htmlFor={id} className="campo--casilla">
          <input type="checkbox" value="si" defaultChecked={inicial === true} {...comunes} />
          <span>
            {campo.etiqueta}
            {campo.privado && <span className="etiqueta-privado"> · interno</span>}
          </span>
        </label>
        {/* Una casilla bloqueada no se envía: se conserva su valor actual. */}
        {bloqueado && inicial === true && <input type="hidden" name={campo.nombre} value="si" />}
        <Ayuda id={id} campo={campo} error={error} />
      </div>
    );
  }

  return (
    <div className={`campo${campo.ancho || campo.tipo === "area" ? " campo--ancho" : ""}`}>
      <label htmlFor={id}>
        {campo.etiqueta}
        {campo.opcional && <span className="ayuda"> (opcional)</span>}
        {campo.privado && <span className="etiqueta-privado"> · interno, no se publica</span>}
      </label>
      {campo.tipo === "area" ? (
        <textarea rows={campo.filas ?? 4} defaultValue={String(inicial)} maxLength={campo.max} {...comunes} />
      ) : campo.tipo === "seleccion" ? (
        <select defaultValue={String(inicial)} {...comunes}>
          {(campo.opcional || inicial === "") && <option value="">{campo.opcional ? "—" : "Elige una opción"}</option>}
          {(campo.opciones ?? []).map((opcion) => (
            <option key={opcion.valor} value={opcion.valor}>
              {opcion.etiqueta}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={campo.tipo === "numero" ? "number" : campo.tipo === "fecha" ? "date" : campo.tipo === "url" ? "url" : "text"}
          inputMode={campo.tipo === "numero" ? "numeric" : undefined}
          min={campo.tipo === "numero" ? campo.min : undefined}
          max={campo.tipo === "numero" ? campo.max : undefined}
          maxLength={campo.tipo === "texto" || campo.tipo === "url" ? campo.max : undefined}
          defaultValue={String(inicial)}
          {...comunes}
        />
      )}
      {bloqueado && <input type="hidden" name={campo.nombre} value={String(inicial)} />}
      <Ayuda id={id} campo={campo} error={error} />
    </div>
  );
}

function Ayuda({ id, campo, error }: { id: string; campo: Campo; error?: string }) {
  return (
    <>
      {campo.ayuda && (
        <p className="ayuda" id={`${id}-ayuda`}>
          {campo.ayuda}
        </p>
      )}
      {error && (
        <p className="error-campo" id={`${id}-error`}>
          {error}
        </p>
      )}
    </>
  );
}

/** Subir, bajar y borrar (con confirmación) un elemento de una lista. */
export function AccionesElemento({
  entidad,
  id,
  version,
  mover = true,
  borrar = true,
  nombre,
}: {
  entidad: string;
  id: string;
  version: number;
  mover?: boolean;
  borrar?: boolean;
  nombre: string;
}) {
  const [estadoMover, enviarMover, moviendo] = useActionState(accionMoverEntidad, INICIAL);
  const [estadoBorrar, enviarBorrar, borrando] = useActionState(accionBorrarEntidad, INICIAL);
  return (
    <div className="cms-acciones-elemento">
      {mover && (
        <form action={enviarMover} className="cms-en-linea">
          <input type="hidden" name="_entidad" value={entidad} />
          <input type="hidden" name="_id" value={id} />
          <button type="submit" name="_direccion" value="arriba" className="boton boton--mini" disabled={moviendo}>
            Subir<span className="visually-hidden"> {nombre}</span>
          </button>
          <button type="submit" name="_direccion" value="abajo" className="boton boton--mini" disabled={moviendo}>
            Bajar<span className="visually-hidden"> {nombre}</span>
          </button>
        </form>
      )}
      {borrar && (
        <form action={enviarBorrar} className="cms-en-linea">
          <input type="hidden" name="_entidad" value={entidad} />
          <input type="hidden" name="_id" value={id} />
          <input type="hidden" name="_version" value={String(version)} />
          <label className="campo--casilla">
            <input type="checkbox" name="_confirmar" value="si" required /> Confirmo
          </label>
          <button type="submit" className="boton boton--mini boton--peligro" disabled={borrando}>
            Borrar<span className="visually-hidden"> {nombre}</span>
          </button>
        </form>
      )}
      <Estado estado={estadoMover.ok ? {} : estadoMover} />
      <Estado estado={estadoBorrar.ok ? {} : estadoBorrar} />
    </div>
  );
}
