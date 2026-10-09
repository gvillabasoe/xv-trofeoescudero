import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import sharp from "sharp";
import { codigoTotp } from "../helpers/totp";

// Recorrido completo de la web y del panel contra una base desechable recién inicializada (bootstrap).
// Las pruebas van en orden y comparten la sesión del administrador de prueba.

const SECRETO_ALTA = process.env.ADMIN_SETUP_SECRET ?? "";
const SECRETO_CRON = process.env.CRON_SECRET ?? "";
const ADMIN = { nombre: "Administración E2E", email: "admin-e2e@example.com", contrasena: "contraseña-e2e-muy-larga-1" };
const ENTRADILLA = "Texto de prueba E2E: cada agosto volvemos a jugar en El Rompido.";
const EMPRESA = "Marca de prueba E2E";
const TEXTO_PRIVACIDAD = [
  "## Responsable del tratamiento",
  "Texto de prueba para las pruebas automáticas. No es un texto legal real ni se usa fuera de esta base desechable.",
  "",
  "## Finalidad",
  "- Responder a las propuestas recibidas.",
  "- Nada más.",
  "",
  "Más información en [la portada](https://example.com).",
].join("\n");

test.describe.configure({ mode: "serial" });

let contexto: BrowserContext;
let panel: Page;

test.beforeAll(async ({ browser }) => {
  expect(SECRETO_ALTA.length, "Falta ADMIN_SETUP_SECRET en el entorno de las pruebas").toBeGreaterThanOrEqual(32);
  contexto = await browser.newContext();
  panel = await contexto.newPage();
});

test.afterAll(async () => {
  await contexto?.close();
});

async function sinErroresGraves(page: Page) {
  const resultado = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const graves = resultado.violations.filter((violacion) => violacion.impact === "serious" || violacion.impact === "critical");
  expect(graves.map((violacion) => `${violacion.id}: ${violacion.help} (${violacion.nodes.length})`)).toEqual([]);
}

/** Espera al principio de una ventana de 30 s para que el código no caduque mientras se escribe. */
async function codigoFresco(secreto: string): Promise<string> {
  const restante = 30_000 - (Date.now() % 30_000);
  if (restante < 5_000) await new Promise((resolver) => setTimeout(resolver, restante + 300));
  return codigoTotp(secreto);
}

test.describe("web pública (versión nº 1 del bootstrap)", () => {
  test("la portada muestra los cinco bloques con el contenido publicado", async ({ page }) => {
    const respuesta = await page.goto("/");
    expect(respuesta?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Empezó como una pachanga. Ahora necesitamos dos campos.");
    for (const id of ["inicio", "familia", "el-dia", "colaborar", "cierre"]) {
      await expect(page.locator(`section#${id}`)).toBeVisible();
    }
    const texto = await page.locator("main").innerText();
    expect(texto).not.toMatch(/\[pendiente\]/i);
    expect(texto).not.toContain("Cuzcurrita");
    expect(texto).not.toMatch(/junior/i);
    expect(texto).toContain("Sin promesas infladas");
    await expect(page.locator(".muro li")).toHaveCount(17);
    const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
    expect(ld).toMatchObject({ "@type": "SportsEvent", startDate: "2027-08-03" });
    await sinErroresGraves(page);
  });

  test("el menú móvil cumple §13.1: Escape, foco atrapado, cierre al elegir y al pulsar fuera", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    const boton = page.getByRole("button", { name: "Menú" });
    await boton.click();
    await expect(boton).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("link", { name: "La familia" })).toBeFocused();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(boton).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(boton).toHaveAttribute("aria-expanded", "false");
    await expect(boton).toBeFocused();
    await boton.click();
    await page.mouse.click(20, 600);
    await expect(boton).toHaveAttribute("aria-expanded", "false");
    await boton.click();
    await page.getByRole("link", { name: "Colaborar" }).click();
    await expect(boton).toHaveAttribute("aria-expanded", "false");
    await expect(page).toHaveURL(/#colaborar$/);
  });

  test("el detalle de una vía es un diálogo accesible (§13.2)", async ({ page }) => {
    await page.goto("/");
    const abrir = page.getByRole("button", { name: "Ver el detalle: 01 · En el pecho" });
    await abrir.click();
    const dialogo = page.getByRole("dialog", { name: "Patrocinador principal y polo oficial" });
    await expect(dialogo).toBeVisible();
    await expect(dialogo.getByRole("link", { name: "Vestir la XV edición" })).toHaveAttribute(
      "href",
      "/proponer?tipo=principal&via=pecho",
    );
    await page.keyboard.press("Escape");
    await expect(dialogo).toBeHidden();
    await expect(abrir).toBeFocused();
    await abrir.click();
    await dialogo.getByRole("button", { name: "Cerrar el detalle" }).click();
    await expect(dialogo).toBeHidden();
  });

  test("/proponer está cerrado mientras no haya política de privacidad publicada", async ({ page }) => {
    await page.goto("/proponer");
    await expect(page.getByText("Ahora mismo no podemos recibir propuestas por aquí.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Enviar propuesta" })).toHaveCount(0);
    await sinErroresGraves(page);
    expect((await page.goto("/privacidad"))?.status()).toBe(404);
  });

  test("la 404 es «Bola perdida»", async ({ page }) => {
    const respuesta = await page.goto("/esta-pagina-no-existe");
    expect(respuesta?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Bola perdida." })).toBeVisible();
  });
});

