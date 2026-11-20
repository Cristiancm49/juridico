using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ConsultorioContable.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class OperationalModules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "auditoria_eventos",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    fecha = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    usuario = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    modulo = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    operacion = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    resultado = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    detalle = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_auditoria_eventos", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "casos_asesoria",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    numero = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    solicitante_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    area_asesoria_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    responsable = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    estado = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    actualizado_en = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_casos_asesoria", x => x.id);
                    table.ForeignKey(
                        name: "FK_casos_asesoria_areas_asesoria_area_asesoria_id",
                        column: x => x.area_asesoria_id,
                        principalTable: "areas_asesoria",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_casos_asesoria_solicitantes_solicitante_id",
                        column: x => x.solicitante_id,
                        principalTable: "solicitantes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "notificaciones",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    fecha = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    destinatario = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    tipo = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    asunto = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    canal = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    estado = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_notificaciones", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "asignaciones_caso",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    caso_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    area = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    docente = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    estudiante = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    asignado_en = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    estado = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_asignaciones_caso", x => x.id);
                    table.ForeignKey(
                        name: "FK_asignaciones_caso_casos_asesoria_caso_id",
                        column: x => x.caso_id,
                        principalTable: "casos_asesoria",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "documentos_caso",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    caso_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    nombre = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    categoria = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    version = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    responsable = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    actualizado_en = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_documentos_caso", x => x.id);
                    table.ForeignKey(
                        name: "FK_documentos_caso_casos_asesoria_caso_id",
                        column: x => x.caso_id,
                        principalTable: "casos_asesoria",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "sesiones_asesoria",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    caso_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    fecha = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    tipo = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    responsable = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    compromisos = table.Column<short>(type: "smallint", nullable: false),
                    estado = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sesiones_asesoria", x => x.id);
                    table.ForeignKey(
                        name: "FK_sesiones_asesoria_casos_asesoria_caso_id",
                        column: x => x.caso_id,
                        principalTable: "casos_asesoria",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_asignaciones_caso_caso_id",
                table: "asignaciones_caso",
                column: "caso_id");

            migrationBuilder.CreateIndex(
                name: "IX_casos_asesoria_area_asesoria_id",
                table: "casos_asesoria",
                column: "area_asesoria_id");

            migrationBuilder.CreateIndex(
                name: "IX_casos_asesoria_numero",
                table: "casos_asesoria",
                column: "numero",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_casos_asesoria_solicitante_id",
                table: "casos_asesoria",
                column: "solicitante_id");

            migrationBuilder.CreateIndex(
                name: "IX_documentos_caso_caso_id",
                table: "documentos_caso",
                column: "caso_id");

            migrationBuilder.CreateIndex(
                name: "IX_sesiones_asesoria_caso_id",
                table: "sesiones_asesoria",
                column: "caso_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "asignaciones_caso");

            migrationBuilder.DropTable(
                name: "auditoria_eventos");

            migrationBuilder.DropTable(
                name: "documentos_caso");

            migrationBuilder.DropTable(
                name: "notificaciones");

            migrationBuilder.DropTable(
                name: "sesiones_asesoria");

            migrationBuilder.DropTable(
                name: "casos_asesoria");
        }
    }
}
