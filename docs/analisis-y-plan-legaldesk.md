# LegalDesk - análisis, arquitectura y plan de trabajo

Fecha de análisis: 4 de agosto de 2026  
Fuente: `TrabajoFinal_Intensivo.pdf`

## 1. Conclusión ejecutiva

LegalDesk es viable como una aplicación web de gestión interna para KAFA y Asociados. El problema central no requiere una arquitectura compleja: necesita una fuente única y segura para solicitudes, expedientes, responsables, actuaciones, documentos, tareas, vencimientos y reportes.

La mejor primera versión es un **monolito modular** con una interfaz React, una API Node.js, PostgreSQL y almacenamiento privado de objetos para los documentos. No se recomiendan microservicios, Kubernetes, Redis ni inteligencia artificial en el MVP.

La versión inicial debe cumplir los requerimientos RF-01 a RF-16 con funciones sencillas. La “clasificación inteligente” mencionada como RF-17 en una sola matriz debe quedar fuera hasta que el sponsor la defina y apruebe como ampliación.

## 2. Hallazgos del documento

### Fortalezas

- Define el problema, alcance, exclusiones, interesados, riesgos, presupuesto y cronograma.
- Identifica 16 requerimientos funcionales y 15 no funcionales.
- Incluye historias de usuario, criterios de aceptación, releases y plan de pruebas.
- Exige autenticación, permisos, trazabilidad, HTTPS, respaldos y protección de datos.
- Limita correctamente la primera versión: no incluye aplicación móvil nativa, facturación, firma digital certificada ni integración con la Rama Judicial.

### Vacíos o contradicciones que deben resolverse

1. **RF-17 inconsistente:** “clasificar solicitudes mediante funciones inteligentes” aparece en la matriz de trazabilidad, pero no en los requerimientos funcionales, backlog, criterios de aceptación ni sprints.
2. **Portal ciudadano indefinido:** los ciudadanos aparecen como interesados y esperan conocer el estado de sus casos, pero no existe un requerimiento de acceso externo o portal de clientes.
3. **Antecedentes ambiguos:** debe aclararse si son antecedentes internos del bufete o consultas externas. Para el MVP serán referencias y documentos internos; la integración externa está excluida.
4. **Flujo de estados sin definir:** faltan los estados permitidos y las transiciones de una solicitud y de un expediente.
5. **Permisos incompletos:** se mencionan administrador, abogado, practicante y administrativo, pero falta la matriz exacta de acciones por rol.
6. **Documentos sin reglas:** faltan formatos permitidos, tamaño máximo, versionado, eliminación, conservación y quién puede descargar cada archivo.
7. **Alertas sin política:** faltan anticipaciones, destinatarios, frecuencia, canales y reglas para evitar duplicados.
8. **Protección de datos:** se cita la normativa colombiana, pero faltan política de conservación, autorización de tratamiento, procedimiento de corrección/supresión y responsable del tratamiento.
9. **Cronograma:** A-29 depende de A-28 y de sí misma; debe corregirse para que dependa solo de A-28.
10. **Responsables RNF:** usabilidad, compatibilidad y diseño adaptable están asignados al backend en el documento; deben corresponder principalmente al frontend y al equipo de pruebas.

## 3. Alcance propuesto del MVP

### Incluido

- Usuarios, inicio/cierre de sesión, roles y permisos.
- Registro y clasificación de solicitudes de asesoría.
- Conversión de una solicitud aprobada en expediente.
- Gestión de expedientes, responsables, estados e historial.
- Actuaciones y avances con autor y fecha.
- Documentos privados asociados al expediente.
- Antecedentes internos relacionados con el caso.
- Tareas, compromisos, fechas y vencimientos.
- Alertas dentro de la aplicación.
- Búsqueda y filtros.
- Tablero con indicadores y reportes básicos exportables a CSV.
- Registro de auditoría.
- Interfaz adaptable a escritorio, tableta y teléfono.
- Respaldos y prueba documentada de restauración.

### Fuera del MVP