test.describe("panel", () => {
  test("alta inicial y activación de TOTP", async () => {
    expect((await panel.goto("/admin"))?.url()).toContain("/admin/login");
    await panel.goto("/admin/alta-inicial");
    await panel.getByLabel("Nombre", { exact: true }).filter({ visible: true }).fill(ADMIN.nombre);
    await panel.getByLabel("Email").filter({ visible: true }).fill(ADMIN.email);
    await panel.getByLabel("Contraseña", { exact: true }).filter({ visible: true }).fill(ADMIN.contrasena);
    await panel.getByLabel("Repite la contraseña").filter({ visible: true }).fill(ADMIN.contrasena);
    await panel.getByLabel("Secreto de alta").filter({ visible: true }).fill(SECRETO_ALTA);
    await panel.getByRole("button", { name: "Crear el administrador" }).click();
    await panel.waitForURL("**/admin/seguridad");
    await expect(panel.getByRole("heading", { name: "Verificación en dos pasos (TOTP)" })).toBeVisible();

    await panel.getByLabel("Contraseña").filter({ visible: true }).fill(ADMIN.contrasena);
    await panel.getByRole("button", { name: "Empezar la activación" }).click();
    const clave = (await panel.locator("p:visible", { hasText: "escribe esta clave" }).locator("code").textContent()) ?? "";
    await panel.getByLabel(/Escribe el código de 6 cifras/).filter({ visible: true }).fill(await codigoFresco(clave.replace(/\s+/g, "")));
    await panel.getByRole("button", { name: "Activar" }).click();
    await panel.waitForURL(/\/admin$/);
    await expect(panel.getByRole("heading", { name: "Inicio" })).toBeVisible();
    // Guarda la clave para el segundo inicio de sesión.
    process.env.E2E_TOTP = clave.replace(/\s+/g, "");
    // La alta inicial ya no existe.
    expect((await panel.request.get("/admin/alta-inicial")).status()).toBe(404);
  });

  test("editar un texto y control de versión con dos pestañas", async () => {
    const otra = await contexto.newPage();
    await otra.goto("/admin/contenido/hero");
    await panel.goto("/admin/contenido/hero");
    const seccion = panel.locator("#hero:visible");
    await seccion.getByLabel("Entradilla", { exact: true }).filter({ visible: true }).fill(ENTRADILLA);
    await seccion.getByRole("button", { name: "Guardar" }).click();
    await expect(seccion.getByRole("status")).toContainText("Guardado");

    // La otra pestaña sigue con la versión anterior: no puede pisar el cambio.
    await otra.locator("#hero:visible").getByLabel("Antetítulo").filter({ visible: true }).fill("Cambio desde una pestaña antigua");
    await otra.locator("#hero:visible").getByRole("button", { name: "Guardar" }).click();
    await expect(otra.locator("#hero:visible").getByRole("alert")).toContainText("Otra persona ha guardado cambios");
    await otra.close();
  });

  test("validación del CMS: un texto obligatorio vacío no se guarda", async () => {
    await panel.goto("/admin/contenido/colaborar");
    const seccion = panel.locator("#colaborar:visible");
    await seccion.getByLabel("Nota de transparencia (texto literal aprobado)").fill("");
    await seccion.getByRole("button", { name: "Guardar" }).click();
    await expect(seccion.getByText("Este campo no puede quedar vacío.")).toBeVisible();
  });

  test("añadir un canal de contacto activo", async () => {
    await panel.goto("/admin/contacto");
    await panel.getByText("+ Añadir un canal").filter({ visible: true }).click();
    const nuevo = panel.locator("details", { hasText: "+ Añadir un canal" });
    await nuevo.getByLabel("Texto del enlace").filter({ visible: true }).fill("Escribir un email");
    await nuevo.getByLabel("Dato").filter({ visible: true }).fill("organizacion@example.com");
    await nuevo.getByLabel("Activo").filter({ visible: true }).check();
    await nuevo.getByRole("button", { name: "Añadir" }).click();
    await expect(nuevo.getByRole("status")).toContainText("Añadido");
  });

  test("publicar la política de privacidad abre el formulario", async () => {
    await panel.goto("/admin/legal/privacidad");
    const texto = panel.locator("#texto:visible");
    await texto.getByLabel("Texto", { exact: true }).filter({ visible: true }).fill(TEXTO_PRIVACIDAD);
    await texto.getByLabel("Texto completo y revisado").filter({ visible: true }).check();
    await texto.getByRole("button", { name: "Guardar" }).click();
    await expect(texto.getByRole("status")).toContainText("Guardado");
    const publicar = panel.locator("#publicar:visible");
    await publicar.getByLabel(/Confirmo que el texto guardado está revisado/).filter({ visible: true }).check();
    await publicar.getByRole("button", { name: "Publicar una versión nueva" }).click();
    await expect(publicar.getByRole("status")).toContainText("Publicada la versión v1");
  });

  test("revisar y publicar el borrador", async () => {
    await panel.goto("/admin/vista-previa");
    await expect(panel.getByText("Vista previa del borrador · no es la web publicada").filter({ visible: true })).toBeVisible();
    await expect(panel.getByText(ENTRADILLA).filter({ visible: true })).toBeVisible();

    await panel.goto("/admin/publicar");
    await expect(panel.getByText("Hay cambios listos para publicar").filter({ visible: true })).toBeVisible();
    await expect(panel.locator("#cambios:visible")).toContainText("Hero y cifras");
    await panel.getByLabel("Comentario (opcional, interno)").fill("Prueba E2E");
    await panel.getByLabel(/He revisado la vista previa/).filter({ visible: true }).check();
    await panel.getByRole("button", { name: "Publicar ahora" }).click();
    await expect(panel.locator("#publicar:visible").getByRole("status")).toContainText("Publicada la versión nº 2");
  });

  test("la web pública muestra lo publicado (caché invalidada)", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(ENTRADILLA)).toBeVisible();
    await expect(page.locator("#cierre").getByRole("link", { name: "Escribir un email" })).toHaveAttribute(
      "href",
      "mailto:organizacion@example.com",
    );
    await expect(page.locator("footer").getByRole("link", { name: "Privacidad" })).toBeVisible();
    await page.goto("/privacidad");
    await expect(page.getByRole("heading", { name: "Responsable del tratamiento" })).toBeVisible();
  });

  test("enviar una propuesta con la preselección de /proponer", async ({ page }) => {
    await page.goto("/proponer?tipo=premio&via=juego&hoyo=12");
    const cargada = Date.now();
    await expect(page.locator(".origen")).toContainText("Vienes desde: En juego · Hoyo 12");
    await expect(page.getByRole("radio", { name: "Premio o concurso" })).toBeChecked();
    await page.getByRole("button", { name: "Enviar propuesta" }).click();
    await expect(page.locator(".resumen-errores")).toContainText("campos por revisar");
    await expect(page.getByText("Escribe tu nombre y apellidos.")).toBeVisible();

    await page.getByLabel("Nombre y apellidos").filter({ visible: true }).fill("Persona de Prueba");
    await page.getByLabel("Empresa o marca").filter({ visible: true }).fill(EMPRESA);
    await page.getByLabel("Email").filter({ visible: true }).fill("persona@example.com");
    await page.getByLabel("Tu propuesta").filter({ visible: true }).fill("Queremos poner un premio para la bola más cercana del hoyo 12.");
    await page.getByRole("checkbox", { name: /política de privacidad/ }).check();
    await page.waitForTimeout(Math.max(0, 3_500 - (Date.now() - cargada)));
    await page.getByRole("button", { name: "Enviar propuesta" }).click();
    await expect(page.getByRole("heading", { name: "Ya estás en juego." })).toBeVisible();
  });

  test("el formulario funciona sin JavaScript", async ({ browser }) => {
    const sinJs = await browser.newContext({ javaScriptEnabled: false });
    const page = await sinJs.newPage();
    await page.goto("/proponer");
    await page.getByLabel("Nombre y apellidos").filter({ visible: true }).fill("Persona Sin Js");
    await page.getByLabel("Empresa o marca").filter({ visible: true }).fill(`${EMPRESA} sin JS`);
    await page.getByLabel("Email").filter({ visible: true }).fill("sinjs@example.com");
    await page.getByRole("radio", { name: "Welcome pack" }).check();
    await page.getByLabel("Tu propuesta").filter({ visible: true }).fill("Propuesta enviada sin JavaScript para comprobar el formulario.");
    await page.getByRole("checkbox", { name: /política de privacidad/ }).check();
    await page.getByRole("button", { name: "Enviar propuesta" }).click();
    await expect(page.getByRole("heading", { name: "Ya estás en juego." })).toBeVisible();
    await sinJs.close();
  });

  test("bandeja: estado, nota y exportación CSV auditada", async () => {
    await panel.goto("/admin/propuestas");
    await panel.getByRole("link", { name: EMPRESA, exact: true }).click();
    await expect(panel.getByText("Queremos poner un premio").filter({ visible: true })).toBeVisible();
    await expect(panel.getByText("/proponer · tipo=PREMIO_CONCURSO · via=JUEGO · hoyo=12").filter({ visible: true })).toBeVisible();
    await panel.getByLabel("Nuevo estado").filter({ visible: true }).selectOption("CONTACTADA");
    await panel.getByRole("button", { name: "Cambiar el estado" }).click();
    await expect(panel.locator("#estado:visible").getByRole("status")).toContainText("Estado actualizado");
    await panel.getByLabel("Nota nueva").filter({ visible: true }).fill("Llamar después del verano.");
    await panel.getByRole("button", { name: "Añadir la nota" }).click();
    await expect(panel.locator("#notas:visible").getByRole("status")).toContainText("Nota guardada");

    const csv = await panel.request.get("/admin/propuestas/exportar");
    expect(csv.status()).toBe(200);
    expect(csv.headers()["content-disposition"]).toContain("attachment");
    const contenido = await csv.text();
    expect(contenido).toContain("Referencia;Recibida;Estado");
    expect(contenido).toContain(EMPRESA);

    await panel.goto("/admin/actividad");
    await expect(panel.getByText(/Exportación CSV de \d+ propuestas/).filter({ visible: true })).toBeVisible();
    await expect(panel.getByText("Versión nº 2 publicada").filter({ visible: true })).toBeVisible();
  });

  test("imágenes: subir, autorizar, publicar, servir y retirar", async ({ page }) => {
    const foto = await sharp({ create: { width: 1600, height: 1000, channels: 3, background: { r: 18, g: 56, b: 44 } } })
      .jpeg()
      .toBuffer();
    await panel.goto("/admin/imagenes");
    await panel.locator("#archivo:visible").setInputFiles({ name: "prueba.jpg", mimeType: "image/jpeg", buffer: foto });
    await panel.getByRole("button", { name: "Subir" }).click();
    await panel.waitForURL(/\/admin\/imagenes\/[a-f0-9]{32}$/);

    await panel.getByLabel("Texto alternativo (obligatorio para publicar)").fill("Ilustración de prueba en verde");
    await panel.locator("#datos:visible").getByRole("button", { name: "Guardar" }).click();
    await expect(panel.locator("#datos:visible").getByRole("status")).toContainText("Datos guardados");
    await panel.getByRole("button", { name: "Autorizar para publicar" }).click();
    await expect(panel.getByText("Autorizada para publicar.").filter({ visible: true })).toBeVisible();
    await panel.getByLabel("Usar en").filter({ visible: true }).selectOption({ label: "Portada · imagen de fondo" });
    await panel.getByRole("button", { name: "Asignar" }).click();
    await expect(panel.locator("#usos:visible").getByRole("status")).toContainText("Asignada");
    const paginaImagen = panel.url();

    await panel.goto("/admin/publicar");
    await panel.getByLabel(/He revisado la vista previa/).filter({ visible: true }).check();
    await panel.getByRole("button", { name: "Publicar ahora" }).click();
    await expect(panel.locator("#publicar:visible").getByRole("status")).toContainText("Publicada la versión nº 3");

    await page.goto("/");
    const src = await page.locator(".hero-foto img").getAttribute("src");
    expect(src).toMatch(/^\/medios\/[a-f0-9]{32}-1280\.webp$/);
    const imagen = await page.request.get(src ?? "");
    expect(imagen.status()).toBe(200);
    expect(imagen.headers()["content-type"]).toBe("image/webp");

    await panel.goto(paginaImagen);
    await panel.getByLabel("Confirmo que quiero retirarla.").filter({ visible: true }).check();
    await panel.getByRole("button", { name: "Retirar la imagen" }).click();
    await expect(panel.getByText(/Retirada y quitada de la web: publicada la versión nº 4/).filter({ visible: true })).toBeVisible();
    expect((await page.request.get(src ?? "")).status()).toBe(404);
    await page.goto("/");
    await expect(page.locator(".hero-foto")).toHaveCount(0);
  });

  test("tarea de retención: protegida con CRON_SECRET", async ({ request }) => {
    expect((await request.get("/api/cron/retencion")).status()).toBe(401);
    expect((await request.get("/api/cron/retencion", { headers: { Authorization: "Bearer incorrecto-1234567890" } })).status()).toBe(401);
    test.skip(SECRETO_CRON.length < 16, "Sin CRON_SECRET en el entorno de las pruebas");
    const respuesta = await request.get("/api/cron/retencion", { headers: { Authorization: `Bearer ${SECRETO_CRON}` } });
    expect(respuesta.status()).toBe(200);
    expect(await respuesta.json()).toMatchObject({ ok: true });
  });

  test("cerrar sesión y volver a entrar con contraseña y TOTP", async () => {
    await panel.goto("/admin");
    await panel.getByRole("button", { name: "Cerrar sesión" }).click();
    await panel.waitForURL("**/admin/login");
    await sinErroresGraves(panel);
    await panel.getByLabel("Email").filter({ visible: true }).fill(ADMIN.email);
    await panel.getByLabel("Contraseña").filter({ visible: true }).fill(ADMIN.contrasena);
    await panel.getByRole("button", { name: "Continuar" }).click();
    await panel.getByLabel("Código", { exact: true }).filter({ visible: true }).fill(await codigoFresco(process.env.E2E_TOTP ?? ""));
    await panel.getByRole("button", { name: "Entrar" }).click();
    await panel.waitForURL(/\/admin$/);
  });
});
