# Contexto vivo de LegalDesk

Última actualización: 5 de agosto de 2026  
Estado: Sprint 1 completado; Sprint 2 en curso

> Leer este archivo antes de implementar una funcionalidad. Actualizarlo cuando cambien la arquitectura, la base de datos, los permisos, las rutas o el estado del backlog.

## 1. Propósito

LegalDesk es una aplicación web interna para KAFA y Asociados. Centraliza usuarios, solicitudes de asesoría, expedientes, responsables, actuaciones, documentos, tareas, vencimientos, alertas y reportes.

La primera versión prioriza simplicidad, trazabilidad y seguridad. No incluye portal ciudadano, integración con la Rama Judicial, aplicación móvil nativa ni inteligencia artificial.

## 2. Decisiones que no deben cambiarse sin aprobación

- JavaScript puro en frontend y backend; no TypeScript.
- React con Vite para la interfaz.
- Node.js con Fastify para el API.
- PostgreSQL como única base de datos relacional.
- Acceso a PostgreSQL mediante `pg` y SQL parametrizado; no ORM.
- Migraciones escritas como archivos `.sql` versionados.
- Monolito modular en un solo repositorio; no microservicios.
- Autenticación propia mediante sesiones opacas en cookies; no JWT en el navegador.
- Archivos futuros en almacenamiento privado compatible con S3; PostgreSQL guardará solo metadatos.

## 3. Topología local

```text
React/Vite :5173  ->  API Fastify :3100  ->  PostgreSQL Docker :55432
```

- URL de la aplicación: `http://127.0.0.1:5173`
- Salud del API: `http://127.0.0.1:3100/api/health`
- Las credenciales locales se leen desde `.env`; nunca documentar contraseñas reales aquí.

## 4. Estructura relevante

```text
apps/
  api/
    db/migrations/       # cambios versionados de PostgreSQL
    scripts/             # migración y datos iniciales
    src/
      routes/            # endpoints por módulo
      app.js             # plugins, rutas y errores
      auth.js            # autenticación y autorización
      audit.js           # escritura de bitácora
      db.js              # pool y transacciones
      security.js        # tokens y validaciones
      server.js          # inicio del servicio
    test/                # pruebas con node:test
  web/
    src/
      auth/              # usuario y sesión en React
      components/        # componentes compartidos
      pages/             # pantallas por módulo
      api.js             # cliente HTTP con cookies
      App.jsx            # selección de página protegida
      router.js          # navegación mínima sin dependencia externa
      styles.css         # diseño global y adaptable
docs/
  CONTEXTO_PROYECTO.md   # este documento
  analisis-y-plan-legaldesk.md
```

No editar `node_modules`, `apps/web/dist` ni `tmp`.

## 5. Convenciones del backend

1. Cada módulo registra sus rutas dentro de `apps/api/src/routes`.
2. Todas las entradas deben tener esquema de validación Fastify.
3. Toda consulta debe usar parámetros `$1`, `$2`, etc.; no concatenar datos del usuario.
4. Las operaciones de varios pasos usan `withTransaction`.
5. Los endpoints privados usan `authenticate`.
6. Los endpoints restringidos añaden `requirePermission('codigo')`.
7. Cambios sensibles escriben un evento mediante `writeAudit`.
8. Los errores esperados definen `statusCode`; el manejador global evita filtrar detalles internos.
9. No borrar físicamente información jurídica desde la interfaz. Usuarios se desactivan.

## 6. Convenciones del frontend

1. Cada pantalla vive en `apps/web/src/pages`.
2. Las llamadas al API pasan por `apiFetch`; no usar `fetch` directamente en páginas.
3. La sesión se obtiene de `AuthContext`; no guardar credenciales ni datos jurídicos en `localStorage`.
4. Los botones se ocultan según `can('permiso')`, pero el backend siempre vuelve a comprobarlo.
5. Éxitos y errores se presentan con Sonner.
6. Formularios y modales deben funcionar con teclado, etiquetas visibles y diseño móvil.
7. Añadir rutas al mapa de `App.jsx` y enlaces permitidos en `AppLayout.jsx`.

## 7. Base de datos actual

Migraciones aplicadas: `001_security.sql`, `002_password_policy.sql`, `003_intake_foundation.sql` y `004_legal_requests.sql`.

Tablas:

