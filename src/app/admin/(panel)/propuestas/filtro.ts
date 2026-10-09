import { ESTADOS_PROPUESTA, TIPOS_FILTRO, type FiltroBandeja } from "@/server/propuestas/bandeja";

type Parametros = Record<string, string | string[] | undefined>;

function uno(valor: string | string[] | undefined): string {
  return typeof valor === "string" ? valor : "";
}

/** Filtro de la bandeja a partir de los parámetros de la URL (lo comparten la lista y la exportación CSV). */
export function filtroDesdeParametros(parametros: Parametros | URLSearchParams): FiltroBandeja & { pagina: number } {
  const leer = (nombre: string) => (parametros instanceof URLSearchParams ? (parametros.get(nombre) ?? "") : uno(parametros[nombre]));
  const estado = leer("estado");
  const tipo = leer("tipo");
  const archivo = leer("archivo");
  return {
    estado: (ESTADOS_PROPUESTA as readonly string[]).includes(estado) ? (estado as FiltroBandeja["estado"]) : null,
    tipo: (TIPOS_FILTRO as readonly string[]).includes(tipo) ? (tipo as FiltroBandeja["tipo"]) : null,
    archivo: archivo === "archivadas" || archivo === "todas" ? archivo : "activas",
    texto: leer("q").slice(0, 100) || null,
    soloNoLeidas: leer("noleidas") === "si",
    pagina: Math.max(1, Number(leer("pagina")) || 1),
  };
}

export function parametrosDeFiltro(filtro: FiltroBandeja, pagina?: number): string {
  const parametros = new URLSearchParams();
  if (filtro.estado) parametros.set("estado", filtro.estado);
  if (filtro.tipo) parametros.set("tipo", filtro.tipo);
  if (filtro.archivo && filtro.archivo !== "activas") parametros.set("archivo", filtro.archivo);
  if (filtro.texto) parametros.set("q", filtro.texto);
  if (filtro.soloNoLeidas) parametros.set("noleidas", "si");
  if (pagina && pagina > 1) parametros.set("pagina", String(pagina));
  const consulta = parametros.toString();
  return consulta ? `?${consulta}` : "";
}
