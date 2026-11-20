# Despliegue en VPS

El despliegue de produccion usa tres contenedores:

- `web`: React compilado y servido por Caddy, con HTTPS automatico.
- `api`: ASP.NET Core 8, migraciones y autenticacion JWT.
- `db`: SQL Server 2022 con almacenamiento persistente.

La API y SQL Server no publican puertos hacia Internet. Solo Caddy expone los
puertos 80 y 443.

## 1. Requisitos del VPS

- Ubuntu 22.04 o 24.04 de 64 bits.
- Docker Engine con el complemento Docker Compose.
- Recomendado: 4 GB de RAM, 2 CPU y 25 GB libres.
- Puertos TCP 80 y 443 abiertos; UDP 443 es opcional para HTTP/3.
- Un dominio con un registro `A` apuntando a la IP del VPS para HTTPS publico.

SQL Server necesita al menos 2 GB de memoria disponible. El archivo de
produccion usa la edicion Express, gratuita y limitada a bases de 10 GB.

## 2. Preparar secretos y usuarios

En la raiz del proyecto:

```bash
cp .env.production.example .env.production
nano .env.production
chmod 600 .env.production
```

Completa obligatoriamente:

- `APP_DOMAIN`: dominio publico. Sin dominio puede usarse
  `http://IP_PUBLICA_DEL_VPS`, pero no tendra HTTPS valido.
- `MSSQL_SA_PASSWORD`: contraseña robusta para SQL Server.
- `JWT_SIGNING_KEY`: secreto aleatorio de al menos 32 bytes. Puede generarse con
  `openssl rand -base64 48`.
- `ADMIN_NAME`, `ADMIN_EMAIL` y `ADMIN_PASSWORD`.
- `GEMINI_API_KEY` si el asistente usara Gemini.

Los cuatro bloques `INITIAL_USER_*` permiten crear cuentas adicionales en el
primer arranque. Los roles aceptados son:

- `ADMIN`
- `JEFE_PROGRAMA`
- `COORDINADORA`
- `DOCENTE`
- `ESTUDIANTE`
- `SOLICITANTE`

Deja completamente vacio cualquier bloque que no necesites. Las cuentas son
idempotentes: reiniciar los contenedores no las duplica ni restablece sus claves.
Despues del primer acceso, el administrador puede crear mas usuarios desde
**Usuarios y roles**.

`SEED_DEMO_DATA` debe permanecer en `false` en produccion. Esto crea usuarios y
catalogos necesarios, pero evita cargar empresas, solicitudes y casos ficticios.
Si se restaura una base local, el arranque tambien desactiva las cuentas de
demostracion conocidas sin borrar sus registros historicos.

## 3. Iniciar la aplicacion

```bash
docker compose --env-file .env.production -f compose.production.yml config
docker compose --env-file .env.production -f compose.production.yml up -d --build
docker compose --env-file .env.production -f compose.production.yml ps
```

La primera ejecucion puede tardar varios minutos mientras descarga las imagenes,
inicia SQL Server y aplica las migraciones.

Comprobar el sistema:

```bash
curl -f https://TU_DOMINIO/health
docker compose --env-file .env.production -f compose.production.yml logs --tail=100 api
```

El endpoint `/health` debe responder `Healthy`. Luego abre el dominio e inicia
sesion con `ADMIN_EMAIL` y `ADMIN_PASSWORD`.

## 4. Copias de seguridad

Dar permiso al script una sola vez:

```bash
chmod +x deploy/backup.sh
```

Crear un respaldo:

```bash
./deploy/backup.sh
```

Los archivos `.bak` se guardan en `backups/`, una carpeta ignorada por Git.
Copialos tambien a un almacenamiento externo al VPS.

Restaurar un respaldo reemplaza la base actual y requiere una confirmacion
explicita:

```bash
chmod +x deploy/restore.sh
RESTORE_CONFIRM=YES ./deploy/restore.sh backups/ConsultorioContable-FECHA.bak
```

## 5. Actualizar una version

Antes de actualizar, crea un respaldo. Luego:

```bash
git pull
docker compose --env-file .env.production -f compose.production.yml up -d --build
docker image prune -f
```

La API aplica automaticamente las migraciones pendientes al arrancar.

## 6. Operacion y diagnostico

```bash
# Estado
docker compose --env-file .env.production -f compose.production.yml ps

# Registros recientes
docker compose --env-file .env.production -f compose.production.yml logs --tail=200

# Seguir registros de la API
docker compose --env-file .env.production -f compose.production.yml logs -f api

# Reiniciar servicios
docker compose --env-file .env.production -f compose.production.yml restart
```

No publiques el puerto `1433` de SQL Server ni el `8080` de la API. Tampoco
subas `.env.production` al repositorio.

