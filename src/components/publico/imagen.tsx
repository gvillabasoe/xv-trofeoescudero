import type { ImagenPublica } from "@/lib/snapshot/esquema";
import { Dibujo, type Ilustracion } from "./ilustraciones";

/**
 * Foto publicada (variantes WebP ya generadas, sin optimizador de imágenes) o, si no hay ninguna autorizada,
 * el placeholder ilustrado del hueco. El placeholder es decorativo: no se anuncia a los lectores de pantalla.
 */
export function Foto({
  imagen,
  placeholder,
  sizes,
  prioritaria = false,
  className,
}: {
  imagen: ImagenPublica | null;
  placeholder: Ilustracion;
  sizes: string;
  prioritaria?: boolean;
  className?: string;
}) {
  if (!imagen) {
    return (
      <div className={`foto foto--placeholder${className ? ` ${className}` : ""}`} aria-hidden="true">
        <Dibujo tipo={placeholder} />
      </div>
    );
  }
  return (
    <div className={`foto${className ? ` ${className}` : ""}`}>
      <ImagenResponsiva imagen={imagen} sizes={sizes} prioritaria={prioritaria} />
    </div>
  );
}

export function ImagenResponsiva({
  imagen,
  sizes,
  prioritaria = false,
  alt,
}: {
  imagen: ImagenPublica;
  sizes: string;
  prioritaria?: boolean;
  /** Para sustituir el alt (p. ej., logos, donde el nombre de la marca es el texto). */
  alt?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- variantes propias ya optimizadas: no se usa el optimizador.
    <img
      src={imagen.url}
      srcSet={imagen.variantes.map((variante) => `${variante.url} ${variante.ancho}w`).join(", ")}
      sizes={sizes}
      alt={alt ?? imagen.alt}
      width={imagen.ancho}
      height={imagen.alto}
      loading={prioritaria ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={prioritaria ? "high" : "auto"}
      style={{ objectPosition: `${Math.round(imagen.focoX * 100)}% ${Math.round(imagen.focoY * 100)}%` }}
    />
  );
}
