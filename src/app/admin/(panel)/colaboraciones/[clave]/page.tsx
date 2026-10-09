import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormularioEntidad } from "@/components/panel/formulario-entidad";
import { ListaElementos } from "@/components/panel/lista-elementos";
import { Chip, PaginaPanel, Seccion } from "@/components/panel/pagina";
import { NOMBRE_DISPONIBILIDAD, NOMBRE_ELEMENTO_VIA, viaDesdeParametro } from "@/lib/etiquetas";
import { valoresDe } from "@/lib/panel/campos";
import { requerirAdmin } from "@/server/auth/guardas";
import { obtenerPrisma } from "@/server/db";
import { REGISTRO } from "@/server/panel/registro";

export const metadata: Metadata = { title: "Detalle de una vía" };

const APARTADOS = ["NECESITAMOS", "PUEDES_APORTAR", "RECIBES", "CONDICION", "EJEMPLO"] as const;

export default function PaginaVia({ params }: PageProps<"/admin/colaboraciones/[clave]">) {
  return (
    <PaginaPanel titulo="Detalle de una vía" migas={[{ href: "/admin/colaboraciones", texto: "Vías y hoyos" }]}>
      <Contenido params={params} />
    </PaginaPanel>
  );
}

async function Contenido({ params }: { params: PageProps<"/admin/colaboraciones/[clave]">["params"] }) {
  await requerirAdmin({ exigirTotp: true });
  const clave = viaDesdeParametro((await params).clave);
  if (!clave) notFound();
  const via = await obtenerPrisma().collaborationRoute.findUnique({
    where: { key: clave },
    include: {
      items: { orderBy: [{ kind: "asc" }, { sortOrder: "asc" }] },
      opportunities: { orderBy: { sortOrder: "asc" }, include: { hole: { select: { number: true } } } },
    },
  });
  if (!via) notFound();

  return (
    <>
      <Seccion titulo={`${String(via.number).padStart(2, "0")} · ${via.title}`} id="via">
        <FormularioEntidad
          entidad="via"
          id={via.id}
          version={via.version}
          campos={REGISTRO.via.campos}
          valores={valoresDe(via, REGISTRO.via.campos)}
        />
      </Seccion>

      {APARTADOS.map((apartado) => {
        const textos = via.items.filter((item) => item.kind === apartado);
        return (
          <Seccion key={apartado} titulo={NOMBRE_ELEMENTO_VIA[apartado]} id={`apartado-${apartado.toLowerCase()}`}>
            <ListaElementos
              entidad="elemento"
              padre={via.id}
              campos={REGISTRO.elemento.campos}
              camposCreacion={REGISTRO.elemento.camposCreacion}
              valoresCreacion={{ kind: apartado }}
              tituloAnadir={`Añadir a «${NOMBRE_ELEMENTO_VIA[apartado]}»`}
              elementos={textos.map((item) => ({
                id: item.id,
                version: item.version,
                resumen: item.text.length > 90 ? `${item.text.slice(0, 90)}…` : item.text,
                valores: valoresDe(item, REGISTRO.elemento.campos),
              }))}
            />
          </Seccion>
        );
      })}

      <Seccion titulo="Oportunidades" id="oportunidades">
        <p className="ayuda">
          El estado comercial (Disponible, Reservado, Cerrado) y las notas son internos. El estado solo aparece en la web si
          activas «Publicar el estado comercial» en esa oportunidad.
        </p>
        <ListaElementos
          entidad="oportunidad"
          padre={via.id}
          campos={REGISTRO.oportunidad.campos}
          valoresCreacion={{ isVisible: true, availability: "DISPONIBLE" }}
          tituloAnadir="Añadir una oportunidad"
          elementos={via.opportunities.map((oportunidad) => ({
            id: oportunidad.id,
            version: oportunidad.version,
            resumen: oportunidad.hole ? `${oportunidad.name}` : oportunidad.name,
            detalle: (
              <span className="cms-en-linea">
                <Chip tono={oportunidad.availability === "DISPONIBLE" ? "ok" : "aviso"}>
                  {NOMBRE_DISPONIBILIDAD[oportunidad.availability]}
                </Chip>
                {oportunidad.showStatusPublicly && <Chip tono="nuevo">Estado publicado</Chip>}
                {!oportunidad.isVisible && <Chip tono="aviso">Oculta</Chip>}
              </span>
            ),
            valores: valoresDe(oportunidad, REGISTRO.oportunidad.campos),
          }))}
        />
      </Seccion>
    </>
  );
}
