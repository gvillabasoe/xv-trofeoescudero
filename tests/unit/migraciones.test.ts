import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  analizarSql,
  calcularPendientes,
  decidirDestructivas,
  limpiarSql,
  revisarVariables,
} from "../../scripts/lib/migraciones.mjs";

describe("analizarSql (detector de migraciones destructivas)", () => {
  it("considera segura la migración 0001_inicial real", async () => {
    const sql = await readFile("prisma/migrations/0001_inicial/migration.sql", "utf8");
    expect(analizarSql(sql)).toEqual([]);
  });

  it("acepta lo que solo crea o amplía", () => {
    expect(analizarSql('CREATE TABLE "X" ("id" TEXT NOT NULL);')).toEqual([]);
    expect(analizarSql('ALTER TABLE "X" ADD COLUMN "nueva" TEXT;')).toEqual([]);
    expect(analizarSql('ALTER TABLE "X" ALTER COLUMN "y" DROP NOT NULL;')).toEqual([]);
    expect(analizarSql('ALTER TABLE "X" ALTER COLUMN "y" DROP DEFAULT;')).toEqual([]);
    expect(analizarSql("ALTER TYPE \"Estado\" ADD VALUE 'NUEVO';")).toEqual([]);
    expect(
      analizarSql(
        'ALTER TABLE "A" ADD CONSTRAINT "A_b_fkey" FOREIGN KEY ("b") REFERENCES "B"("id") ON DELETE SET NULL ON UPDATE CASCADE;',
      ),
    ).toEqual([]);
  });

  it("detecta cada tipo de cambio destructivo", () => {
    expect(analizarSql('DROP TABLE "X";')).toEqual(["sentencia 1: DROP"]);
    expect(analizarSql('ALTER TABLE "X" DROP COLUMN "y";')).toEqual(["sentencia 1: DROP"]);
    expect(analizarSql('ALTER TABLE "X" ALTER COLUMN "y" SET NOT NULL;')).toEqual(["sentencia 1: SET NOT NULL"]);
    expect(analizarSql('ALTER TABLE "X" ALTER COLUMN "y" SET DATA TYPE INTEGER;')).toEqual([
      "sentencia 1: ALTER COLUMN … TYPE",
    ]);
    expect(analizarSql('ALTER TABLE "X" RENAME COLUMN "a" TO "b";')).toEqual(["sentencia 1: RENAME"]);
    expect(analizarSql("ALTER TYPE \"Estado\" RENAME VALUE 'A' TO 'B';")).toEqual(["sentencia 1: RENAME"]);
    expect(analizarSql('TRUNCATE "X";')).toEqual(["sentencia 1: TRUNCATE"]);
    expect(analizarSql('DELETE FROM "X";')).toEqual(["sentencia 1: DELETE"]);
    expect(analizarSql("UPDATE \"X\" SET \"y\" = 'z';")).toEqual(["sentencia 1: UPDATE"]);
  });

  it("numera las sentencias para localizar el problema", () => {
    expect(analizarSql('CREATE TABLE "A" ("id" TEXT); DROP TABLE "B";')).toEqual(["sentencia 2: DROP"]);
  });

  it("ignora palabras clave en comentarios, cadenas, identificadores y cuerpos de función", () => {
    expect(analizarSql("-- DROP TABLE \"X\";\nCREATE TABLE \"A\" (\"id\" TEXT);")).toEqual([]);
    expect(analizarSql('/* DELETE FROM "X"; */ CREATE INDEX "i" ON "A"("id");')).toEqual([]);
    expect(analizarSql("INSERT INTO \"A\" (\"nota\") VALUES ('DROP TABLE; TRUNCATE');")).toEqual([]);
    expect(analizarSql('CREATE TABLE "DROP" ("UPDATE" TEXT);')).toEqual([]);
    expect(
      analizarSql(
        "CREATE FUNCTION f() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN DELETE FROM x; RETURN NULL; END; $$;",
      ),
    ).toEqual([]);
  });

  it("limpiarSql conserva las palabras clave fuera de cadenas", () => {
    expect(limpiarSql("SELECT 'a;b' FROM \"t\"")).toBe("SELECT  'texto'  FROM  \"id\" ");
  });
});

