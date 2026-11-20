using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ConsultorioContable.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class BackfillOriginalDatabaseModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                UPDATE solicitudes_asesoria
                SET estado_catalogo_id = CASE estado
                    WHEN 'Radicada' THEN '60000000-0000-0000-0000-000000000001'
                    WHEN 'PendienteInformacion' THEN '60000000-0000-0000-0000-000000000002'
                    WHEN 'EnRevision' THEN '60000000-0000-0000-0000-000000000003'
                    WHEN 'Aprobada' THEN '60000000-0000-0000-0000-000000000004'
                    WHEN 'Rechazada' THEN '60000000-0000-0000-0000-000000000005'
                    WHEN 'Cancelada' THEN '60000000-0000-0000-0000-000000000006'
                    WHEN 'Convertida' THEN '60000000-0000-0000-0000-000000000007'
                    ELSE estado_catalogo_id
                END,
                fecha_solicitud = COALESCE(fecha_solicitud, CONVERT(date, creado_en));

                UPDATE casos_asesoria
                SET estado_id = CASE LOWER(estado)
                    WHEN 'pendiente' THEN '70000000-0000-0000-0000-000000000001'
                    WHEN 'asignado' THEN '70000000-0000-0000-0000-000000000001'
                    WHEN 'finalizado' THEN '70000000-0000-0000-0000-000000000005'
                    WHEN 'cerrado' THEN '70000000-0000-0000-0000-000000000006'
                    WHEN 'cancelado' THEN '70000000-0000-0000-0000-000000000007'
                    WHEN 'reabierto' THEN '70000000-0000-0000-0000-000000000008'
                    ELSE '70000000-0000-0000-0000-000000000002'
                END,
                titulo = COALESCE(titulo, numero),
                descripcion = COALESCE(descripcion, CONCAT('Caso de asesoría ', numero)),
                fecha_apertura = COALESCE(fecha_apertura, CONVERT(date, actualizado_en)),
                creado_en = COALESCE(creado_en, actualizado_en);

                UPDATE documentos
                SET grupo_documento_id = COALESCE(grupo_documento_id, id),
                    numero_version = COALESCE(
                        numero_version,
                        TRY_CONVERT(int, REPLACE(REPLACE(version, 'v', ''), 'V', '')),
                        1),
                    es_vigente = 1,
                    categoria_id = COALESCE(categoria_id, '80000000-0000-0000-0000-000000000008'),
                    creado_en = COALESCE(creado_en, actualizado_en);

                UPDATE notificaciones
                SET creado_en = COALESCE(creado_en, fecha),
                    mensaje = COALESCE(mensaje, asunto);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
