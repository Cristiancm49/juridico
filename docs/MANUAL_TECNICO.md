# Manual técnico de LegalDesk

Última actualización: 6 de agosto de 2026

## 1. Arquitectura

LegalDesk es un monolito modular. La interfaz React/Vite consume una API Node.js/Fastify; PostgreSQL conserva datos, sesiones, auditoría y la cola `pg-boss`; MinIO conserva archivos privados compatibles con S3. El navegador nunca recibe credenciales de base de datos o almacenamiento.

Puertos locales:

- Web: `5173`.
- API: `3100`.
- PostgreSQL: `55432` en el host, `5432` en Docker.
- MinIO: `59000`; consola administrativa local: `59001`.

Las decisiones, tablas, rutas y permisos vigentes están resumidos en [CONTEXTO_PROYECTO.md](CONTEXTO_PROYECTO.md).

## 2. Preparación local

Requisitos: Node.js 22.12 o superior, npm, Docker Desktop y PowerShell.

```powershell
Copy-Item .env.example .env
npm install
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

Antes del primer inicio se deben cambiar `ADMIN_PASSWORD`, las credenciales de PostgreSQL y MinIO y cualquier secreto copiado del ejemplo. `.env` no se versiona.

## 3. Variables principales

| Variable | Uso |
|---|---|
| `NODE_ENV` | `development`, `test` o `production` |
| `API_PORT` | Puerto HTTP del API |
| `WEB_ORIGIN` | Origen exacto permitido por CORS |
| `TRUST_PROXY` | `true` solo cuando el API está aislado detrás del proxy autorizado |
| `DATABASE_URL` | Conexión PostgreSQL |
| `SESSION_HOURS` | Vigencia de sesión |
| `COOKIE_SECURE` | Debe ser `true` detrás de HTTPS |
| `S3_*` | Endpoint, región, bucket y credenciales privadas |
| `DOCUMENT_MAX_BYTES` | Límite máximo por documento |

## 4. Operación diaria

- Salud del API: `GET http://127.0.0.1:3100/api/health` debe responder `status: ok`.
- Estado de contenedores: `docker compose ps`.
- Logs locales: `docker compose logs postgres minio` y la salida de `npm run dev`.
- El trabajador de alertas forma parte de `npm run dev`; también puede iniciarse con `npm run worker`.
- Migraciones: ejecutar `npm run db:migrate` antes de iniciar una versión nueva. Son acumulativas y no se editan después de aplicarse.

## 5. Respaldo

`npm run backup` crea `backups/legaldesk-AAAAmmdd-HHMMSS` con:

- `postgres.dump`: copia PostgreSQL en formato personalizado.
- `objects/`: contenido del bucket privado.
- `manifest.json`: fecha, origen, cantidad de objetos y SHA-256 del dump.

El directorio `backups/` está excluido de Git. Un respaldo real debe copiarse cifrado a un destino distinto del servidor y someterse a la política de conservación aprobada por KAFA y Asociados.

Ejemplo con parámetros no locales:

```powershell
powershell -File scripts/backup.ps1 -PostgresContainer legaldesk-postgres -MinioContainer legaldesk-minio -Database legaldesk -DatabaseUser legaldesk -Bucket legaldesk-documents -S3AccessKey USUARIO -S3SecretKey SECRETO
```

## 6. Restauración

La restauración exige destinos explícitos y `-ConfirmRestore`. Si el destino existe, también exige `-Overwrite` y lo reemplaza completamente.

```powershell
powershell -File scripts/restore.ps1 `
  -BackupDir backups/legaldesk-20260805-120000 `
  -RestoreDatabase legaldesk_prueba_restore `
  -RestoreBucket legaldesk-prueba-restore `
  -ConfirmRestore
```

El script comprueba el SHA-256, restaura PostgreSQL, restaura los objetos y compara su cantidad con el manifiesto. Primero debe probarse en nombres temporales; solo después de la aprobación operativa se permite apuntar al destino real con `-Overwrite`.

## 7. Verificación de una versión

El comando recomendado ejecuta toda la aceptación técnica en orden:

```powershell
npm run verify
```

Su equivalente detallado es:

```powershell
npm test
npm run test:intake
npm run test:requests
npm run test:cases
npm run test:case-tracking
npm run test:actions
npm run test:documents
npm run test:tasks
npm run test:roles
npm run test:reports
npm run test:performance
npm run test:security
npm run test:backup
npm run build
npm audit --omit=dev
```

No se debe liberar una versión con una prueba fallida o una vulnerabilidad crítica/alta sin decisión documentada.

## 8. Producción y reversión

La configuración de producción para el VPS está preparada en `docker-compose.prod.yml`. El procedimiento operativo, DNS, secretos, proxy central, SSL, respaldo y actualización se encuentra en [DESPLIEGUE_VPS.md](DESPLIEGUE_VPS.md). El despliegue externo todavía requiere ejecutar ese procedimiento en el servidor.

Antes de producción se requiere:

1. HTTPS terminado en un proxy confiable, `COOKIE_SECURE=true` y `TRUST_PROXY=true` solo si el acceso directo al API está bloqueado.
2. Secretos fuertes gestionados fuera del repositorio.
3. PostgreSQL y almacenamiento S3 con cifrado, acceso privado y copias programadas.
4. Origen CORS exacto, red restringida para base de datos y consola S3 no pública.
5. Logs centralizados, alertas de salud, espacio y errores 5xx.
6. Ensayo de respaldo/restauración en el ambiente objetivo.

Para revertir código, se vuelve al artefacto o commit estable anterior. Las migraciones son hacia adelante: si una versión cambió datos, se restaura el respaldo previo en un destino comprobado; no se ejecutan borrados manuales improvisados.

## 9. Evidencia local de cierre

- Migración actual: `010_report_indexes.sql` (10 migraciones aplicadas).
- Restauración probada el 5 de agosto de 2026 en base y bucket temporales; ambos fueron eliminados después de validar.
- Rendimiento local: 1.000 expedientes y 2.000 tareas, resumen 36 ms y CSV 28 ms; umbral automatizado menor de 3 segundos.
- Auditoría de dependencias: 0 vulnerabilidades al cierre del Sprint 6.
