# Consultorio Contable

Sistema de Asesoría y Apoyo Contable de la Universidad de la Amazonia.

## Tecnologías

- Backend: .NET 8, ASP.NET Core, Entity Framework Core e Identity/JWT.
- Frontend: React 19 y Vite.
- Base de datos: SQL Server 2022 en Docker.
- Arquitectura: cebolla (`Domain`, `Application`, `Infrastructure`, `Api`).

## Asistente de casos

Los usuarios con rol administrador, coordinadora o jefe de programa pueden
consultar los casos en lenguaje natural desde `/asistente`. El asistente es de
solo lectura y responde con datos actuales de SQL Server sobre casos pendientes,
activos, cerrados, sin asignar y retrasados. Un caso se considera retrasado si
permanece abierto y no registra actividad durante 30 días o más.

También permite consultar:

- casos asignados a docentes o estudiantes;
- carga activa por responsable y quién tiene mayor carga;
- sesiones realizadas y próximas;
- cantidades de compromisos abiertos por sesión;
- documentos faltantes y versiones registradas;
- solicitudes pendientes de convertirse en caso;
- comparaciones por área, periodo, responsable, estado o mes.

Gemini puede interpretar expresiones más naturales antes de que el backend
aplique los filtros. La IA no tiene acceso directo a SQL Server y solo recibe
la pregunta, la fecha actual y los catálogos de áreas y periodos; los casos,
listados de personas, nombres de solicitantes y credenciales permanecen en el backend. Si Gemini no está
configurado o no responde, el clasificador local continúa funcionando.

Los documentos faltantes usan una regla operativa explícita: todo caso debe
tener al menos un soporte y los casos terminales deben incluir un informe final.
Los compromisos se reportan como cantidades por sesión porque el modelo actual
no almacena todavía tareas individuales con fecha y estado.

Para activar Gemini, crea una clave en Google AI Studio y guárdala en los
secretos locales de .NET. Este valor queda fuera del repositorio:

```powershell
dotnet user-secrets set "Gemini:ApiKey" "TU_CLAVE" --project backend/src/ConsultorioContable.Api
npm run dev
```

También se admiten las variables `GEMINI_API_KEY` y `Gemini__ApiKey`. No guardes
la clave en `appsettings.json`.

## Estructura

```text
consultorio-contable/
├── backend/
│   ├── src/
│   │   ├── ConsultorioContable.Domain/
│   │   ├── ConsultorioContable.Application/
│   │   ├── ConsultorioContable.Infrastructure/
│   │   └── ConsultorioContable.Api/
│   ├── tests/
│   └── ConsultorioContable.sln
├── frontend/
├── bd/
│   ├── docker-compose.yml
│   └── initial.sql
├── package.json
└── README.md
```

- `backend`: API, capas de arquitectura cebolla y pruebas de .NET.
- `frontend`: interfaz React/Vite.
- `bd`: configuración de SQL Server y script SQL de referencia.
- raíz: comandos que coordinan todo el proyecto.

## Base de datos

El modelo mantiene las 23 tablas de negocio definidas para el Consultorio
Contable, además de las tablas auxiliares de ASP.NET Core Identity y la tabla
de sesiones operativas. Entity Framework Core es la fuente de verdad del
esquema.

- Las migraciones están en `backend/src/ConsultorioContable.Infrastructure/Persistence/Migrations`.
- `bd/initial.sql` es el script idempotente completo generado desde esas migraciones.
- La API aplica automáticamente las migraciones pendientes en desarrollo.

## Preparar el proyecto

Desde esta carpeta:

```powershell
npm install
dotnet tool restore --tool-manifest backend/.config/dotnet-tools.json
dotnet restore backend/ConsultorioContable.sln
npm run db:up
```

La API aplica las migraciones y carga los datos locales al iniciar.

## Ejecutar

```powershell
npm run dev
```

- Frontend: `http://localhost:5174`
- API: `http://localhost:5298`
- Swagger: `http://localhost:5298/swagger`
- SQL Server: `localhost,14333`

## Desplegar en un VPS

El repositorio incluye un despliegue de produccion con Docker Compose, SQL
Server persistente, migraciones y creacion segura de usuarios iniciales. En el
VPS de NexoSoft se conecta a la red externa `shared_proxy`; el Nginx central ya
existente publica `consultorio.nexosoft.tech` y administra HTTPS.

1. Copia `.env.production.example` como `.env.production`.
2. Configura el dominio, contraseñas, JWT, Gemini y usuarios iniciales.
3. Ejecuta:

```bash
docker compose --env-file .env.production -f compose.production.yml up -d --build
```

Consulta [DEPLOYMENT.md](DEPLOYMENT.md) para los requisitos, copias de seguridad,
actualizaciones y diagnostico.

## Verificar

```powershell
npm run verify
```

## Credenciales locales

- Usuario: `admin@consultorio.local`
- Contraseña: `Admin_Local_2026!`

Las credenciales incluidas son exclusivamente para desarrollo local. En producción deben reemplazarse mediante secretos del entorno.
