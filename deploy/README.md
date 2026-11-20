# Integracion con el proxy de NexoSoft

El consultorio no publica puertos del host. `compose.production.yml` conecta los
servicios `api` y `web` a la red Docker externa `shared_proxy` usada por SaelSoft.

- `proxy/consultorio.http.conf`: configuracion temporal para emitir el certificado.
- `proxy/consultorio.https.conf`: configuracion final HTTPS.
- `frontend.conf`: servidor SPA dentro del contenedor del frontend.
- `backup.sh` y `restore.sh`: mantenimiento de SQL Server.

La URL final prevista es `https://consultorio.nexosoft.tech`. Consulta
`../DEPLOYMENT.md` para la secuencia completa.