- Inteligencia artificial o clasificación automática.
- Portal de autoservicio para ciudadanos.
- Correos, SMS o WhatsApp automáticos; se pueden añadir después de estabilizar las alertas internas.
- OCR, edición colaborativa y firma digital certificada.
- Integraciones con la Rama Judicial.
- Aplicación móvil nativa.
- Microservicios y búsqueda con Elasticsearch.

## 4. Arquitectura recomendada

### Tecnologías acordadas

| Componente | Recomendación | Motivo |
|---|---|---|
| Lenguaje | JavaScript en frontend y backend | Mantiene una curva de aprendizaje baja para el equipo |
| Frontend | React + Vite | Interfaz web rápida y sencilla |
| UI | CSS propio + Lucide | Apariencia clara sin agregar un framework visual complejo |
| Formularios y datos | React y `fetch` | Suficiente para el alcance inicial |
| Alertas visuales | Sonner para mensajes breves + centro de notificaciones propio | Apariencia moderna sin ocultar alertas persistentes |
| Backend | Node.js + Fastify | API liviana con validación por esquemas |
| API | REST bajo `/api/v1` | Suficiente para este alcance y fácil de probar |
| Base de datos | PostgreSQL | Adecuada para relaciones, consistencia, búsquedas e informes |
| Acceso a datos | `pg` y consultas SQL parametrizadas | Control directo y sin ORM |
| Migraciones | Archivos `.sql` versionados | Estructura explícita y reproducible |
| Trabajos programados | pg-boss | Usa PostgreSQL y evita agregar Redis |
| Archivos | API compatible con S3 | Mantiene los archivos fuera de PostgreSQL y permite cambiar de proveedor |
| Pruebas | Vitest + Fastify `inject` + React Testing Library + Playwright | Cubre unidades, API y flujos críticos |
| Entorno local | Docker Compose | Reproduce PostgreSQL y almacenamiento sin instalaciones manuales |

### Forma de la solución

```text
Navegador
   |
   v
React/Vite ---- REST/HTTPS ---- API Node/Fastify
                                  |       |
                                  |       +---- almacenamiento S3 privado
                                  |
                                  +---- PostgreSQL
                                          |
                                          +---- pg-boss / trabajador de alertas
```

Debe construirse como un único repositorio:

```text
legaldesk/
  apps/
    web/       # React
    api/       # Fastify y reglas de negocio
    worker/    # vencimientos, alertas y tareas diferidas
  apps/api/db/
    migrations/ # archivos SQL
  docs/
  docker-compose.yml
```

El API seguirá siendo un monolito, organizado en módulos: `auth`, `usuarios`, `solicitudes`, `expedientes`, `actuaciones`, `documentos`, `tareas`, `notificaciones`, `reportes` y `auditoria`.

## 5. Recomendación de base de datos

Si “BSD” se refería a la base de datos, la recomendación es **PostgreSQL**. Los datos son altamente relacionales y requieren transacciones, integridad referencial, historial, filtros e indicadores. No hay una razón válida para añadir MongoDB ni un ORM en esta primera versión.

### Entidades iniciales

- `users`, `roles`, `permissions`, `user_roles`, `role_permissions`
- `people` o `clients`
- `legal_requests`, `legal_areas`, `priorities`
- `cases`, `case_assignments`, `case_status_history`
- `legal_actions`
- `case_documents`, `document_versions`
- `case_relations` para antecedentes internos
- `tasks`, `deadlines`
- `notifications`, `notification_deliveries`
- `audit_logs`

Reglas importantes:

- Usar UUID como identificadores públicos.
- Usar claves foráneas, restricciones y transacciones.
- Desactivar usuarios y archivar expedientes; evitar borrados físicos de información jurídica desde la interfaz.
- Guardar todo cambio de estado en una tabla histórica.
- Indexar número de expediente, estado, área, prioridad, responsable y fechas de vencimiento.
- Empezar con búsqueda de PostgreSQL y filtros normales; no incorporar otro motor de búsqueda.

## 6. Manejo de archivos

Los archivos no deben guardarse como columnas binarias dentro de PostgreSQL. La estrategia será:

