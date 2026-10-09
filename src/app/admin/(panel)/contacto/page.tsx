import type { Metadata } from "next";
import { ListaElementos } from "@/components/panel/lista-elementos";
import { Chip, PaginaPanel, Seccion } from "@/components/panel/pagina";
import { NOMBRE_TIPO_CONTACTO } from "@/lib/etiquetas";
import { valoresDe } from "@/lib/panel/campos";
import { requerirAdmin } from "@/server/auth/guardas";
import { obtenerPrisma } from "@/server/db";
import { REGISTRO } from "@/server/panel/registro";

export const metadata: Metadata = { title: "Contacto" };

export default function PaginaContacto() {
  return (
    <PaginaPanel
      titulo="Canales de contacto"
      descripcion="Los canales de la organización (P1). Un canal solo aparece en la web si está activo y lo publicas. Nunca datos de contacto de marcas."
    >
      <Contenido />
    </PaginaPanel>
  );
}

async function Contenido() {
  await requerirAdmin({ exigirTotp: true });
  const canales = await obtenerPrisma().contactChannel.findMany({ orderBy: [{ sortOrder: "asc" }, { label: "asc" }] });
  return (
    <Seccion titulo="Canales" id="canales">
      <ListaElementos
        entidad="canal"
        campos={REGISTRO.canal.campos}
        valoresCreacion={{ type: "EMAIL", isActive: false, showInClosing: true, showInFooter: false }}
        tituloAnadir="Añadir un canal"
        elementos={canales.map((canal) => ({
          id: canal.id,
          version: canal.version,
          resumen: `${NOMBRE_TIPO_CONTACTO[canal.type]} · ${canal.label}`,
          detalle: canal.isActive ? <Chip tono="ok">Activo</Chip> : <Chip tono="aviso">Inactivo</Chip>,
          valores: valoresDe(canal, REGISTRO.canal.campos),
        }))}
      />
    </Seccion>
  );
}
