"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

export interface Enlace {
  href: string;
  texto: string;
}

/**
 * Menú móvil (fase-1 §13.1):
 * 1. se cierra al elegir una opción; 2. con Escape; 3. al pulsar fuera;
 * 4. al abrir, el foco va a la primera opción; al cerrar, vuelve al botón; con el menú abierto el Tab no sale de él;
 * 5. aria-expanded y aria-controls en el botón.
 */
export function MenuMovil({ enlaces }: { enlaces: Enlace[] }) {
  const [abierto, setAbierto] = useState(false);
  const idPanel = useId();
  const contenedor = useRef<HTMLDivElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const cerrar = useCallback((devolverFoco: boolean) => {
    setAbierto(false);
    if (devolverFoco) boton.current?.focus();
  }, []);

  useEffect(() => {
    if (!abierto) return;
    panel.current?.querySelector<HTMLAnchorElement>("a")?.focus();

    const alPulsarFuera = (evento: PointerEvent) => {
      if (contenedor.current && !contenedor.current.contains(evento.target as Node)) cerrar(false);
    };
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        evento.preventDefault();
        cerrar(true);
        return;
      }
      if (evento.key !== "Tab" || !contenedor.current) return;
      // Foco atrapado entre el botón y las opciones del menú.
      const enfocables = [boton.current, ...Array.from(panel.current?.querySelectorAll<HTMLElement>("a") ?? [])].filter(
        (elemento): elemento is HTMLElement => elemento !== null,
      );
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      if (!primero || !ultimo) return;
      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener("pointerdown", alPulsarFuera);
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("pointerdown", alPulsarFuera);
      document.removeEventListener("keydown", alTeclear);
    };
  }, [abierto, cerrar]);

  return (
    <div className="nav-mobile" ref={contenedor}>
      <button
        ref={boton}
        type="button"
        className="nav-mobile-boton"
        aria-expanded={abierto}
        aria-controls={idPanel}
        onClick={() => setAbierto((valor) => !valor)}
      >
        Menú
      </button>
      <div className="nav-mobile-panel" id={idPanel} ref={panel} hidden={!abierto}>
        <nav aria-label="Principal">
          <ul>
            {enlaces.map((enlace) => (
              <li key={enlace.href}>
                <a href={enlace.href} onClick={() => cerrar(false)}>
                  {enlace.texto}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