describe("calcularPendientes", () => {
  it("devuelve en orden las migraciones locales no aplicadas", () => {
    expect(calcularPendientes(["0002_b", "0001_a", "0003_c"], ["0001_a"])).toEqual(["0002_b", "0003_c"]);
    expect(calcularPendientes(["0001_a"], ["0001_a"])).toEqual([]);
    expect(calcularPendientes(["0001_a"], [])).toEqual(["0001_a"]);
  });
});

describe("decidirDestructivas", () => {
  const segura = { nombre: "0002_segura", motivos: [] };
  const destructiva = { nombre: "0003_contraer", motivos: ["sentencia 1: DROP"] };

  it("permite las migraciones no destructivas sin confirmación", () => {
    expect(decidirDestructivas([segura], undefined)).toEqual({ permitido: true, mensaje: null });
  });

  it("bloquea una destructiva sin confirmación o con otro nombre", () => {
    expect(decidirDestructivas([segura, destructiva], undefined).permitido).toBe(false);
    expect(decidirDestructivas([destructiva], "0002_segura").permitido).toBe(false);
    expect(decidirDestructivas([destructiva], undefined).mensaje).toContain("CONFIRMAR_MIGRACION_DESTRUCTIVA");
  });

  it("permite una destructiva solo con su nombre exacto", () => {
    expect(decidirDestructivas([destructiva], "0003_contraer").permitido).toBe(true);
    expect(decidirDestructivas([destructiva], " 0003_contraer ").permitido).toBe(true);
  });

  it("no permite dos destructivas a la vez", () => {
    const otra = { nombre: "0004_contraer", motivos: ["sentencia 1: DROP"] };
    expect(decidirDestructivas([destructiva, otra], "0003_contraer").permitido).toBe(false);
  });
});

describe("revisarVariables", () => {
  const conPool = "postgresql://usuario:clave@ep-ejemplo-123-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require";
  const directa = "postgresql://usuario:clave@ep-ejemplo-123.eu-central-1.aws.neon.tech/neondb?sslmode=require";
  const correctas = { DATABASE_URL: conPool, DIRECT_URL: directa, ENTORNO_DATOS: "NONPROD" };

  it("acepta la configuración no productiva correcta", () => {
    expect(revisarVariables(correctas)).toEqual({ errores: [], avisos: [], entorno: "NONPROD" });
  });

  it("exige las tres variables", () => {
    const { errores, entorno } = revisarVariables({});
    expect(entorno).toBeNull();
    expect(errores).toHaveLength(3);
  });

  it("rechaza PROD durante la Fase 3", () => {
    const { errores } = revisarVariables({ ...correctas, ENTORNO_DATOS: "PROD" });
    expect(errores.join(" ")).toContain("Fase 3");
  });

  it("no muestra el valor de ENTORNO_DATOS cuando no es válido", () => {
    const { errores } = revisarVariables({ ...correctas, ENTORNO_DATOS: "postgresql://secreto-pegado-por-error" });
    expect(errores).toHaveLength(1);
    expect(errores.join(" ")).not.toContain("secreto-pegado-por-error");
  });

  it("rechaza una DIRECT_URL que use el pooler", () => {
    const { errores } = revisarVariables({ ...correctas, DIRECT_URL: conPool });
    expect(errores.join(" ")).toContain("DIRECT_URL apunta al pooler");
  });

  it("rechaza URLs de ramas o bases distintas", () => {
    const otraRama = directa.replace("ep-ejemplo-123", "ep-otra-456");
    expect(revisarVariables({ ...correctas, DIRECT_URL: otraRama }).errores.join(" ")).toContain("misma rama");
    const otraBase = directa.replace("/neondb", "/otra");
    expect(revisarVariables({ ...correctas, DIRECT_URL: otraBase }).errores.join(" ")).toContain("misma rama");
  });

  it("avisa, sin fallar, si DATABASE_URL no usa el pooler", () => {
    const resultado = revisarVariables({ ...correctas, DATABASE_URL: directa });
    expect(resultado.errores).toEqual([]);
    expect(resultado.avisos).toHaveLength(1);
  });

  it("rechaza valores que no son URLs de PostgreSQL sin mostrarlos", () => {
    const { errores } = revisarVariables({ ...correctas, DATABASE_URL: "https://secreto.example.com" });
    expect(errores.join(" ")).toContain("postgresql://");
    expect(errores.join(" ")).not.toContain("secreto");
  });

  it("nunca incluye credenciales en los mensajes", () => {
    const { errores } = revisarVariables({ ...correctas, DIRECT_URL: conPool });
    expect(errores.join(" ")).not.toContain("clave");
  });
});
