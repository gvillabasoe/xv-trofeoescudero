/** Tarro de cookies mínimo para seguir una sesión de Better Auth en los tests (sin navegador). */
export class TarroCookies {
  private readonly cookies = new Map<string, string>();

  constructor(private readonly ip = "203.0.113.10") {}

  guardar(setCookies: string[]) {
    for (const linea of setCookies) {
      const [par = ""] = linea.split(";");
      const separador = par.indexOf("=");
      if (separador < 0) continue;
      const nombre = par.slice(0, separador).trim();
      const valor = par.slice(separador + 1).trim();
      if (valor === "" || /max-age=0/i.test(linea)) this.cookies.delete(nombre);
      else this.cookies.set(nombre, valor);
    }
  }

  cabeceras(): Headers {
    const cabeceras = new Headers({ "x-forwarded-for": this.ip, "user-agent": "Vitest (CI)" });
    if (this.cookies.size > 0) {
      cabeceras.set("cookie", [...this.cookies].map(([nombre, valor]) => `${nombre}=${valor}`).join("; "));
    }
    return cabeceras;
  }
}
