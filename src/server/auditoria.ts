import type { Prisma } from "@/generated/prisma/client";
import type { ConsultasBD } from "@/server/db";

export type AccionAuditada = Prisma.AuditLogCreateInput["action"];

/**
 * Registro de actividad del panel (AuditLog, solo inserción). El resumen nunca lleva emails, teléfonos,
 * mensajes completos, contraseñas, tokens ni IP: solo qué se hizo y sobre qué.
 */
export async function auditar(
  bd: ConsultasBD,
  evento: { actorId: string | null; accion: AccionAuditada; entidad: string; entidadId?: string | null; resumen: string },
) {
  await bd.auditLog.create({
    data: {
      actorId: evento.actorId,
      actorType: evento.actorId ? "USER" : "SYSTEM",
      action: evento.accion,
      entityType: evento.entidad,
      entityId: evento.entidadId ?? null,
      summary: evento.resumen.slice(0, 500),
    },
  });
}

/** El borrador ya no coincide con lo publicado: el panel lo indica hasta la próxima publicación. */
export async function marcarCambiosSinPublicar(bd: ConsultasBD) {
  await bd.siteState.updateMany({ where: { id: 1, hasUnpublishedChanges: false }, data: { hasUnpublishedChanges: true } });
}
