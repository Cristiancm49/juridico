# Manual de usuario de LegalDesk

Última actualización: 5 de agosto de 2026

## 1. Ingreso y seguridad

Ingresa con el correo y la contraseña asignados. Si recibiste una contraseña temporal, el sistema exigirá cambiarla antes de permitir otras acciones. La contraseña nueva debe tener al menos 10 caracteres.

No compartas credenciales ni documentos descargados. Cierra sesión al terminar, especialmente en equipos compartidos. Si olvidas la contraseña, solicita a un administrador un restablecimiento; en el siguiente acceso deberás cambiarla.

Las opciones visibles dependen del rol. Que un menú no aparezca significa que la cuenta no tiene ese permiso.

## 2. Flujo recomendado

1. Busca a la persona o cliente; regístrala solo si no existe.
2. Crea la solicitud, asigna área, prioridad y descripción.
3. Revisa la solicitud y cambia su estado siguiendo el flujo permitido.
4. Convierte una solicitud aprobada en expediente o crea uno manualmente.
5. Asigna responsable y actualiza el estado del expediente.
6. Registra actuaciones, documentos y tareas en la ficha del expediente.
7. Atiende vencimientos desde Tareas y las alertas de la campana.
8. Consulta Reportes para revisar carga y exportar el detalle permitido.

## 3. Personas y solicitudes

Usa número de documento, nombre o contacto para evitar duplicados. Una persona puede desactivarse, pero no se elimina su historial jurídico.

Las solicitudes tienen consecutivo automático, área, prioridad, canal, fecha y estado. El historial conserva cada transición y su comentario. Solo una solicitud aprobada puede convertirse y cada solicitud origina como máximo un expediente.

## 4. Expedientes y seguimiento

Los expedientes pueden buscarse por número, cliente, asunto o referencia y filtrarse por estado, área, prioridad y responsable. La ficha permite:

- editar la información jurídica básica;
- asignar o reasignar responsable;
- cambiar estado con comentario;
- registrar actuaciones cronológicas y resultados;
- cargar documentos y nuevas versiones;
- consultar los historiales completos.

Un expediente archivado queda en modo de consulta y no admite cambios nuevos. Antes de archivarlo deben cerrarse o cancelarse sus tareas activas.

## 5. Documentos

Se admiten PDF, DOCX, XLSX, JPG y PNG hasta el límite configurado, inicialmente 20 MB. Selecciona la categoría correcta y añade una descripción útil. Una nueva versión conserva el antecedente; no reemplaza el archivo anterior sin trazabilidad.

La descarga pasa por el API y comprueba el permiso. El hash SHA-256 visible permite verificar integridad. Los archivos no tienen enlaces públicos.

## 6. Tareas y alertas

Cada tarea pertenece a un expediente y tiene responsable, prioridad, fecha límite y estado. Usa los filtros para ver tareas propias, vencidas, de hoy o próximas. Las alertas se generan a 7, 3 y 1 día, el día del vencimiento y después de vencer, sin duplicarse para la misma programación.

La campana muestra alertas sin leer. Puedes abrir una, marcarla individualmente o marcar todas. Cambiar la fecha límite genera el nuevo ciclo de alertas correspondiente.

## 7. Reportes

Reportes permite filtrar por periodo de apertura, área jurídica, estado del expediente y responsable. Los indicadores muestran expedientes, solicitudes, tareas, documentos y actuaciones; las gráficas distribuyen estados, áreas y tareas; la tabla resume la carga del equipo.

`Exportar CSV` descarga exactamente el conjunto filtrado. El archivo incluye detalle y conteos por expediente. Su generación queda registrada en Auditoría. Ábrelo solo en equipos autorizados y no lo envíes por canales personales.

## 8. Mensajes y accesibilidad

- Un aviso verde confirma una operación exitosa; un aviso rojo explica un error recuperable.
- Los estados de carga indican cuándo esperar y las pantallas vacías sugieren cómo ampliar filtros.
- Puedes navegar con Tab y activar controles con Enter o Espacio.
- Escape cierra el menú lateral y el centro de notificaciones.
- En pantallas pequeñas, abre la navegación desde el botón de menú superior.

Si un dato parece incorrecto, no crees un duplicado para corregirlo: informa al administrador indicando módulo, consecutivo y hora aproximada.
