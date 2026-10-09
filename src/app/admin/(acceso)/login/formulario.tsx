"use client";

import { useActionState } from "react";
import { accionIniciarSesion, accionSegundoFactor, type EstadoAcceso } from "./acciones";

const INICIO: EstadoAcceso = { paso: "credenciales" };
const RETO: EstadoAcceso = { paso: "segundo-factor" };

export function FormularioAcceso() {
  const [credenciales, enviarCredenciales, enviandoCredenciales] = useActionState(accionIniciarSesion, INICIO);
  const [codigo, enviarCodigo, enviandoCodigo] = useActionState(accionSegundoFactor, RETO);

  if (credenciales.paso === "segundo-factor") {
    return (
      <form action={enviarCodigo} className="formulario">
        <p>Escribe el código de 6 cifras de tu app de autenticación.</p>
        <fieldset className="campo">
          <legend>Tipo de código</legend>
          <label>
            <input type="radio" name="tipo" value="totp" defaultChecked /> Código de la app
          </label>
          <label>
            <input type="radio" name="tipo" value="recuperacion" /> Código de recuperación
          </label>
        </fieldset>
        <div className="campo">
          <label htmlFor="codigo">Código</label>
          <input id="codigo" name="codigo" required autoComplete="one-time-code" inputMode="text" maxLength={32} />
        </div>
        {codigo.error && (
          <p className="aviso-error" role="alert">
            {codigo.error}
          </p>
        )}
        <button type="submit" className="boton" disabled={enviandoCodigo}>
          {enviandoCodigo ? "Comprobando…" : "Entrar"}
        </button>
      </form>
    );
  }

  return (
    <form action={enviarCredenciales} className="formulario">
      <div className="campo">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="username" />
      </div>
      <div className="campo">
        <label htmlFor="contrasena">Contraseña</label>
        <input id="contrasena" name="contrasena" type="password" required autoComplete="current-password" />
      </div>
      {credenciales.error && (
        <p className="aviso-error" role="alert">
          {credenciales.error}
        </p>
      )}
      <button type="submit" className="boton" disabled={enviandoCredenciales}>
        {enviandoCredenciales ? "Comprobando…" : "Continuar"}
      </button>
    </form>
  );
}