- `users`: cuenta, correo normalizado, nombre, contraseña Argon2id, estado, último acceso y obligación de cambiar contraseña temporal.
- `roles`: administrador, abogado, practicante y administrativo.
- `permissions`: acciones atómicas agrupadas por módulo.
- `user_roles`: relación de usuarios y roles.
- `role_permissions`: relación de roles y permisos.
- `sessions`: hash del token, vencimiento y datos del acceso.
- `audit_logs`: usuario, acción, entidad, detalles, IP, navegador y fecha.
- `people`: personas naturales o jurídicas, documento único, contacto, ubicación, notas y estado.
- `legal_areas`: catálogo inicial de áreas jurídicas, orden y estado.
- `priorities`: cuatro niveles de prioridad con orden, color y estado.
- `request_statuses`: estados controlados de una solicitud y su presentación visual.
- `legal_requests`: consecutivo, persona, clasificación, asunto, descripción, canal, fecha y estado actual.
- `legal_request_status_history`: transición, comentario, responsable y fecha de cada cambio de estado.
- `schema_migrations`: migraciones ya aplicadas.

Toda nueva tabla o columna requiere una nueva migración numerada. No modificar una migración aplicada.

## 8. Autenticación y autorización

1. El usuario envía correo y contraseña a `/api/v1/auth/login`.
2. El backend normaliza el correo y verifica el hash Argon2id.
3. Se crea un token aleatorio; solo su SHA-256 se guarda en `sessions`.
4. El token real viaja en la cookie `legaldesk_session`, `HttpOnly` y `SameSite=Lax`.
5. `authenticate` carga al usuario y sus permisos en cada solicitud.
6. El cierre de sesión elimina la sesión en PostgreSQL.
7. El cambio personal de contraseña exige la contraseña actual y cierra las demás sesiones.
8. Las cuentas creadas o restablecidas por un administrador quedan con `must_change_password = TRUE`.
9. Mientras esa marca esté activa, el backend bloquea todos los módulos excepto perfil, cambio de contraseña y cierre de sesión.

Reglas de protección:

- Un usuario no puede desactivarse ni cambiar sus propios roles.
- El rol Administrador siempre conserva `users.manage` y `roles.manage`.
- Un usuario desactivado no puede usar sesiones existentes.

## 9. Permisos actuales

| Módulo | Permisos |
|---|---|
| Usuarios | `users.read`, `users.manage` |
| Seguridad | `roles.manage`, `audit.read` |
| Solicitudes | `requests.read`, `requests.write`, `requests.assign` |
| Expedientes | `cases.read`, `cases.write`, `cases.assign` |
| Seguimiento | `actions.write` |
| Documentos | `documents.read`, `documents.write` |
| Tareas | `tasks.read`, `tasks.write` |
| Reportes | `reports.read` |

La asignación inicial por rol está en `001_security.sql`. Cambios futuros se realizan desde la pantalla Roles y permisos.

Matriz inicial validada técnicamente:

| Rol | Alcance principal |
|---|---|
| Administrador | Todos los 16 permisos actuales. |
| Abogado | Solicitudes y expedientes completos, actuaciones, documentos, tareas y reportes. |
| Practicante | Registro de solicitudes, consulta de expedientes, actuaciones, documentos y tareas. |
| Administrativo | Consulta de usuarios, registro de solicitudes, consulta de expedientes, documentos, tareas y reportes. |

`npm run test:roles` verifica la matriz guardada en PostgreSQL, los permisos cargados en la sesión y respuestas `200/403` de rutas representativas para los cuatro roles. Crea y elimina sus propios usuarios temporales.

## 10. API implementada

| Método y ruta | Protección | Uso |
|---|---|---|
| `GET /api/health` | Pública | Salud del API y PostgreSQL |
| `POST /api/v1/auth/login` | Pública limitada | Iniciar sesión |
| `POST /api/v1/auth/logout` | Sesión | Cerrar sesión |
| `GET /api/v1/auth/me` | Sesión | Usuario y permisos actuales |
| `POST /api/v1/auth/change-password` | Sesión | Cambiar contraseña propia |
| `GET /api/v1/users` | `users.read` | Listar usuarios y roles |
| `POST /api/v1/users` | `users.manage` | Crear usuario |
| `PATCH /api/v1/users/:id` | `users.manage` | Editar, activar, desactivar o restablecer contraseña |
| `GET /api/v1/roles` | Sesión | Consultar roles |
| `GET /api/v1/roles/permissions` | `roles.manage` | Consultar permisos disponibles |
| `PATCH /api/v1/roles/:id` | `roles.manage` | Editar rol y permisos |
| `GET /api/v1/audit` | `audit.read` | Consultar bitácora con acción, texto, fechas y paginación |
| `GET /api/v1/people` | `requests.read` | Buscar y paginar personas por texto y estado |
| `GET /api/v1/people/:id` | `requests.read` | Consultar la ficha de una persona |
| `POST /api/v1/people` | `requests.write` | Registrar persona natural o jurídica |
| `PATCH /api/v1/people/:id` | `requests.write` | Editar, activar o desactivar una persona |
| `GET /api/v1/catalogs/legal-areas` | `requests.read` | Consultar áreas jurídicas |
| `GET /api/v1/catalogs/priorities` | `requests.read` | Consultar prioridades |
| `GET /api/v1/catalogs/request-statuses` | `requests.read` | Consultar estados de solicitud |
| `GET /api/v1/requests` | `requests.read` | Buscar y filtrar solicitudes con paginación |
| `GET /api/v1/requests/:id` | `requests.read` | Consultar una solicitud y su historial de estados |
| `POST /api/v1/requests` | `requests.write` | Registrar una solicitud con consecutivo automático |
| `PATCH /api/v1/requests/:id` | `requests.write` | Editar y cambiar el estado mediante transiciones permitidas |

