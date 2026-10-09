import type { Prisma } from "@/generated/prisma/client";
import type { ConsultasBD } from "@/server/db";

type AuditAction = Prisma.AuditLogCreateInput["action"];

/**
 * Eventos de seguridad en AuditLog. Nunca se guardan emails, contraseñas, códigos, tokens ni IP:
 * solo el usuario (si se conoce), la acción y un resumen sin datos personales.
 */
export async function auditarSeguridad(
  bd: ConsultasBD,
  evento: { actorId: string | null; accion: AuditAction; resumen: string; entidadId?: string | null },
) {
  await bd.auditLog.create({
    data: {
      actorId: evento.actorId,
      actorType: evento.actorId ? "USER" : "SYSTEM",
      action: evento.accion,
      entityType: "User",
      entityId: evento.entidadId ?? evento.actorId,
      summary: evento.resumen,
    },
  });
}
