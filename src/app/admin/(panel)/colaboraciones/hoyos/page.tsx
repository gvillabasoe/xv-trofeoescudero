import type { Metadata } from "next";
import { FormularioEntidad } from "@/components/panel/formulario-entidad";
import { Chip, PaginaPanel, Seccion } from "@/components/panel/pagina";
import { NOMBRE_CONCURSO } from "@/lib/etiquetas";
import { valoresDe } from "@/lib/panel/campos";
import { requerirAdmin } from "@/server/auth/guardas";
import { obtenerPrisma } from "@/server/db";
import { REGISTRO } from "@/server/panel/registro";

export const metadata: Metadata = { title: "Los 18 hoyos" };

export default function PaginaHoyos() {
  return (
    <PaginaPanel
      titulo="Los 18 hoyos"
      descripcion="Concurso, par y campo de cada hoyo. El campo (P8) se queda oculto hasta que lo confirmes y actives su interruptor."
      migas={[{ href: "/admin/colaboraciones", texto: "Vías y hoyos" }]}
    >
      <Contenido />
    </PaginaPanel>
  );
}

async function Contenido() {
  await requerirAdmin({ exigirTotp: true });
  const hoyos = await obtenerPrisma().competitionHole.findMany({ orderBy: { number: "asc" } });
  return (
    <div className="cms-elementos">
      {hoyos.map((hoyo) => (
        <Seccion
          key={hoyo.id}
          id={`hoyo-${hoyo.number}`}
          titulo={`Hoyo ${hoyo.number}`}
          acciones={hoyo.contestType ? <Chip tono="nuevo">{NOMBRE_CONCURSO[hoyo.contestType]}</Chip> : undefined}
        >
          <FormularioEntidad
            entidad="hoyo"
            id={hoyo.id}
            version={hoyo.version}
            campos={REGISTRO.hoyo.campos}
            valores={valoresDe(hoyo, REGISTRO.hoyo.campos)}
            compacto
          />
        </Seccion>
      ))}
    </div>
  );
}
