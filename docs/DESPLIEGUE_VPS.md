# Despliegue de LegalDesk en el VPS

Objetivo: publicar LegalDesk en `https://legaldesk.nexosoft.tech`, dentro de `/opt/legaldesk`, reutilizando el Nginx y Certbot central de `/opt/nexotech/deploy/proxy` y la red Docker `shared_proxy`.

LegalDesk añade MinIO porque la gestión documental necesita almacenamiento privado. Solo el contenedor web entra en `shared_proxy`; backend, trabajador, PostgreSQL y MinIO permanecen en una red interna sin puertos del host.

## 1. Publicar el código en GitHub

En el equipo de desarrollo, el remoto debe apuntar al repositorio correcto:

```bash
git remote set-url origin https://github.com/Cristiancm49/juridico.git
git push -u origin main
```

No subas `.env`, `deploy/legaldesk.env`, respaldos ni claves SSH.

## 2. Preparar DNS

Crea un registro `A`:

```text
Nombre: legaldesk
Destino: IP pública del VPS
TTL: 300 o automático
```

Espera a que `dig +short legaldesk.nexosoft.tech` devuelva la IP del VPS antes de solicitar el certificado.

## 3. Dar acceso del VPS al repositorio

Se recomienda una deploy key exclusiva para LegalDesk, distinta de la usada por Nexotech:

```bash
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519_legaldesk -C "legaldesk-vps" -N ""
cat ~/.ssh/id_ed25519_legaldesk.pub
```

Añade la clave pública en GitHub → repositorio `Cristiancm49/juridico` → Settings → Deploy keys, solo lectura. Luego configura el alias:

```bash
cat >> ~/.ssh/config <<'EOF'
Host github-legaldesk
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_legaldesk
  IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config
ssh -T git@github-legaldesk
```

## 4. Clonar en el VPS

```bash
sudo mkdir -p /opt/legaldesk
sudo chown "$USER":"$USER" /opt/legaldesk
git clone git@github-legaldesk:Cristiancm49/juridico.git /opt/legaldesk
cd /opt/legaldesk
```

Comprueba o crea la red compartida:

```bash
docker network inspect shared_proxy >/dev/null 2>&1 || docker network create shared_proxy
```

## 5. Crear secretos

```bash
cd /opt/legaldesk
cp deploy/legaldesk.env.example deploy/legaldesk.env
openssl rand -hex 24
openssl rand -hex 32
openssl rand -base64 24
nano deploy/legaldesk.env
chmod 600 deploy/legaldesk.env
```

Reemplaza todos los valores `CAMBIAR_...`. Usa el primer hexadecimal como `POSTGRES_PASSWORD` y exactamente el mismo texto dentro de `DATABASE_URL`; al ser hexadecimal no necesita codificación URL. Usa el segundo como `S3_SECRET_KEY` y la salida restante como contraseña inicial del administrador.

Mantén estos valores:

```text
WEB_ORIGIN=https://legaldesk.nexosoft.tech
COOKIE_SECURE=true
TRUST_PROXY=true
S3_ENDPOINT=http://storage:9000
```

LegalDesk usa sesiones opacas, no JWT; no requiere `JWT_SECRET`.

## 6. Validar y arrancar los contenedores

```bash
cd /opt/legaldesk
docker compose --env-file deploy/legaldesk.env -f docker-compose.prod.yml config --quiet
docker compose --env-file deploy/legaldesk.env -f docker-compose.prod.yml up -d --build
docker compose --env-file deploy/legaldesk.env -f docker-compose.prod.yml ps
```

La migración se ejecuta antes del backend. Deben quedar activos `postgres`, `storage`, `backend`, `alerts` y `web`; `migrate` debe aparecer como terminado correctamente.

Crea el administrador inicial una sola vez:

```bash
docker compose --env-file deploy/legaldesk.env -f docker-compose.prod.yml run --rm backend node scripts/seed.js
```

Después del primer ingreso cambia la contraseña desde la aplicación y elimina `ADMIN_PASSWORD` del archivo si ya no se volverá a ejecutar el seed.

## 7. Activar el sitio por HTTP

