import type { ReactNode } from "react";
import type { Campo, Opcion, ValorCampo } from "@/lib/panel/campos";
import { AccionesElemento, FormularioEntidad } from "./formulario-entidad";

export interface ElementoLista {
  id: string;
  version: number;
  resumen: string;
  detalle?: ReactNode;
  valores: Record<string, ValorCampo>;
}

/** Lista ordenada editable: cada elemento se despliega para editarlo, subirlo, bajarlo o borrarlo. */
export function ListaElementos({
  entidad,
  elementos,
  campos,
  camposCreacion,
  padre,
  opcionesDinamicas,
  borrable = true,
  ordenable = true,
  textoAnadir = "Añadir",
  tituloAnadir = "Añadir uno nuevo",
  creable = true,
  valoresCreacion = { isVisible: true },
}: {
  entidad: string;
  elementos: ElementoLista[];
  campos: Campo[];
  camposCreacion?: Campo[];
  padre?: string;
  opcionesDinamicas?: Record<string, Opcion[]>;
  borrable?: boolean;
  ordenable?: boolean;
  textoAnadir?: string;
  tituloAnadir?: string;
  creable?: boolean;
  valoresCreacion?: Record<string, ValorCampo>;
}) {
  return (
    <div className="cms-elementos">
      {elementos.length === 0 && <p className="ayuda">Todavía no hay ninguno.</p>}
      {elementos.map((elemento) => (
        <details className="cms-elemento" key={elemento.id}>
          <summary>
            {elemento.resumen}
            {elemento.detalle}
          </summary>
          <div className="cms-elemento__cuerpo">
            <FormularioEntidad
              entidad={entidad}
              id={elemento.id}
              version={elemento.version}
              campos={campos}
              valores={elemento.valores}
              opcionesDinamicas={opcionesDinamicas}
            />
            {(borrable || ordenable) && (
              <AccionesElemento
                entidad={entidad}
                id={elemento.id}
                version={elemento.version}
                mover={ordenable}
                borrar={borrable}
                nombre={elemento.resumen}
              />
            )}
          </div>
        </details>
      ))}
      {creable && (
        <details className="cms-elemento">
          <summary>+ {tituloAnadir}</summary>
          <div className="cms-elemento__cuerpo">
            <FormularioEntidad
              modo="crear"
              entidad={entidad}
              padre={padre}
              campos={camposCreacion ?? campos}
              valores={valoresCreacion}
              boton={textoAnadir}
              opcionesDinamicas={opcionesDinamicas}
            />
          </div>
        </details>
      )}
    </div>
  );
}
