using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace ConsultorioContable.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialIdentityAndRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "areas_asesoria",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    codigo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    nombre = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    descripcion = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    activo = table.Column<bool>(type: "bit", nullable: false),
                    orden = table.Column<short>(type: "smallint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_areas_asesoria", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "periodos_academicos",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    codigo = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    nombre = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    fecha_inicio = table.Column<DateOnly>(type: "date", nullable: false),
                    fecha_fin = table.Column<DateOnly>(type: "date", nullable: false),
                    activo = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_periodos_academicos", x => x.id);
                    table.CheckConstraint("ck_periodo_fechas", "[fecha_fin] > [fecha_inicio]");
                });

            migrationBuilder.CreateTable(
                name: "roles",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    descripcion = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    rol_sistema = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    creado_en = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    actualizado_en = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    normalized_name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    concurrency_stamp = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_roles", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "usuarios",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    nombre_completo = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    activo = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    debe_cambiar_contrasena = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    ultimo_acceso_en = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    creado_en = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    actualizado_en = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    user_name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    normalized_user_name = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    normalized_email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    email_confirmed = table.Column<bool>(type: "bit", nullable: false),
                    password_hash = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    security_stamp = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    concurrency_stamp = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    phone_number = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    phone_number_confirmed = table.Column<bool>(type: "bit", nullable: false),
                    two_factor_enabled = table.Column<bool>(type: "bit", nullable: false),
                    lockout_end = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    lockout_enabled = table.Column<bool>(type: "bit", nullable: false),
                    access_failed_count = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_usuarios", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "roles_claims",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    role_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    claim_type = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    claim_value = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_roles_claims", x => x.id);
                    table.ForeignKey(
                        name: "FK_roles_claims_roles_role_id",
                        column: x => x.role_id,
                        principalTable: "roles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "solicitantes",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    usuario_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    tipo_documento = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    numero_documento = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    nombre_completo = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    correo_electronico = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    telefono = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    activo = table.Column<bool>(type: "bit", nullable: false),
                    creado_en = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    actualizado_en = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_solicitantes", x => x.id);
                    table.CheckConstraint("ck_solicitante_tipo_documento", "[tipo_documento] IN ('CC','CE','TI','NIT')");
                    table.ForeignKey(
                        name: "FK_solicitantes_usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "usuarios_claims",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    user_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    claim_type = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    claim_value = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_usuarios_claims", x => x.id);
                    table.ForeignKey(
                        name: "FK_usuarios_claims_usuarios_user_id",
                        column: x => x.user_id,
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "usuarios_logins",
                columns: table => new
                {
                    login_provider = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    provider_key = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    provider_display_name = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    user_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_usuarios_logins", x => new { x.login_provider, x.provider_key });
                    table.ForeignKey(
                        name: "FK_usuarios_logins_usuarios_user_id",
                        column: x => x.user_id,
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "usuarios_roles",
                columns: table => new
                {
                    user_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    role_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_usuarios_roles", x => new { x.user_id, x.role_id });
                    table.ForeignKey(
                        name: "FK_usuarios_roles_roles_role_id",
                        column: x => x.role_id,
                        principalTable: "roles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_usuarios_roles_usuarios_user_id",
                        column: x => x.user_id,
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "usuarios_tokens",
                columns: table => new
                {
                    user_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    login_provider = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    name = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    value = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_usuarios_tokens", x => new { x.user_id, x.login_provider, x.name });
                    table.ForeignKey(
                        name: "FK_usuarios_tokens_usuarios_user_id",
                        column: x => x.user_id,
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "solicitudes_asesoria",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    radicado = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    solicitante_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    area_asesoria_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    periodo_academico_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    asunto = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    descripcion_necesidad = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    canal_recepcion = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    estado = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    creado_en = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    actualizado_en = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    version = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_solicitudes_asesoria", x => x.id);
                    table.CheckConstraint("ck_solicitud_canal", "[canal_recepcion] IN ('Web','Presencial','Correo','Telefono','Otro')");
                    table.CheckConstraint("ck_solicitud_estado", "[estado] IN ('Radicada','PendienteInformacion','EnRevision','Aprobada','Rechazada','Cancelada','Convertida')");
                    table.ForeignKey(
                        name: "FK_solicitudes_asesoria_areas_asesoria_area_asesoria_id",
                        column: x => x.area_asesoria_id,
                        principalTable: "areas_asesoria",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_solicitudes_asesoria_periodos_academicos_periodo_academico_id",
                        column: x => x.periodo_academico_id,
                        principalTable: "periodos_academicos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_solicitudes_asesoria_solicitantes_solicitante_id",
                        column: x => x.solicitante_id,
                        principalTable: "solicitantes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "areas_asesoria",
                columns: new[] { "id", "activo", "codigo", "descripcion", "nombre", "orden" },
                values: new object[,]
                {
                    { new Guid("20000000-0000-0000-0000-000000000001"), true, "CONT_GENERAL", null, "Contabilidad general", (short)1 },
                    { new Guid("20000000-0000-0000-0000-000000000002"), true, "ORG_CONTABLE", null, "Organizacion contable", (short)2 },
                    { new Guid("20000000-0000-0000-0000-000000000003"), true, "COSTOS", null, "Costos", (short)3 },
                    { new Guid("20000000-0000-0000-0000-000000000004"), true, "INVENTARIOS", null, "Inventarios", (short)4 },
                    { new Guid("20000000-0000-0000-0000-000000000005"), true, "EST_FINANC", null, "Estados financieros", (short)5 },
                    { new Guid("20000000-0000-0000-0000-000000000006"), true, "FORMALIZ", null, "Formalizacion contable", (short)6 },
                    { new Guid("20000000-0000-0000-0000-000000000007"), true, "GEST_DOC", null, "Gestion documental contable", (short)7 },
                    { new Guid("20000000-0000-0000-0000-000000000008"), true, "ORIENT_EMP", null, "Orientacion empresarial", (short)8 },
                    { new Guid("20000000-0000-0000-0000-000000000009"), true, "OTRA", null, "Otra", (short)9 }
                });

            migrationBuilder.InsertData(
                table: "periodos_academicos",
                columns: new[] { "id", "activo", "codigo", "fecha_fin", "fecha_inicio", "nombre" },
                values: new object[] { new Guid("10000000-0000-0000-0000-000000000001"), true, "2026-2", new DateOnly(2026, 12, 15), new DateOnly(2026, 8, 1), "Segundo semestre 2026" });

            migrationBuilder.InsertData(
                table: "roles",
                columns: new[] { "id", "actualizado_en", "concurrency_stamp", "creado_en", "descripcion", "name", "normalized_name", "rol_sistema" },
                values: new object[,]
                {
                    { new Guid("30000000-0000-0000-0000-000000000001"), new DateTimeOffset(new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), null, new DateTimeOffset(new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Administra la configuracion general del sistema", "ADMIN", "ADMIN", true },
                    { new Guid("30000000-0000-0000-0000-000000000002"), new DateTimeOffset(new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), null, new DateTimeOffset(new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Consulta reportes e historico institucional", "JEFE_PROGRAMA", "JEFE_PROGRAMA", true },
                    { new Guid("30000000-0000-0000-0000-000000000003"), new DateTimeOffset(new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), null, new DateTimeOffset(new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Revisa y gestiona solicitudes y casos", "COORDINADORA", "COORDINADORA", true },
                    { new Guid("30000000-0000-0000-0000-000000000004"), new DateTimeOffset(new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), null, new DateTimeOffset(new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Orienta y revisa los casos asignados", "DOCENTE", "DOCENTE", true },
                    { new Guid("30000000-0000-0000-0000-000000000005"), new DateTimeOffset(new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), null, new DateTimeOffset(new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Ejecuta y reporta avances de los casos", "ESTUDIANTE", "ESTUDIANTE", true },
                    { new Guid("30000000-0000-0000-0000-000000000006"), new DateTimeOffset(new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), null, new DateTimeOffset(new DateTime(2026, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "Registra y consulta solicitudes de asesoria", "SOLICITANTE", "SOLICITANTE", true }
                });

            migrationBuilder.CreateIndex(
                name: "IX_areas_asesoria_codigo",
                table: "areas_asesoria",
                column: "codigo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_areas_asesoria_nombre",
                table: "areas_asesoria",
                column: "nombre",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_periodos_academicos_codigo",
                table: "periodos_academicos",
                column: "codigo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_periodo_academico_activo",
                table: "periodos_academicos",
                column: "activo",
                unique: true,
                filter: "[activo] = 1");

            migrationBuilder.CreateIndex(
                name: "RoleNameIndex",
                table: "roles",
                column: "normalized_name",
                unique: true,
                filter: "[normalized_name] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_roles_claims_role_id",
                table: "roles_claims",
                column: "role_id");

            migrationBuilder.CreateIndex(
                name: "IX_solicitantes_tipo_documento_numero_documento",
                table: "solicitantes",
                columns: new[] { "tipo_documento", "numero_documento" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_solicitantes_usuario_id",
                table: "solicitantes",
                column: "usuario_id");

            migrationBuilder.CreateIndex(
                name: "IX_solicitudes_asesoria_area_asesoria_id",
                table: "solicitudes_asesoria",
                column: "area_asesoria_id");

            migrationBuilder.CreateIndex(
                name: "IX_solicitudes_asesoria_creado_en",
                table: "solicitudes_asesoria",
                column: "creado_en");

            migrationBuilder.CreateIndex(
                name: "IX_solicitudes_asesoria_estado",
                table: "solicitudes_asesoria",
                column: "estado");

            migrationBuilder.CreateIndex(
                name: "IX_solicitudes_asesoria_periodo_academico_id",
                table: "solicitudes_asesoria",
                column: "periodo_academico_id");

            migrationBuilder.CreateIndex(
                name: "IX_solicitudes_asesoria_radicado",
                table: "solicitudes_asesoria",
                column: "radicado",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_solicitudes_asesoria_solicitante_id",
                table: "solicitudes_asesoria",
                column: "solicitante_id");

            migrationBuilder.CreateIndex(
                name: "EmailIndex",
                table: "usuarios",
                column: "normalized_email",
                unique: true,
                filter: "[normalized_email] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "UserNameIndex",
                table: "usuarios",
                column: "normalized_user_name",
                unique: true,
                filter: "[normalized_user_name] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_usuarios_claims_user_id",
                table: "usuarios_claims",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_usuarios_logins_user_id",
                table: "usuarios_logins",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "IX_usuarios_roles_role_id",
                table: "usuarios_roles",
                column: "role_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "roles_claims");

            migrationBuilder.DropTable(
                name: "solicitudes_asesoria");

            migrationBuilder.DropTable(
                name: "usuarios_claims");

            migrationBuilder.DropTable(
                name: "usuarios_logins");

            migrationBuilder.DropTable(
                name: "usuarios_roles");

            migrationBuilder.DropTable(
                name: "usuarios_tokens");

            migrationBuilder.DropTable(
                name: "areas_asesoria");

            migrationBuilder.DropTable(
                name: "periodos_academicos");

            migrationBuilder.DropTable(
                name: "solicitantes");

            migrationBuilder.DropTable(
                name: "roles");

            migrationBuilder.DropTable(
                name: "usuarios");
        }
    }
}
