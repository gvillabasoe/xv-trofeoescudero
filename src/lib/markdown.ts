/**
 * Markdown limitado para los textos legales (LegalPage.body). Sin HTML: el texto nunca se inserta como HTML,
 * se convierte en bloques que React escapa.
 * Admite: «## Título», «### Subtítulo», párrafos, listas con «- » o «1. », **negrita** y [enlaces](https://…)
 * (solo https:, mailto: y tel:).
 */

export type Linea =
  | { tipo: "texto"; texto: string }
  | { tipo: "negrita"; texto: string }
  | { tipo: "enlace"; texto: string; href: string };

export interface BloqueTexto {
  tipo: "h2" | "h3" | "p";
  contenido: Linea[];
}

export interface BloqueLista {
  tipo: "ul" | "ol";
  elementos: Linea[][];
}

export type Bloque = BloqueTexto | BloqueLista;

export function esLista(bloque: Bloque): bloque is BloqueLista {
  return bloque.tipo === "ul" || bloque.tipo === "ol";
}

const PATRON_EN_LINEA = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

export function enlaceSeguro(href: string): boolean {
  return /^(https:\/\/|mailto:|tel:)/i.test(href);
}

export function analizarEnLinea(texto: string): Linea[] {
  const resultado: Linea[] = [];
  let ultimo = 0;
  for (const coincidencia of texto.matchAll(PATRON_EN_LINEA)) {
    const inicio = coincidencia.index ?? 0;
    if (inicio > ultimo) resultado.push({ tipo: "texto", texto: texto.slice(ultimo, inicio) });
    if (coincidencia[1] !== undefined) {
      resultado.push({ tipo: "negrita", texto: coincidencia[1] });
    } else if (coincidencia[2] !== undefined && coincidencia[3] !== undefined) {
      resultado.push(
        enlaceSeguro(coincidencia[3])
          ? { tipo: "enlace", texto: coincidencia[2], href: coincidencia[3] }
          : { tipo: "texto", texto: coincidencia[2] },
      );
    }
    ultimo = inicio + coincidencia[0].length;
  }
  if (ultimo < texto.length) resultado.push({ tipo: "texto", texto: texto.slice(ultimo) });
  return resultado;
}

export function analizarMarkdown(fuente: string): Bloque[] {
  const bloques: Bloque[] = [];
  const estado: { parrafo: string[]; lista: BloqueLista | null } = { parrafo: [], lista: null };

  const cerrarParrafo = () => {
    if (estado.parrafo.length > 0) bloques.push({ tipo: "p", contenido: analizarEnLinea(estado.parrafo.join(" ")) });
    estado.parrafo = [];
  };
  const cerrarLista = () => {
    if (estado.lista) bloques.push(estado.lista);
    estado.lista = null;
  };

  for (const lineaBruta of fuente.replace(/\r\n?/g, "\n").split("\n")) {
    const linea = lineaBruta.trim();
    if (linea === "") {
      cerrarParrafo();
      cerrarLista();
      continue;
    }
    const titulo = /^(#{2,3})\s+(.+)$/.exec(linea);
    const vineta = /^[-*]\s+(.+)$/.exec(linea);
    const numerada = /^\d+[.)]\s+(.+)$/.exec(linea);
    if (titulo) {
      cerrarParrafo();
      cerrarLista();
      bloques.push({ tipo: titulo[1] === "##" ? "h2" : "h3", contenido: analizarEnLinea(titulo[2] ?? "") });
    } else if (vineta || numerada) {
      cerrarParrafo();
      const tipo = vineta ? "ul" : "ol";
      if (estado.lista?.tipo !== tipo) {
        cerrarLista();
        estado.lista = { tipo, elementos: [] };
      }
      estado.lista?.elementos.push(analizarEnLinea((vineta ?? numerada)?.[1] ?? ""));
    } else {
      cerrarLista();
      estado.parrafo.push(linea);
    }
  }
  cerrarParrafo();
  cerrarLista();
  return bloques;
}
