# Despliegue junto a SaelSoft en Contabo

Este repositorio se despliega como una aplicacion independiente en el VPS que ya
publica `nexosoft.tech`. No reemplaza SaelSoft ni abre nuevamente los puertos 80
y 443.

La direccion prevista para el consultorio es:

```text
https://consultorio.nexosoft.tech
```

## Arquitectura

- `web`: React compilado y servido por Nginx en la red Docker compartida.
- `api`: ASP.NET Core 8 en el puerto interno `8080`.
- `db`: SQL Server 2022 Express, accesible solo desde la red interna.
- `shared_proxy`: red externa compartida con el Nginx central de SaelSoft.

Los alias publicados en `shared_proxy` son:

- `consultorio-frontend`
- `consultorio-api`

El proxy central es el unico contenedor que publica 80 y 443.

## 1. DNS

Crea en Contabo un registro `A`:

```text
Nombre: consultorio
Destino: 169.58.135.0
```

El certificado actual de `nexosoft.tech` y `www.nexosoft.tech` no incluye este
nuevo subdominio. Certbot debe emitir uno adicional.

## 2. Clonar el segundo repositorio

En el VPS, usa una carpeta separada de SaelSoft:

```bash
cd /opt
sudo git clone URL_DEL_REPOSITORIO consultorio-contable
sudo chown -R "$USER":"$USER" /opt/consultorio-contable
cd /opt/consultorio-contable
```

La estructura esperada comienza directamente en la raiz:

```text
backend/
frontend/
bd/
deploy/
compose.production.yml
package.json
```

No debe existir otra carpeta `consultorio-contable/consultorio-contable`.

## 3. Red compartida

SaelSoft ya utiliza esta red. El comando es idempotente y solo debe crearla si
no existe:

```bash
docker network inspect shared_proxy >/dev/null 2>&1 || \
  docker network create shared_proxy
```

## 4. Secretos y usuarios

```bash
cp .env.production.example .env.production
nano .env.production
chmod 600 .env.production
```

Configura SQL Server, JWT, Gemini, el administrador y los usuarios iniciales.
Genera el secreto JWT con:

```bash
openssl rand -base64 48
```

`SEED_DEMO_DATA` debe mantenerse en `false`. Si se restaura la base local, las
cuentas demostrativas conocidas se desactivan sin borrar el historial.

## 5. Iniciar el consultorio

Desde `/opt/consultorio-contable`:

```bash
docker compose --env-file .env.production -f compose.production.yml config
docker compose --env-file .env.production -f compose.production.yml up -d --build
docker compose --env-file .env.production -f compose.production.yml ps
```

SQL Server y la API no publican puertos en el host. El frontend y la API quedan
disponibles para el Nginx central mediante `shared_proxy`.

## 6. Configurar el proxy central

Define la ruta real del proxy de SaelSoft. Ejemplo:

```bash
CONSULTORIO_DIR=/opt/consultorio-contable
PROXY_DIR=/opt/SaelSoft/deploy/proxy
```

Primero instala la configuracion HTTP:

```bash
cp "$CONSULTORIO_DIR/deploy/proxy/consultorio.http.conf" \
  "$PROXY_DIR/nginx/conf.d/consultorio.conf"
cd "$PROXY_DIR"
docker compose exec nginx nginx -t
docker compose exec nginx nginx -s reload
```

Emite el certificado del nuevo subdominio:

```bash
docker compose --profile tools run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d consultorio.nexosoft.tech \
  --email TU_CORREO \
  --agree-tos --no-eff-email
```

Activa HTTPS:

```bash
cp "$CONSULTORIO_DIR/deploy/proxy/consultorio.https.conf" \
  "$PROXY_DIR/nginx/conf.d/consultorio.conf"
docker compose exec nginx nginx -t
docker compose exec nginx nginx -s reload
```

Esto no modifica la configuracion de `nexosoft.tech`; agrega un bloque separado
para `consultorio.nexosoft.tech`.

## 7. Restaurar la base actual

Copia el `.bak` dentro de `/opt/consultorio-contable/backups/` y ejecuta:

```bash
chmod +x deploy/backup.sh deploy/restore.sh
RESTORE_CONFIRM=YES ./deploy/restore.sh \
  backups/ConsultorioContable-pre-vps-20261119-221805.bak
```

La restauracion conserva usuarios, roles, solicitudes, casos y documentos. Al
reiniciarse, la API crea el nuevo administrador definido en `.env.production`.

## 8. Validacion

```bash
curl -f https://consultorio.nexosoft.tech/api/health
docker compose --env-file .env.production -f compose.production.yml logs --tail=100 api
```

La primera orden debe responder `Healthy`.

## 9. Actualizaciones

```bash
cd /opt/consultorio-contable
./deploy/backup.sh
git pull
docker compose --env-file .env.production -f compose.production.yml up -d --build
```

No ejecutes `docker compose down -v`: la opcion `-v` elimina los volumenes de
SQL Server.

