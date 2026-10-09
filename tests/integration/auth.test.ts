import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { AccesoRechazado, iniciarSesionConContrasena, verificarSegundoFactor } from "@/server/auth/acceso";
import {
  AltaInicialNoDisponible,
  AltaInicialRechazada,
  altaInicialDisponible,
  crearPrimerAdministrador,
} from "@/server/auth/alta-inicial";
import { crearAuth } from "@/server/auth/config";
import { huellaDeCabeceras } from "@/server/auth/huella";
import { registrarIntento } from "@/server/auth/limite";
import { TarroCookies } from "../helpers/cookies";
import { codigoTotp, secretoDeUri } from "../helpers/totp";

// Base 4 de CI (AUTH_URL), nueva y migrada. Secretos aleatorios de un solo uso generados por el propio job.
// Todo con datos de prueba: el administrador y sus contraseñas solo existen durante este job.

const url = process.env.AUTH_URL;
const SECRETO_ALTA = process.env.ADMIN_SETUP_SECRET;
const SECRETO_HUELLA = process.env.FINGERPRINT_HMAC_SECRET;
if (!url || !SECRETO_ALTA || !SECRETO_HUELLA || !process.env.BETTER_AUTH_SECRET) {
  throw new Error("Faltan AUTH_URL o los secretos de prueba que genera el job de CI.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const auth = crearAuth(prisma, { BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET });

const ADMIN = { nombre: "Administración de prueba", email: "admin@example.com", contrasena: "contraseña-de-prueba-larga-1" };
const huella = (tarro: TarroCookies) => huellaDeCabeceras(tarro.cabeceras(), SECRETO_HUELLA);
let secretoTotp = "";
let codigosRecuperacion: string[] = [];

afterAll(async () => {
  await prisma.$disconnect();
});

async function entrarConContrasena(tarro: TarroCookies, contrasena = ADMIN.contrasena) {
  const resultado = await iniciarSesionConContrasena(prisma, auth, {
    email: ADMIN.email,
    contrasena,
    cabeceras: tarro.cabeceras(),
    huella: huella(tarro),
  });
  tarro.guardar(resultado.setCookies);
  return resultado.destino;
}

describe("alta inicial", () => {
  it("está disponible sin administradores y con el secreto configurado", async () => {
    expect(await altaInicialDisponible(prisma, SECRETO_ALTA)).toBe(true);
    expect(await altaInicialDisponible(prisma, undefined)).toBe(false);
  });

  it("rechaza un secreto incorrecto y lo audita sin datos personales", async () => {
    await expect(
      crearPrimerAdministrador(prisma, auth, { ...ADMIN, secreto: "no-es-el-secreto" }, { secretoEsperado: SECRETO_ALTA, huella: "h-alta" }),
    ).rejects.toThrow(AltaInicialRechazada);
    expect(await prisma.user.count()).toBe(0);
    const registro = await prisma.auditLog.findFirstOrThrow({ where: { action: "ALTA_INICIAL" } });
    expect(registro.summary).not.toContain(ADMIN.email);
  });

  it("dos altas simultáneas crean un único administrador, de forma transaccional", async () => {
    const resultados = await Promise.allSettled([
      crearPrimerAdministrador(prisma, auth, { ...ADMIN, secreto: SECRETO_ALTA }, { secretoEsperado: SECRETO_ALTA, huella: "h-1" }),
      crearPrimerAdministrador(prisma, auth, { ...ADMIN, secreto: SECRETO_ALTA }, { secretoEsperado: SECRETO_ALTA, huella: "h-2" }),
    ]);
    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rechazo = resultados.find((r) => r.status === "rejected");
    expect(rechazo?.status === "rejected" && rechazo.reason).toBeInstanceOf(AltaInicialNoDisponible);

    expect(await prisma.user.count()).toBe(1);
    const admin = await prisma.user.findFirstOrThrow({ include: { accounts: true, adminProfile: true } });
    expect(admin).toMatchObject({ role: "admin", twoFactorEnabled: false });
    expect(admin.accounts).toHaveLength(1);
    expect(admin.accounts[0]).toMatchObject({ providerId: "credential" });
    expect(admin.accounts[0]?.password).not.toContain(ADMIN.contrasena);
    expect(admin.adminProfile).not.toBeNull();
    expect(await prisma.auditLog.count({ where: { action: "ALTA_INICIAL", actorType: "USER", actorId: admin.id } })).toBe(1);
  });

  it("queda desactivada para siempre en cuanto existe un administrador", async () => {
    expect(await altaInicialDisponible(prisma, SECRETO_ALTA)).toBe(false);
    await expect(
      crearPrimerAdministrador(
        prisma,
        auth,
        { ...ADMIN, email: "tercero@example.com", secreto: SECRETO_ALTA },
        { secretoEsperado: SECRETO_ALTA, huella: "h-3" },
      ),
    ).rejects.toThrow(AltaInicialNoDisponible);
  });

  it("el registro público está desactivado", async () => {
    await expect(
      auth.api.signUpEmail({ body: { name: "Intruso", email: "intruso@example.com", password: "contraseña-de-intruso-1" } }),
    ).rejects.toThrow();
    expect(await prisma.user.count()).toBe(1);
  });
});

describe("acceso y TOTP", () => {
  const principal = new TarroCookies("203.0.113.20");

  it("rechaza una contraseña incorrecta y lo audita sin el email", async () => {
    await expect(entrarConContrasena(new TarroCookies("203.0.113.21"), "contraseña-equivocada")).rejects.toThrow(AccesoRechazado);
    const fallo = await prisma.auditLog.findFirstOrThrow({ where: { action: "INICIO_SESION_FALLIDO" } });
    expect(fallo.summary).not.toContain(ADMIN.email);
    expect(fallo.actorId).toBeNull();
  });

  it("sin TOTP activo, la contraseña solo lleva a Seguridad", async () => {
    expect(await entrarConContrasena(principal)).toBe("seguridad");
    const sesion = await auth.api.getSession({ headers: principal.cabeceras() });
    expect(sesion?.user.email).toBe(ADMIN.email);
  });

  it("activa TOTP con un código válido y entrega 10 códigos de recuperación", async () => {
    const resultado = await auth.api.enableTwoFactor({
      body: { password: ADMIN.contrasena },
      headers: principal.cabeceras(),
    });
    if (resultado.method !== "totp") throw new Error("Better Auth no ha preparado TOTP");
    secretoTotp = secretoDeUri(resultado.totpURI);
    codigosRecuperacion = resultado.backupCodes;
    expect(resultado.backupCodes.length).toBeGreaterThanOrEqual(10);
    // Hasta verificar el primer código, el TOTP no está activo.
    expect((await prisma.user.findFirstOrThrow()).twoFactorEnabled).toBe(false);

    await auth.api.verifyTOTP({ body: { code: codigoTotp(secretoTotp) }, headers: principal.cabeceras() });
    expect((await prisma.user.findFirstOrThrow()).twoFactorEnabled).toBe(true);
  });

  it("con TOTP activo, el login pide el segundo factor y el código de la app abre sesión", async () => {
    const tarro = new TarroCookies("203.0.113.22");
    expect(await entrarConContrasena(tarro)).toBe("segundo-factor");
    expect(await auth.api.getSession({ headers: tarro.cabeceras() })).toBeNull();

    const resultado = await verificarSegundoFactor(prisma, auth, {
      codigo: codigoTotp(secretoTotp),
      tipo: "totp",
      cabeceras: tarro.cabeceras(),
      huella: huella(tarro),
    });
    tarro.guardar(resultado.setCookies);
    expect(resultado.destino).toBe("panel");
    expect((await auth.api.getSession({ headers: tarro.cabeceras() }))?.user.email).toBe(ADMIN.email);
  });

  it("rechaza un código TOTP incorrecto", async () => {
    const tarro = new TarroCookies("203.0.113.23");
    await entrarConContrasena(tarro);
    const actual = codigoTotp(secretoTotp);
    const incorrecto = actual === "000000" ? "111111" : "000000";
    await expect(
      verificarSegundoFactor(prisma, auth, { codigo: incorrecto, tipo: "totp", cabeceras: tarro.cabeceras(), huella: huella(tarro) }),
    ).rejects.toThrow(AccesoRechazado);
    expect(await auth.api.getSession({ headers: tarro.cabeceras() })).toBeNull();
  });

  it("un código de recuperación abre sesión una sola vez", async () => {
    const codigo = codigosRecuperacion[0] ?? "";
    const primero = new TarroCookies("203.0.113.24");
    await entrarConContrasena(primero);
    const resultado = await verificarSegundoFactor(prisma, auth, {
      codigo,
      tipo: "recuperacion",
      cabeceras: primero.cabeceras(),
      huella: huella(primero),
    });
    expect(resultado.destino).toBe("panel");

    const segundo = new TarroCookies("203.0.113.25");
    await entrarConContrasena(segundo);
    await expect(
      verificarSegundoFactor(prisma, auth, { codigo, tipo: "recuperacion", cabeceras: segundo.cabeceras(), huella: huella(segundo) }),
    ).rejects.toThrow(AccesoRechazado);
  });

  it("ningún camino de Better Auth puede crear usuarios, ni siquiera un administrador", async () => {
    await expect(
      auth.api.createUser({
        body: { email: "nuevo@example.com", password: "contraseña-nueva-larga-1", name: "Nuevo", role: "admin" },
        headers: principal.cabeceras(),
      }),
    ).rejects.toThrow();
    expect(await prisma.user.count()).toBe(1);
  });
});

describe("sesiones", () => {
  it("revocar las demás sesiones deja solo la actual, y cerrar sesión la invalida", async () => {
    const tarro = new TarroCookies("203.0.113.30");
    await entrarConContrasena(tarro);
    const resultado = await verificarSegundoFactor(prisma, auth, {
      codigo: codigoTotp(secretoTotp),
      tipo: "totp",
      cabeceras: tarro.cabeceras(),
      huella: huella(tarro),
    });
    tarro.guardar(resultado.setCookies);

    expect((await auth.api.listSessions({ headers: tarro.cabeceras() })).length).toBeGreaterThan(1);
    await auth.api.revokeOtherSessions({ headers: tarro.cabeceras() });
    expect(await auth.api.listSessions({ headers: tarro.cabeceras() })).toHaveLength(1);

    await auth.api.signOut({ headers: tarro.cabeceras() });
    expect(await auth.api.getSession({ headers: tarro.cabeceras() })).toBeNull();
  });

  it("IP y user agent quedan solo en la sesión, nunca en la auditoría", async () => {
    const registros = await prisma.auditLog.findMany({ select: { summary: true, entityId: true } });
    const texto = JSON.stringify(registros);
    expect(texto).not.toContain("203.0.113.");
    expect(texto).not.toContain("Vitest");
  });
});

describe("límite de intentos", () => {
  it("bloquea a partir del intento 11 en la misma ventana", async () => {
    const ahora = new Date("2026-10-09T10:00:00.000Z");
    const resultados: Array<{ permitido: boolean; restantes: number }> = [];
    for (let i = 0; i < 11; i += 1) {
      resultados.push(await registrarIntento(prisma, { accion: "LOGIN", huella: "h-limite", ahora }));
    }
    expect(resultados.slice(0, 10).every((r) => r.permitido)).toBe(true);
    expect(resultados[10]?.permitido).toBe(false);
    // Otra ventana empieza de cero.
    expect((await registrarIntento(prisma, { accion: "LOGIN", huella: "h-limite", ahora: new Date("2026-10-09T10:16:00.000Z") })).permitido).toBe(true);
  });
});