## 11. Pantallas implementadas

- Inicio de sesión.
- Resumen inicial del proyecto.
- Usuarios: búsqueda, creación, edición, roles, contraseña temporal y activación.
- Roles y permisos: consulta y edición.
- Cambio personal de contraseña.
- Cambio obligatorio de contraseña temporal.
- Auditoría: búsqueda, acción, rango de fechas y paginación.
- Personas y clientes: búsqueda, filtro por estado, registro, edición y activación/desactivación.
- Áreas y prioridades: consulta adaptable de los catálogos iniciales.
- Solicitudes: búsqueda, filtros, registro, edición, clasificación y línea de tiempo de estados.

## 12. Estado del backlog

### Sprint 1 - seguridad

- [x] Estructura, PostgreSQL y migraciones.
- [x] Inicio y cierre de sesión.
- [x] Usuarios, roles y permisos.
- [x] Edición de usuarios.
- [x] Cambio personal de contraseña.
- [x] Contraseña temporal obligatoria en el siguiente ingreso.
- [x] Pantalla de auditoría con filtros.
- [x] Pruebas finales por rol.
- [x] Primera versión estable local (`0.1.0`).

### Sprint 2 - siguiente

- [x] Personas/clientes.
- [x] Áreas jurídicas y prioridades (consulta; catálogo inicial controlado).
- [x] Solicitudes de asesoría.
- [x] Estados de solicitud e historial de transiciones.
- [ ] Conversión de solicitud a expediente.
- [ ] Consulta y edición básica de expedientes.

Los sprints posteriores están detallados en `docs/analisis-y-plan-legaldesk.md`.

## 13. Cómo añadir una nueva funcionalidad

1. Confirmar requerimiento, permiso y criterio de aceptación.
2. Diseñar tabla/columnas e índice; crear migración nueva si corresponde.
3. Crear consultas SQL parametrizadas y ruta backend.
4. Añadir autenticación, permiso y auditoría.
5. Implementar página o componente React usando `apiFetch`.
6. Añadir navegación solo para usuarios autorizados.
7. Probar camino exitoso, validaciones y acceso denegado.
8. Ejecutar `npm test`, `npm run build` y `npm audit --omit=dev`.
9. Actualizar este documento y el estado del backlog.

## 14. Comandos habituales

```bash
docker compose up -d postgres
npm run db:migrate
npm run db:seed
npm run dev
npm test
npm run test:intake
npm run test:requests
npm run test:roles
npm run build
```

## 15. Decisiones todavía abiertas

- Campos definitivos de solicitudes y expedientes.
- Confirmación funcional de las siete áreas jurídicas y cuatro prioridades iniciales antes de permitir su edición.
- Confirmación funcional de las transiciones iniciales de solicitudes: `received -> in_review/rejected`, `in_review -> approved/rejected`, `approved -> in_review`; `rejected` y `converted` son terminales.
- Política definitiva de conservación de datos y documentos.
- Proveedor de PostgreSQL y almacenamiento S3 para producción.
- Matriz de permisos validada por KAFA y Asociados.

## 16. Registro breve de cambios

- 4 de agosto de 2026: base React/Fastify/PostgreSQL, usuarios, roles, permisos y sesiones.
- 4 de agosto de 2026: edición de usuarios y cambio personal de contraseña.
- 4 de agosto de 2026: contexto vivo, contraseña temporal obligatoria y consulta de auditoría.
- 5 de agosto de 2026: matriz de los cuatro roles validada contra PostgreSQL y rutas protegidas; cierre técnico del Sprint 1.
- 5 de agosto de 2026: personas/clientes, áreas jurídicas y prioridades implementadas; inicio del Sprint 2.
- 5 de agosto de 2026: registro, clasificación, consulta e historial de estados de solicitudes implementados.
