/** «02 / La familia» → número y nombre, como en la maqueta (`<span>02</span> La familia`). */
export function IndiceBloque({ indice }: { indice: string }) {
  const [numero, ...resto] = indice.split("/");
  const nombre = resto.join("/").trim();
  return (
    <p className="sec-index label">
      {nombre ? (
        <>
          <span>{numero?.trim()}</span> {nombre}
        </>
      ) : (
        indice
      )}
    </p>
  );
}