1. Guardar el archivo real en un bucket privado S3 compatible.
2. Guardar en PostgreSQL solo `id`, expediente, nombre original, clave del objeto, tipo MIME, tamaño, hash SHA-256, versión, autor y fechas.
3. Entregar descargas mediante URL firmada de corta duración o a través del backend después de verificar permisos.
4. Usar nombres internos aleatorios; nunca confiar en el nombre enviado por el usuario.
5. Validar extensión, MIME y tamaño. Propuesta inicial: PDF, DOCX, XLSX, JPG y PNG, máximo 20 MB por archivo.
6. Mantener un bucket privado, versionado lógico en la aplicación y registro de cargas/descargas.
7. Incluir base de datos, objetos y metadatos en el procedimiento de respaldo y restauración.

Para comenzar con poca operación: **Supabase administrado para PostgreSQL y Storage**. Para desarrollo local: PostgreSQL + MinIO. Ambos permiten mantener una interfaz S3 y cambiar de proveedor posteriormente. Las credenciales maestras del almacenamiento solo vivirán en el servidor.

## 7. Alertas y notificaciones

La alerta bonita no debe ser solo un mensaje emergente. Se implementarán tres niveles:

- **Toast:** confirma acciones inmediatas, por ejemplo “Expediente actualizado”.
- **Centro de notificaciones:** campana con contador, lista de pendientes/leídas y enlace al expediente.
- **Tablero:** tarjetas de “vence hoy”, “vence esta semana” y “vencido”.

Regla inicial sugerida: generar alertas a 7, 3 y 1 día antes, el día del vencimiento y una alerta de vencido. Debe poder configurarse por vencimiento. El trabajador ejecutará revisiones periódicas con `pg-boss`; cada alerta tendrá una llave única por vencimiento y anticipación para no duplicarse.

El correo se añadirá después como canal opcional usando los mismos eventos. No se necesita WebSocket en el MVP; actualización periódica cada 60 segundos es suficiente.

## 8. Requisitos convertidos en módulos verificables

| Módulo | Requisitos | Criterio mínimo del MVP |
|---|---|---|
| Seguridad | RF-01 a RF-03 | Usuarios CRUD/desactivación, sesión segura y permisos comprobados en API |
| Solicitudes | RF-04 y RF-06 | Crear, consultar y clasificar por área/prioridad |
| Expedientes | RF-05, RF-07, RF-14 | Crear, asignar/reasignar, cambiar estado con historial y consultar |
| Seguimiento | RF-08, RF-11 y RF-12 | Actuaciones, tareas y vencimientos asociados al expediente |
| Documentos | RF-09 y RF-10 | Carga privada, descarga autorizada, metadatos y antecedentes internos |
| Alertas | RF-13 | Notificación persistente, anticipación configurable y cero duplicados |
| Consulta | RF-15 | Búsqueda por número/cliente y filtros por estado, área, prioridad y responsable |
| Gestión | RF-16 | Totales por estado/área/responsable, próximos vencimientos y CSV |

## 9. Seguridad y protección de datos

- Contraseñas con Argon2id; nunca reversibles.
- Sesiones con cookies `HttpOnly`, `Secure` y `SameSite`, rotación de sesión y cierre efectivo.
- Autorización en cada endpoint; ocultar botones en React no reemplaza la validación del backend.
- Limitación de intentos de acceso y bloqueo temporal.
- HTTPS en pruebas públicas y producción.
- Bitácora para inicio de sesión, creación, modificación, cambio de estado, carga y descarga de documentos.
- Secretos solo en variables de entorno o gestor de secretos.
- Sanitización de nombres, validación de archivos y cabeceras de seguridad.
- Copia diaria y prueba real de restauración antes de entregar.
- Definir con el responsable jurídico: autorización de tratamiento, finalidad, conservación, consulta, corrección y supresión conforme a la normativa colombiana.

## 10. Plan de trabajo de 14 semanas

### Sprint 1 - Fundamentos, usuarios y seguridad

- LD-001: confirmar alcance, estados, áreas, prioridades y matriz de permisos.
- LD-002: crear monorepo, reglas de código, CI y Docker Compose.
- LD-003: diseñar modelo inicial y primera migración.
- LD-004: implementar autenticación, cierre de sesión y recuperación administrativa.
- LD-005: implementar usuarios, roles y permisos.
- LD-006: crear layout, navegación y protección de rutas.
- Evidencia: administrador crea/desactiva usuarios y cada rol ve solo lo permitido.

