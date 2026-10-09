"use client";

import { useActionState } from "react";
import { accionReiniciarDemo, type EstadoDemo } from "./acciones";

const INICIO: EstadoDemo = {};

export function ResetDemo() {
  const [estado, enviar, enviando] = useActionState(accionReiniciarDemo, INICIO);

  return (
    <form action={enviar} className="formulario">
      <p>
        Borra y vuelve a crear <strong>solo</strong> las propuestas ficticias (marcadas como sintéticas). No
        toca los textos, las entidades ni la versión publicada.
      </p>
      <label className="campo campo--casilla">
        <input type="checkbox" name="entiendo" value="si" required /> Entiendo que se borran y se recrean las
        propuestas ficticias.
      </label>
      <div className="campo">
        <label htmlFor="confirmacion">Escribe BORRAR DEMO para confirmar</label>
        <input id="confirmacion" name="confirmacion" required autoComplete="off" pattern="BORRAR DEMO" />
      </div>
      {estado.error && (
        <p className="aviso-error" role="alert">
          {estado.error}
        </p>
      )}
      {estado.mensaje && <p role="status">{estado.mensaje}</p>}
      <button type="submit" className="boton boton--secundario" disabled={enviando}>
        {enviando ? "Reiniciando…" : "Reiniciar los datos demo"}
      </button>
    </form>
  );
}
