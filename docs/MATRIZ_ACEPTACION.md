# Matriz de aceptación de LegalDesk

Última actualización: 5 de agosto de 2026  
Estado: validación técnica completada; aceptación funcional del sponsor pendiente

| Requisito | Resultado implementado | Evidencia automática principal | Estado técnico |
|---|---|---|---|
| RF-01 Usuarios | Crear, editar, activar/desactivar y restablecer contraseña | `npm test`, pruebas de autenticación | Cumple |
| RF-02 Autenticación | Sesión opaca, cookie segura, cambio y cierre de sesión | `npm run test:security` | Cumple |
| RF-03 Roles y permisos | Matriz por rol comprobada en el API | `npm run test:roles` | Cumple |
| RF-04 Solicitudes | Registro, consulta, edición y consecutivo | `npm run test:requests` | Cumple |
| RF-05 Expedientes | Creación manual y conversión sin duplicados | `npm run test:cases` | Cumple |
| RF-06 Clasificación | Área jurídica y prioridad controladas | `npm run test:intake`, `npm run test:requests` | Cumple |
| RF-07 Asignaciones | Responsable actual e historial de reasignación | `npm run test:case-tracking` | Cumple |
| RF-08 Actuaciones | Línea de tiempo, tipo, fecha y resultado | `npm run test:actions` | Cumple |
| RF-09 Documentos | Carga privada y descarga autorizada | `npm run test:documents` | Cumple |
| RF-10 Antecedentes | Categorías, metadatos, hash y versiones | `npm run test:documents` | Cumple |
| RF-11 Tareas | Compromisos por expediente y responsable | `npm run test:tasks` | Cumple |
| RF-12 Vencimientos | Fecha límite, estados y vistas temporales | `npm run test:tasks` | Cumple |
| RF-13 Alertas | Anticipaciones persistentes e idempotentes | `npm run test:tasks` | Cumple |
| RF-14 Estados | Transiciones e historial de expediente | `npm run test:case-tracking` | Cumple |
| RF-15 Consulta | Búsquedas, filtros y paginación operativa | pruebas de solicitudes, casos y tareas | Cumple |
| RF-16 Gestión | Indicadores, carga por responsable y CSV | `npm run test:reports`, `npm run test:performance` | Cumple |

## Evidencia transversal

- Regresión integral sin fallos el 5 de agosto de 2026.
- Compilación Vite de producción exitosa.
- `npm audit --omit=dev`: 0 vulnerabilidades.
- Prueba de rendimiento con 1.000 expedientes y 2.000 tareas: ambas consultas críticas bajo 3 segundos.
- Respaldo generado y restaurado en una base y un bucket temporales; 10 migraciones recuperadas.
- Protección CSV contra fórmulas y evento `report.export` comprobados.

## Pendientes para aceptación funcional

El sponsor debe ejecutar o presenciar los siguientes escenarios con datos de prueba:

1. Cada rol inicia sesión y confirma los menús y acciones esperados.
2. Una solicitud completa se aprueba y convierte en expediente.
3. El expediente se asigna, avanza de estado y conserva su historial.
4. Se registra una actuación, se carga un documento y se crea una nueva versión.
5. Se crea una tarea vencible y se observa una alerta sin duplicados.
6. Se filtra un reporte y se abre el CSV exportado.
7. Se acuerdan campos, catálogos, transiciones, conservación y matriz definitiva de permisos.
8. Se aprueba el ambiente objetivo, HTTPS, política de respaldo y responsables operativos.

La firma o aprobación del sponsor no se presume por esta matriz. Debe quedar registrada en un acta separada después de completar los escenarios anteriores.
