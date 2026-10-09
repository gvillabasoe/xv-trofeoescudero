import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FormularioEntidad } from "@/components/panel/formulario-entidad";
import { ListaElementos } from "@/components/panel/lista-elementos";
import { Chip, PaginaPanel, Seccion } from "@/components/panel/pagina";
import { BLOQUES_PANEL } from "@/lib/panel/bloques";
import { valoresDe } from "@/lib/panel/campos";
import { NOMBRE_GENERACION } from "@/lib/panel/opciones";
import { requerirAdmin } from "@/server/auth/guardas";
import { obtenerPrisma } from "@/server/db";
import { REGISTRO } from "@/server/panel/registro";

export const metadata: Metadata = { title: "Editar un bloque" };

const POR_SLUG = Object.fromEntries(Object.values(BLOQUES_PANEL).map((bloque) => [bloque.slug, bloque.nombre]));

export default function PaginaBloque({ params }: PageProps<"/admin/contenido/[bloque]">) {
  return (
    <PaginaPanel titulo="Editar un bloque" migas={[{ href: "/admin/contenido", texto: "Textos de la web" }]}>
      <Contenido params={params} />
    </PaginaPanel>
  );
}

const IMAGENES = (
  <p className="ayuda">
    Las fotos de este bloque se suben y se asignan en <Link href="/admin/imagenes">Imágenes</Link>. Mientras no haya
    una foto autorizada, la web muestra una ilustración.
  </p>
);

async function Contenido({ params }: { params: PageProps<"/admin/contenido/[bloque]">["params"] }) {
  await requerirAdmin({ exigirTotp: true });
  const { bloque } = await params;
  const nombre = POR_SLUG[bloque];
  if (!nombre) notFound();
  const bd = obtenerPrisma();

  if (bloque === "hero") {
    const hero = await bd.heroContent.findFirst({ include: { figures: { orderBy: { sortOrder: "asc" } } } });
    if (!hero) notFound();
    return (
      <>
        <h2 className="visually-hidden">{nombre}</h2>
        <Seccion titulo="Textos del Hero" id="hero">
          <FormularioEntidad entidad="hero" id={hero.id} version={hero.version} campos={REGISTRO.hero.campos} valores={valoresDe(hero, REGISTRO.hero.campos)} />
          {IMAGENES}
        </Seccion>
        <Seccion titulo="Franja de cifras" id="cifras">
          <p className="ayuda">Solo cifras confirmadas y exactas. La fuente es interna y nunca se publica.</p>
          <ListaElementos
            entidad="cifra"
            padre={hero.id}
            campos={REGISTRO.cifra.campos}
            tituloAnadir="Añadir una cifra"
            elementos={hero.figures.map((cifra) => ({
              id: cifra.id,
              version: cifra.version,
              resumen: `${cifra.label}: ${cifra.value}`,
              detalle: cifra.isVisible ? null : <Chip tono="aviso">Oculta</Chip>,
              valores: valoresDe(cifra, REGISTRO.cifra.campos),
            }))}
          />
        </Seccion>
      </>
    );
  }

  if (bloque === "familia") {
    const familia = await bd.familyContent.findFirst({ include: { members: { orderBy: { sortOrder: "asc" } } } });
    if (!familia) notFound();
    return (
      <>
        <Seccion titulo="Textos de La familia" id="familia">
          <FormularioEntidad
            entidad="familia"
            id={familia.id}
            version={familia.version}
            campos={REGISTRO.familia.campos}
            valores={valoresDe(familia, REGISTRO.familia.campos)}
          />
          {IMAGENES}
        </Seccion>
        <Seccion titulo="Personas con texto propio" id="miembros">
          <p className="ayuda">Nunca «fundador». La edad es opcional y manual: si está vacía, no aparece.</p>
          <ListaElementos
            entidad="miembro"
            padre={familia.id}
            campos={REGISTRO.miembro.campos}
            tituloAnadir="Añadir una persona"
            elementos={familia.members.map((miembro) => ({
              id: miembro.id,
              version: miembro.version,
              resumen: `${miembro.name} · ${NOMBRE_GENERACION[miembro.generation]}`,
              detalle: miembro.isVisible ? null : <Chip tono="aviso">Oculta</Chip>,
              valores: valoresDe(miembro, REGISTRO.miembro.campos),
            }))}
          />
        </Seccion>
      </>
    );
  }

  if (bloque === "el-dia") {
    const dia = await bd.dayContent.findFirst({ include: { steps: { orderBy: { sortOrder: "asc" } } } });
    if (!dia) notFound();
    return (
      <>
        <Seccion titulo="Textos de El día" id="dia">
          <FormularioEntidad entidad="dia" id={dia.id} version={dia.version} campos={REGISTRO.dia.campos} valores={valoresDe(dia, REGISTRO.dia.campos)} />
          {IMAGENES}
        </Seccion>
        <Seccion titulo="Recorrido del día" id="recorrido">
          <p className="ayuda">La hora es opcional: sin horarios confirmados (P7), déjala vacía.</p>
          <ListaElementos
            entidad="paso"
            padre={dia.id}
            campos={REGISTRO.paso.campos}
            tituloAnadir="Añadir un paso"
            elementos={dia.steps.map((paso) => ({
              id: paso.id,
              version: paso.version,
              resumen: paso.time ? `${paso.label} · ${paso.time}` : paso.label,
              detalle: paso.isVisible ? null : <Chip tono="aviso">Oculto</Chip>,
              valores: valoresDe(paso, REGISTRO.paso.campos),
            }))}
          />
        </Seccion>
      </>
    );
  }

  if (bloque === "colaborar") {
    const colaborar = await bd.collaborationContent.findFirst();
    if (!colaborar) notFound();
    return (
      <Seccion titulo="Textos de Colaborar" id="colaborar">
        <FormularioEntidad
          entidad="colaborar"
          id={colaborar.id}
          version={colaborar.version}
          campos={REGISTRO.colaborar.campos}
          valores={valoresDe(colaborar, REGISTRO.colaborar.campos)}
        />
        <p className="ayuda">
          Las cuatro vías, sus textos, las oportunidades y los hoyos se editan en{" "}
          <Link href="/admin/colaboraciones">Vías y hoyos</Link>.
        </p>
      </Seccion>
    );
  }

  const cierre = await bd.closingContent.findFirst();
  if (!cierre) notFound();
  return (
    <Seccion titulo="Textos del cierre" id="cierre">
      <FormularioEntidad entidad="cierre" id={cierre.id} version={cierre.version} campos={REGISTRO.cierre.campos} valores={valoresDe(cierre, REGISTRO.cierre.campos)} />
      <p className="ayuda">
        El muro se rellena con las <Link href="/admin/patrocinadores">marcas</Link> que cumplen la regla de publicación. Los
        canales del cierre se activan en <Link href="/admin/contacto">Contacto</Link>.
      </p>
    </Seccion>
  );
}
