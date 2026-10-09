"use client";

import { useActionState } from "react";
import { accionAltaInicial, type EstadoAlta } from "./acciones";

const INICIO: EstadoAlta = {};

export function FormularioAlta() {
  const [estado, enviar, enviando] = useActionState(accionAltaInicial, INICIO);

  return (
    <form action={enviar} className="formulario">
      <div className="campo">
        <label htmlFor="nombre">Nombre</label>
        <input id="nombre" name="nombre" required autoComplete="name" maxLength={80} />
      </div>
      <div className="campo">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="username" />
      </div>
      <div className="campo">
        <label htmlFor="contrasena">Contraseña</label>
        <input id="contrasena" name="contrasena" type="password" required minLength={12} maxLength={128} autoComplete="new-password" />
        <p className="ayuda">Al menos 12 caracteres. Usa el generador de tu gestor de contraseñas.</p>
      </div>
      <div className="campo">
        <label htmlFor="confirmacion">Repite la contraseña</label>
        <input id="confirmacion" name="confirmacion" type="password" required minLength={12} maxLength={128} autoComplete="new-password" />
      </div>
      <div className="campo">
        <label htmlFor="secreto">Secreto de alta</label>
        <input id="secreto" name="secreto" type="password" required autoComplete="off" />
        <p className="ayuda">Es el valor de ADMIN_SETUP_SECRET que guardaste en Vercel. No lo compartas por chat.</p>
      </div>
      {estado.error && (
        <p className="aviso-error" role="alert">
          {estado.error}
        </p>
      )}
      <button type="submit" className="boton" disabled={enviando}>
        {enviando ? "Creando…" : "Crear el administrador"}
      </button>
    </form>
  );
}