### Sprint 2 - Solicitudes y expedientes

- LD-007: CRUD de personas/clientes.
- LD-008: registro y consulta de solicitudes.
- LD-009: catálogos de área y prioridad.
- LD-010: creación y edición de expediente.
- LD-011: conversión controlada de solicitud a expediente.
- LD-012: pruebas de validación e integridad.
- Evidencia: una solicitud válida se clasifica y se convierte en expediente sin duplicar datos.

### Sprint 3 - Asignación y seguimiento

- LD-013: asignar y reasignar responsables.
- LD-014: definir máquina de estados e historial.
- LD-015: registrar actuaciones y avances.
- LD-016: implementar búsqueda, filtros y paginación.
- LD-017: comenzar bitácora de auditoría.
- Evidencia: el expediente muestra línea de tiempo, estado y responsables anteriores/actuales.

### Sprint 4 - Gestión documental

- LD-018: integrar bucket S3 privado.
- LD-019: carga segura, metadatos y hash.
- LD-020: descarga autorizada con URL firmada.
- LD-021: versionado lógico y antecedentes internos.
- LD-022: pruebas de permisos, tamaño y formato.
- Evidencia: un usuario no autorizado no puede listar ni descargar documentos.

### Sprint 5 - Tareas, vencimientos y alertas

- LD-023: tareas y compromisos.
- LD-024: fechas y vencimientos.
- LD-025: trabajador `pg-boss` e idempotencia.
- LD-026: centro de notificaciones, campana y toasts.
- LD-027: vistas de próximos vencimientos y vencidos.
- Evidencia: las alertas aparecen en el momento configurado una sola vez.

### Sprint 6 - Reportes y experiencia de usuario

- LD-028: tablero con indicadores básicos.
- LD-029: exportación CSV.
- LD-030: diseño adaptable y estados vacíos/carga/error.
- LD-031: accesibilidad, navegación por teclado y validación de formularios.
- LD-032: pruebas de rendimiento de consultas principales.
- Evidencia: consultas críticas menores de 3 segundos con un conjunto de datos acordado.

### Sprint 7 - Estabilización, despliegue y entrega

- LD-033: pruebas integrales y de aceptación RF-01 a RF-16.
- LD-034: pruebas de seguridad y corrección de hallazgos críticos.
- LD-035: respaldo y restauración comprobados.
- LD-036: despliegue en ambiente de pruebas y luego producción.
- LD-037: monitoreo, logs y procedimiento de rollback.
- LD-038: manual técnico, manual de usuario y capacitación.
- LD-039: acta de aceptación y cierre.
- Evidencia: cero errores críticos, restauración validada y aprobación del sponsor.

## 11. Definition of Done técnica

Una tarea funcional solo se considera terminada cuando:

- Cumple criterios de aceptación verificables.
- Incluye validación en frontend y backend.
- Verifica permisos en la API.
- Incluye migración si cambia datos.
- Incluye pruebas automáticas del camino principal y de un caso de error.
- Registra auditoría cuando corresponde.
- Funciona en vista de escritorio y móvil.
- Actualiza documentación y contrato de API.
- Pasa formato, análisis estático, pruebas y compilación en CI.

## 12. Decisiones necesarias antes de escribir el primer módulo

1. Aprobar los cuatro roles iniciales y su matriz de permisos.
2. Definir estados y transiciones de solicitudes y expedientes.
3. Confirmar campos obligatorios de persona, solicitud y expediente.
4. Confirmar que “antecedentes” significa información interna.
5. Confirmar que no habrá portal ciudadano en el MVP.
6. Aprobar tipos/tamaño de archivos y política de conservación.
7. Aprobar anticipaciones de alertas.
8. Decidir si RF-17 se elimina formalmente o se mueve a una fase futura.

## 13. Próximo paso recomendado

Realizar un taller corto de requisitos para cerrar las ocho decisiones anteriores. Con esas respuestas se puede iniciar de inmediato el Sprint 1: estructura del repositorio, modelo de datos, contratos de API, autenticación y matriz de permisos.
