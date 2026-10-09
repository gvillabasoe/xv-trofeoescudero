"use client";

import { useActionState } from "react";
import {
  accionConfirmarTotp,
  accionIniciarTotp,
  accionRegenerarCodigos,
  type EstadoCodigos,
  type EstadoConfirmacion,
  type EstadoTotp,
} from "./acciones";

const INICIO_TOTP: EstadoTotp = { paso: "inicio" };
const INICIO_CONFIRMACION: EstadoConfirmacion = {};
const INICIO_CODIGOS: EstadoCodigos = {};

function ListaCodigos({ codigos }: { codigos: string[] }) {
  return (
    <div className="codigos">
      <p>
        <strong>Códigos de recuperación.</strong> Guárdalos ahora en tu gestor de contraseñas: no se vuelven a
        mostrar. Cada uno sirve una sola vez si pierdes el móvil.
      </p>
      <ul>
        {codigos.map((codigo) => (
          <li key={codigo}>
            <code>{codigo}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ActivarTotp() {
  const [actual, enviarInicio, enviandoInicio] = useActionState(accionIniciarTotp, INICIO_TOTP);
  const [confirmacion, enviarConfirmacion, enviandoConfirmacion] = useActionState(accionConfirmarTotp, INICIO_CONFIRMACION);

  if (actual.paso === "verificar") {
    return (
      <div className="formulario">
        <p>1. Escanea este código con tu app de autenticación (Google Authenticator, 1Password, Authy…).</p>
        {/* eslint-disable-next-line @next/next/no-img-element -- QR generado en el servidor como data URI */}
        <img src={actual.qrDataUri} alt="Código QR para añadir el Trofeo Escudero a tu app de autenticación" width={220} height={220} />
        <p>
          Si no puedes escanearlo, escribe esta clave en la app: <code>{actual.clave}</code>
        </p>
        <ListaCodigos codigos={actual.codigos} />
        <form action={enviarConfirmacion} className="formulario">
          <div className="campo">
            <label htmlFor="codigo">2. Escribe el código de 6 cifras que muestra la app</label>
            <input id="codigo" name="codigo" required inputMode="numeric" autoComplete="one-time-code" maxLength={8} />
          </div>
          {confirmacion.error && (
            <p className="aviso-error" role="alert">
              {confirmacion.error}
            </p>
          )}
          <button type="submit" className="boton" disabled={enviandoConfirmacion}>
            {enviandoConfirmacion ? "Comprobando…" : "Activar"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <form action={enviarInicio} className="formulario">
      <p>Para entrar en el panel tienes que activar la verificación en dos pasos. Confirma tu contraseña para empezar.</p>
      <div className="campo">
        <label htmlFor="contrasena-totp">Contraseña</label>
        <input id="contrasena-totp" name="contrasena" type="password" required autoComplete="current-password" />
      </div>
      {actual.error && (
        <p className="aviso-error" role="alert">
          {actual.error}
        </p>
      )}
      <button type="submit" className="boton" disabled={enviandoInicio}>
        {enviandoInicio ? "Preparando…" : "Empezar la activación"}
      </button>
    </form>
  );
}

export function RegenerarCodigos() {
  const [estado, enviar, enviando] = useActionState(accionRegenerarCodigos, INICIO_CODIGOS);

  if (estado.codigos) {
    return <ListaCodigos codigos={estado.codigos} />;
  }

  return (
    <form action={enviar} className="formulario">
      <p>Genera códigos de recuperación nuevos. Los anteriores dejan de valer.</p>
      <div className="campo">
        <label htmlFor="contrasena-codigos">Contraseña</label>
        <input id="contrasena-codigos" name="contrasena" type="password" required autoComplete="current-password" />
      </div>
      {estado.error && (
        <p className="aviso-error" role="alert">
          {estado.error}
        </p>
      )}
      <button type="submit" className="boton boton--secundario" disabled={enviando}>
        {enviando ? "Generando…" : "Generar códigos nuevos"}
      </button>
    </form>
  );
}
