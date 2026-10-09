"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const GRUPOS: ReadonlyArray<{ titulo: string; enlaces: ReadonlyArray<{ href: string; texto: string }> }> = [
  {
    titulo: "Día a día",
    enlaces: [
      { href: "/admin", texto: "Inicio" },
      { href: "/admin/propuestas", texto: "Propuestas" },
    ],
  },
  {
    titulo: "Web",
    enlaces: [
      { href: "/admin/contenido", texto: "Textos de la web" },
      { href: "/admin/colaboraciones", texto: "Vías y hoyos" },
      { href: "/admin/patrocinadores", texto: "Marcas" },
      { href: "/admin/imagenes", texto: "Imágenes" },
      { href: "/admin/contacto", texto: "Contacto" },
      { href: "/admin/legal", texto: "Textos legales" },
    ],
  },
  {
    titulo: "Publicación",
    enlaces: [
      { href: "/admin/publicar", texto: "Revisar y publicar" },
      { href: "/admin/versiones", texto: "Versiones" },
    ],
  },
  {
    titulo: "Administración",
    enlaces: [
      { href: "/admin/configuracion", texto: "Configuración" },
      { href: "/admin/actividad", texto: "Actividad" },
      { href: "/admin/seguridad", texto: "Seguridad" },
    ],
  },
];

/** Con la ruta actual marcada. Va dentro de un Suspense (la ruta solo se conoce en cada petición). */
export function NavPanel() {
  const ruta = usePathname();
  return <ListaNav ruta={ruta} />;
}

/** Misma navegación sin marcar la sección actual (se muestra mientras llega la ruta). */
export function NavPanelSinRuta() {
  return <ListaNav ruta={null} />;
}

function ListaNav({ ruta }: { ruta: string | null }) {
  const activo = (href: string) =>
    ruta !== null && (href === "/admin" ? ruta === "/admin" : ruta === href || ruta.startsWith(`${href}/`));
  return (
    <nav className="panel-nav" aria-label="Panel de administración">
      {GRUPOS.map((grupo) => (
        <div key={grupo.titulo} className="panel-nav__grupo">
          <p className="panel-nav__titulo">{grupo.titulo}</p>
          <ul>
            {grupo.enlaces.map((enlace) => (
              <li key={enlace.href}>
                <Link href={enlace.href} aria-current={activo(enlace.href) ? "page" : undefined}>
                  {enlace.texto}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
