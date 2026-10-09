import { analizarMarkdown, esLista, type Linea } from "@/lib/markdown";

function EnLinea({ contenido }: { contenido: Linea[] }) {
  return (
    <>
      {contenido.map((parte, indice) =>
        parte.tipo === "negrita" ? (
          <strong key={indice}>{parte.texto}</strong>
        ) : parte.tipo === "enlace" ? (
          <a key={indice} href={parte.href} rel={parte.href.startsWith("https:") ? "noopener noreferrer" : undefined}>
            {parte.texto}
          </a>
        ) : (
          <span key={indice}>{parte.texto}</span>
        ),
      )}
    </>
  );
}

/** Texto legal en markdown limitado (sin HTML). */
export function TextoLegal({ fuente }: { fuente: string }) {
  return (
    <div className="legal">
      {analizarMarkdown(fuente).map((bloque, indice) => {
        if (esLista(bloque)) {
          const Lista = bloque.tipo;
          return (
            <Lista key={indice}>
              {bloque.elementos.map((elemento, posicion) => (
                <li key={posicion}>
                  <EnLinea contenido={elemento} />
                </li>
              ))}
            </Lista>
          );
        }
        const Etiqueta = bloque.tipo;
        return (
          <Etiqueta key={indice}>
            <EnLinea contenido={bloque.contenido} />
          </Etiqueta>
        );
      })}
    </div>
  );
}
