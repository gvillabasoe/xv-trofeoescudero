/**
 * Cloudflare Turnstile: PREPARADO Y DESACTIVADO (D-ANTISPAM). Es un servicio externo nuevo y necesita tu
 * aprobación. Solo se activa si existen TURNSTILE_SECRET_KEY y NEXT_PUBLIC_TURNSTILE_SITE_KEY.
 * Mientras tanto protegen el formulario: límite de envíos por huella HMAC, campo trampa y trampa de tiempo.
 */
type Variables = Readonly<Record<string, string | undefined>>;

export function turnstileActivo(env: Variables = process.env): boolean {
  return Boolean(env.TURNSTILE_SECRET_KEY && env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
}

export async function verificarTurnstile(
  token: string,
  env: Variables = process.env,
  peticion: typeof fetch = fetch,
): Promise<boolean> {
  if (!turnstileActivo(env)) return true;
  if (!token) return false;
  try {
    const respuesta = await peticion("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY ?? "", response: token }),
      signal: AbortSignal.timeout(8000),
    });
    const datos = (await respuesta.json()) as { success?: boolean };
    return datos.success === true;
  } catch {
    return false;
  }
}