```bash
sudo cp /opt/legaldesk/deploy/proxy/legaldesk.http.conf \
  /opt/nexotech/deploy/proxy/nginx/conf.d/legaldesk.conf

cd /opt/nexotech/deploy/proxy
docker compose config --services
docker compose exec nginx nginx -t
docker compose exec nginx nginx -s reload
curl -I http://legaldesk.nexosoft.tech
```

Si el servicio central no se llama `nginx`, usa en esos dos comandos el nombre mostrado por `docker compose config --services`.

## 8. Solicitar SSL

Desde el proyecto del proxy central:

```bash
cd /opt/nexotech/deploy/proxy
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d legaldesk.nexosoft.tech \
  --email TU_CORREO_REAL \
  --agree-tos --no-eff-email
```

Solo después de que Certbot termine correctamente activa HTTPS:

```bash
sudo cp /opt/legaldesk/deploy/proxy/legaldesk.https.conf \
  /opt/nexotech/deploy/proxy/nginx/conf.d/legaldesk.conf
docker compose exec nginx nginx -t
docker compose exec nginx nginx -s reload
curl -I https://legaldesk.nexosoft.tech
```

La tarea de renovación existente de Nexotech también renovará este certificado si ejecuta `certbot renew` usando los mismos volúmenes. Verifica una vez:

```bash
docker compose run --rm certbot renew --dry-run
```

## 9. Comprobaciones de aceptación

```bash
curl -fsS https://legaldesk.nexosoft.tech/api/health
docker compose --env-file /opt/legaldesk/deploy/legaldesk.env \
  -f /opt/legaldesk/docker-compose.prod.yml ps
docker compose --env-file /opt/legaldesk/deploy/legaldesk.env \
  -f /opt/legaldesk/docker-compose.prod.yml logs --tail=100 backend alerts
```

Desde Internet no deben responder los puertos `3100`, `5432`, `9000` ni `9001`. Solo deben estar abiertos `22`, `80` y `443` según las reglas del VPS.

## 10. Respaldo en Ubuntu

```bash
cd /opt/legaldesk
chmod +x deploy/backup.sh
./deploy/backup.sh
```

El resultado queda en `/opt/legaldesk/backups`. Copia cada respaldo cifrado a otro servidor o almacenamiento; una copia en el mismo VPS no protege contra pérdida total del servidor.

Ejemplo de cron diario a las 02:30:

```bash
sudo tee /etc/cron.d/legaldesk-backup >/dev/null <<'EOF'
30 2 * * * root cd /opt/legaldesk && /opt/legaldesk/deploy/backup.sh >> /var/log/legaldesk-backup.log 2>&1
EOF
sudo chmod 644 /etc/cron.d/legaldesk-backup
```

Prueba primero la restauración en destinos temporales, sin afectar los datos activos:

```bash
cd /opt/legaldesk
chmod +x deploy/restore.sh
./deploy/restore.sh \
  backups/legaldesk-AAAAMMDD-HHMMSS \
  legaldesk_restore_test \
  legaldesk-restore-test \
  --confirm
```

El script valida el SHA-256 del dump y la cantidad de objetos. Para borrar y reemplazar destinos que ya existen exige además `--overwrite`. Antes de restaurar sobre los nombres reales se deben detener `backend` y `alerts`, conservar otra copia del respaldo y contar con aprobación operativa.

## 11. Actualizaciones

Antes de actualizar, crea un respaldo. Luego:

```bash
cd /opt/legaldesk
./deploy/backup.sh
git pull --ff-only
docker compose --env-file deploy/legaldesk.env -f docker-compose.prod.yml up -d --build
docker compose --env-file deploy/legaldesk.env -f docker-compose.prod.yml ps
curl -fsS https://legaldesk.nexosoft.tech/api/health
```

## 12. Reversión

Si solo falla el código, vuelve al commit estable anterior y reconstruye:

```bash
cd /opt/legaldesk
git log --oneline -10
git switch --detach COMMIT_ESTABLE
docker compose --env-file deploy/legaldesk.env -f docker-compose.prod.yml up -d --build
```

Si una migración ya modificó datos, no improvises SQL inverso: detén `backend` y `alerts`, restaura el respaldo comprobado y después levanta el commit compatible.
