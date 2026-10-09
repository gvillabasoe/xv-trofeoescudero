/**
 * Lógica pura del paso de base de datos del build (Entrega 2).
 * No accede a la red ni al disco: recibe los datos como argumentos para poder probarse.
 * Los mensajes nunca incluyen URLs ni credenciales.
 */

/** Durante la Fase 3 solo existe la base no productiva. PROD se habilita en el lanzamiento (F8). */
export const ENTORNOS_ADMITIDOS = ["NONPROD"];

/**
 * Quita comentarios, cadenas, identificadores entre comillas y cuerpos $$…$$ para que
 * el análisis solo vea las palabras clave de cada sentencia.
 * @param {string} sql
 * @returns {string}
 */
export function limpiarSql(sql) {
  const etiquetaDolar = /\$([A-Za-z_][A-Za-z0-9_]*)?\$/y;
  let salida = "";
  let i = 0;

  while (i < sql.length) {
    if (sql.startsWith("--", i)) {
      const fin = sql.indexOf("\n", i);
      i = fin === -1 ? sql.length : fin;
      continue;
    }

    if (sql.startsWith("/*", i)) {
      const fin = sql.indexOf("*/", i + 2);
      i = fin === -1 ? sql.length : fin + 2;
      salida += " ";
      continue;
    }

    etiquetaDolar.lastIndex = i;
    const dolar = etiquetaDolar.exec(sql);
    if (dolar) {
      const fin = sql.indexOf(dolar[0], i + dolar[0].length);
      i = fin === -1 ? sql.length : fin + dolar[0].length;
      salida += " $cuerpo$ ";
      continue;
    }

    const caracter = sql.charAt(i);
    if (caracter === "'" || caracter === '"') {
      let j = i + 1;
      while (j < sql.length) {
        if (sql.charAt(j) === caracter) {
          if (sql.charAt(j + 1) === caracter) {
            j += 2;
            continue;
          }
          break;
        }
        j += 1;
      }
      i = j + 1;
      salida += caracter === "'" ? " 'texto' " : ' "id" ';
      continue;
    }

    salida += caracter;
    i += 1;
  }

  return salida;
}

/**
 * @param {string} sentencia Sentencia limpia, en mayúsculas y con espacios normalizados.
 * @returns {string | null}
 */
function motivoDestructivo(sentencia) {
  if (/^DROP\b/.test(sentencia)) return "DROP";
  if (/^TRUNCATE\b/.test(sentencia)) return "TRUNCATE";
  if (/^DELETE\b/.test(sentencia)) return "DELETE";
  if (/^UPDATE\b/.test(sentencia)) return "UPDATE";
  if (/^WITH\b/.test(sentencia) && /\b(DELETE|UPDATE)\b/.test(sentencia)) return "DELETE o UPDATE";

  if (/^ALTER\b/.test(sentencia)) {
    if (/\bRENAME\b/.test(sentencia)) return "RENAME";
    if (/\bSET NOT NULL\b/.test(sentencia)) return "SET NOT NULL";
    if (/\bALTER COLUMN\b.*\bTYPE\b/.test(sentencia)) return "ALTER COLUMN … TYPE";
    // DROP NOT NULL y DROP DEFAULT no borran datos.
    const sinCambiosSeguros = sentencia.replace(/\bDROP NOT NULL\b/g, "").replace(/\bDROP DEFAULT\b/g, "");
    if (/\bDROP\b/.test(sinCambiosSeguros)) return "DROP";
  }

  return null;
}

/**
 * Devuelve los motivos por los que una migración es destructiva (lista vacía si no lo es).
 * Criterio del §12 de la arquitectura: DROP, ALTER … TYPE, SET NOT NULL, RENAME, TRUNCATE, DELETE y UPDATE.
 * @param {string} sql
 * @returns {string[]}
 */
export function analizarSql(sql) {
  /** @type {string[]} */
  const motivos = [];
  limpiarSql(sql)
    .split(";")
    .map((bruta) => bruta.replace(/\s+/g, " ").trim().toUpperCase())
    .filter((sentencia) => sentencia.length > 0)
    .forEach((sentencia, indice) => {
      const motivo = motivoDestructivo(sentencia);
      if (motivo) motivos.push(`sentencia ${indice + 1}: ${motivo}`);
    });
  return motivos;
}

/**
 * Migraciones locales que todavía no constan como aplicadas, en orden.
 * @param {string[]} locales
 * @param {string[]} aplicadas
 * @returns {string[]}
 */
