# Componente no relacional de LegalDesk

LegalDesk no usa MongoDB ni otra base de datos documental. Su componente no
relacional es **MinIO**, un almacenamiento de objetos compatible con S3, usado
para conservar el contenido binario de los documentos juridicos.

## Modelo del objeto

```json
{
  "bucket": "legaldesk-documents",
  "key": "cases/{case_id}/{document_id}.{extension}",
  "body": "<contenido binario>",
  "contentType": "application/pdf",
  "metadata": {
    "sha256": "<hash hexadecimal de 64 caracteres>"
  }
}
```

Ejemplo de clave:

```text
cases/65a2b445-514e-43d1-9cbe-fba2738a0ab2/7bb02773-5e31-4c28-b9d2-83a0e638962c.pdf
```

## Vinculo con PostgreSQL

La tabla `documents` es el catalogo autoritativo. Cada fila guarda `storage_key`,
`mime_type`, `size_bytes`, `sha256`, el grupo de versiones y la version vigente.
El objeto en MinIO guarda solamente el archivo, su tipo MIME y una copia del
hash SHA-256 como metadato.

```text
PostgreSQL: cases.id
        1
        |
        *
PostgreSQL: documents.storage_key  -------->  MinIO: bucket/key
```

Al cargar un archivo, la API primero escribe el objeto y luego registra sus
metadatos dentro de una transaccion PostgreSQL. Si esa transaccion falla, elimina
el objeto recien cargado para evitar archivos huerfanos. Una nueva version crea
un objeto diferente y marca la version anterior como no vigente.

## Datos semiestructurados

PostgreSQL tambien contiene dos estructuras no estrictamente escalares:

- `audit_logs.details` es `JSONB` y conserva detalles variables de cada evento.
- `tasks.alert_days` es un arreglo `SMALLINT[]` limitado a `0`, `1`, `3` y `7`.

Ejemplo logico de `audit_logs.details` para la carga de un documento:

```json
{
  "caseId": "65a2b445-514e-43d1-9cbe-fba2738a0ab2",
  "versionNumber": 2,
  "replacesDocumentId": "c829c6fb-97c2-42d3-b9ae-df71445e4e72",
  "sha256": "74d3c7f33d6d97e44fc544fdac0b106d3e8dc74b5b658f732f76e158aceaf438"
}
```

## Limites de responsabilidad

| Componente | Conserva | No conserva |
|---|---|---|
| PostgreSQL | Relaciones, permisos, expedientes, metadatos, versiones, auditoria | Contenido binario del archivo |
| MinIO/S3 | Binario, tipo MIME, metadato SHA-256 | Relaciones juridicas y permisos de negocio |

El acceso al bucket debe permanecer privado. Las descargas pasan por la API,
que valida la sesion y el permiso `documents.read`; MinIO no decide la
autorizacion juridica.
