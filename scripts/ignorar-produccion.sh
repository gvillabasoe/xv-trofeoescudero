#!/usr/bin/env bash
# Fase 3: no existe producción. Los despliegues de producción (rama main) se omiten.
# Convención de Vercel para ignoreCommand: exit 0 = omitir el build; exit 1 = construir.
if [ "${VERCEL_ENV:-}" = "production" ]; then
  echo "Fase 3: build de producción omitido a propósito (no hay producción todavía)."
  exit 0
fi
echo "Despliegue ${VERCEL_ENV:-desconocido}: se construye."
exit 1