export function calcularPendientes(locales, aplicadas) {
  const hechas = new Set(aplicadas);
  return [...locales].sort().filter((nombre) => !hechas.has(nombre));
}

/**
 * Decide si se pueden aplicar las migraciones pendientes (§13: confirmación de las destructivas).
 * @param {{ nombre: string, motivos: string[] }[]} pendientes
 * @param {string | undefined} confirmacion Valor de CONFIRMAR_MIGRACION_DESTRUCTIVA.
 * @returns {{ permitido: boolean, mensaje: string | null }}
 */
export function decidirDestructivas(pendientes, confirmacion) {
  const destructivas = pendientes.filter((migracion) => migracion.motivos.length > 0);
  if (destructivas.length === 0) return { permitido: true, mensaje: null };

  if (destructivas.length > 1) {
    const nombres = destructivas.map((migracion) => migracion.nombre).join(", ");
    return {
      permitido: false,
      mensaje: `hay ${destructivas.length} migraciones destructivas pendientes (${nombres}). Se aplican de una en una, cada una en su propia entrega.`,
    };
  }

  const [unica] = destructivas;
  if (!unica) return { permitido: true, mensaje: null };

  if (confirmacion?.trim() === unica.nombre) {
    return {
      permitido: true,
      mensaje: `migración destructiva ${unica.nombre} confirmada con CONFIRMAR_MIGRACION_DESTRUCTIVA. Borra esa variable después del despliegue.`,
    };
  }

  return {
    permitido: false,
    mensaje: `la migración ${unica.nombre} es destructiva (${unica.motivos.join("; ")}). No se aplica sin confirmación: añade en Vercel la variable CONFIRMAR_MIGRACION_DESTRUCTIVA con el valor exacto «${unica.nombre}» y pulsa Redeploy.`,
  };
}

/**
 * @param {string | undefined} valor
 * @param {string} nombre
 * @param {string[]} errores
 * @returns {URL | null}
 */
function leerUrl(valor, nombre, errores) {
  if (!valor || valor.trim() === "") {
    errores.push(`falta ${nombre} en las variables de Vercel.`);
    return null;
  }
  let url;
  try {
    url = new URL(valor.trim());
  } catch {
    errores.push(`${nombre} no es una URL válida.`);
    return null;
  }
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    errores.push(`${nombre} debe empezar por postgresql://.`);
    return null;
  }
  return url;
}

/**
 * Comprueba las variables del paso de base de datos sin mostrar nunca sus valores.
 * @param {Record<string, string | undefined>} env
 * @returns {{ errores: string[], avisos: string[], entorno: string | null }}
 */
export function revisarVariables(env) {
  /** @type {string[]} */
  const errores = [];
  /** @type {string[]} */
  const avisos = [];

  const entorno = env.ENTORNO_DATOS?.trim() ?? "";
  if (entorno === "") {
    errores.push("falta ENTORNO_DATOS en las variables de Vercel. Durante la Fase 3 debe valer NONPROD.");
  } else if (!ENTORNOS_ADMITIDOS.includes(entorno)) {
    // El valor no se muestra: si alguien pegara ahí un secreto por error, no debe acabar en el log.
    errores.push(
      "ENTORNO_DATOS no vale NONPROD (el valor no se muestra). Escribe exactamente NONPROD, en mayúsculas y sin comillas. Durante la Fase 3 solo se admite NONPROD: la base de producción se conecta en el lanzamiento (F8).",
    );
  }

  const conPool = leerUrl(env.DATABASE_URL, "DATABASE_URL", errores);
  const directa = leerUrl(env.DIRECT_URL, "DIRECT_URL", errores);

  if (directa && directa.hostname.includes("-pooler")) {
    errores.push(
      "DIRECT_URL apunta al pooler de Neon (su dirección contiene «-pooler»). Cópiala de nuevo en Neon con «Connection pooling» desactivado.",
    );
  }
  if (conPool && !conPool.hostname.includes("-pooler")) {
    avisos.push(
      "DATABASE_URL no usa el pooler de Neon (su dirección no contiene «-pooler»). Funciona, pero la aplicación debería usar la conexión con pool.",
    );
  }
  if (conPool && directa) {
    const mismoHost = conPool.hostname.replace("-pooler", "") === directa.hostname;
    const mismaBase = conPool.pathname === directa.pathname;
    if (!mismoHost || !mismaBase) {
      errores.push(
        "DATABASE_URL y DIRECT_URL no apuntan a la misma rama y base de datos de Neon. Cópialas de nuevo desde la misma rama.",
      );
    }
  }

  return { errores, avisos, entorno: errores.length === 0 ? entorno : null };
}
