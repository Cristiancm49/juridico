# LegalDesk

Sistema web para gestionar solicitudes, expedientes y procesos jurídicos de KAFA y Asociados.

La aplicación usa JavaScript, React, Node.js, Fastify, PostgreSQL y consultas SQL directas. No utiliza TypeScript ni ORM.

## Requisitos

- Node.js 22.12 o superior
- npm
- Docker Desktop para PostgreSQL y el almacenamiento privado MinIO

## Preparación local

1. Copiar `.env.example` como `.env` y cambiar la contraseña inicial.
2. Ejecutar `npm install`.
3. Iniciar PostgreSQL y MinIO con `docker compose up -d`.
4. Ejecutar `npm run db:migrate`.
5. Ejecutar `npm run db:seed`.
6. Iniciar el sistema con `npm run dev`.

`npm run dev` inicia la interfaz, el API y el trabajador de alertas. En una ejecución separada puede iniciarse solamente el trabajador con `npm run worker`.

La interfaz estará en `http://localhost:5173` y el API en `http://localhost:3100`.
La consola local de almacenamiento estará en `http://localhost:59001`; no debe exponerse en producción.

## Estructura

- `apps/web`: interfaz React.
- `apps/api`: API, autenticación y consultas SQL.
- `apps/api/db/migrations`: migraciones SQL versionadas.
- `docs`: análisis funcional y técnico.

Antes de añadir una funcionalidad, revisar [docs/CONTEXTO_PROYECTO.md](docs/CONTEXTO_PROYECTO.md). Es el resumen vivo de arquitectura, base de datos, rutas, permisos, convenciones y estado del backlog.

Documentación de entrega:

- [Manual técnico](docs/MANUAL_TECNICO.md)
- [Manual de usuario](docs/MANUAL_USUARIO.md)
- [Matriz de aceptación](docs/MATRIZ_ACEPTACION.md)

Para generar un respaldo local de PostgreSQL y MinIO ejecuta `npm run backup`. La restauración exige destinos explícitos y se documenta en el manual técnico.

## Seguridad inicial

- Contraseñas protegidas con Argon2id.
- Sesiones opacas guardadas como hash en PostgreSQL.
- Cookie de sesión `HttpOnly` y `SameSite=Lax`.
- Verificación de permisos en cada endpoint protegido.
- Consultas parametrizadas para evitar inyección SQL.
- Registro de accesos y cambios administrativos.
- Edición administrativa de nombre, correo, roles y contraseña temporal.
- Cambio personal de contraseña verificando la contraseña actual.
- Cierre automático de las demás sesiones después de cambiar la contraseña.
- Contraseña temporal obligatoria para cuentas creadas o restablecidas por un administrador.
- Bitácora de auditoría con filtros y paginación.
