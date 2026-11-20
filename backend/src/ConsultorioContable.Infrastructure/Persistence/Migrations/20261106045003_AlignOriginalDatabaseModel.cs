using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace ConsultorioContable.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AlignOriginalDatabaseModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_documentos_caso_casos_asesoria_caso_id",
                table: "documentos_caso");

            migrationBuilder.DropIndex(
                name: "IX_asignaciones_caso_caso_id",
                table: "asignaciones_caso");

            migrationBuilder.DropPrimaryKey(
                name: "PK_documentos_caso",
                table: "documentos_caso");

            migrationBuilder.DropPrimaryKey(
                name: "PK_auditoria_eventos",
                table: "auditoria_eventos");

            migrationBuilder.RenameTable(
                name: "documentos_caso",
                newName: "documentos");

            migrationBuilder.RenameTable(
                name: "auditoria_eventos",
                newName: "registros_auditoria");

            migrationBuilder.RenameIndex(
                name: "IX_documentos_caso_caso_id",
                table: "documentos",
                newName: "IX_documentos_caso_id");

            migrationBuilder.AddColumn<Guid>(
                name: "actualizado_por",
                table: "solicitudes_asesoria",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "creado_por",
                table: "solicitudes_asesoria",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "empresa_id",
                table: "solicitudes_asesoria",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "estado_catalogo_id",
                table: "solicitudes_asesoria",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "fecha_solicitud",
                table: "solicitudes_asesoria",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "cargo_o_relacion",
                table: "solicitantes",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "direccion",
                table: "solicitantes",
                type: "nvarchar(250)",
                maxLength: 250,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "empresa_id",
                table: "solicitantes",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "municipio",
                table: "solicitantes",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "creado_en",
                table: "notificaciones",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "entidad_id",
                table: "notificaciones",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "entidad_relacionada",
                table: "notificaciones",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "leido_en",
                table: "notificaciones",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "mensaje",
                table: "notificaciones",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "usuario_id",
                table: "notificaciones",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "actualizado_por",
                table: "casos_asesoria",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "creado_en",
                table: "casos_asesoria",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "creado_por",
                table: "casos_asesoria",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "descripcion",
                table: "casos_asesoria",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "estado_id",
                table: "casos_asesoria",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "fecha_apertura",
                table: "casos_asesoria",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "fecha_cierre",
                table: "casos_asesoria",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "solicitud_origen_id",
                table: "casos_asesoria",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "titulo",
                table: "casos_asesoria",
                type: "nvarchar(250)",
                maxLength: 250,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "asignado_por",
                table: "asignaciones_caso",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "comentario",
                table: "asignaciones_caso",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "desasignado_en",
                table: "asignaciones_caso",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "docente_id",
                table: "asignaciones_caso",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "estudiante_id",
                table: "asignaciones_caso",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "avance_id",
                table: "documentos",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "cargado_por",
                table: "documentos",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "categoria_id",
                table: "documentos",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "creado_en",
                table: "documentos",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "descripcion",
                table: "documentos",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "es_vigente",
                table: "documentos",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "evaluacion_id",
                table: "documentos",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "extension",
                table: "documentos",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "grupo_documento_id",
                table: "documentos",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "hash_archivo",
                table: "documentos",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "numero_version",
                table: "documentos",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ruta_almacenamiento",
                table: "documentos",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "solicitud_id",
                table: "documentos",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "agente_usuario",
                table: "registros_auditoria",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "direccion_ip",
                table: "registros_auditoria",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "entidad_id",
                table: "registros_auditoria",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "tipo_entidad",
                table: "registros_auditoria",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "usuario_id",
                table: "registros_auditoria",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "PK_documentos",
                table: "documentos",
                column: "id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_registros_auditoria",
                table: "registros_auditoria",
                column: "id");

            migrationBuilder.CreateTable(
                name: "categorias_documento",
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
                    table.PrimaryKey("PK_categorias_documento", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "docentes",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    usuario_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    codigo_docente = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    nombre_completo = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    correo_institucional = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    telefono = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    activo = table.Column<bool>(type: "bit", nullable: false),
                    creado_en = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    actualizado_en = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_docentes", x => x.id);
                    table.ForeignKey(
                        name: "FK_docentes_usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "empresas",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    tipo_documento = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    numero_documento = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    razon_social = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    direccion = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    municipio = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    telefono = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    correo_electronico = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    representante_legal = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    activo = table.Column<bool>(type: "bit", nullable: false),
                    creado_por = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    actualizado_por = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    creado_en = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    actualizado_en = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_empresas", x => x.id);
                    table.CheckConstraint("ck_empresa_tipo_doc", "[tipo_documento] IN ('NIT','CC','CE')");
                    table.ForeignKey(
                        name: "FK_empresas_usuarios_actualizado_por",
                        column: x => x.actualizado_por,
                        principalTable: "usuarios",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_empresas_usuarios_creado_por",
                        column: x => x.creado_por,
                        principalTable: "usuarios",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "estados_caso",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    codigo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    nombre = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    descripcion = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    color = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    orden = table.Column<short>(type: "smallint", nullable: false),
                    terminal = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_estados_caso", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "estados_solicitud",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    codigo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    nombre = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    descripcion = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    color = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    orden = table.Column<short>(type: "smallint", nullable: false),
                    terminal = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_estados_solicitud", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "estudiantes",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    usuario_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    codigo_estudiante = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    nombre_completo = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    correo_institucional = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    telefono = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    programa_academico = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    semestre = table.Column<int>(type: "int", nullable: true),
                    activo = table.Column<bool>(type: "bit", nullable: false),
                    creado_en = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    actualizado_en = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_estudiantes", x => x.id);
                    table.ForeignKey(
                        name: "FK_estudiantes_usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "evaluaciones_servicio",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    caso_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    solicitante_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    calificacion_general = table.Column<int>(type: "int", nullable: false),
                    claridad_orientacion = table.Column<int>(type: "int", nullable: true),
                    oportunidad_atencion = table.Column<int>(type: "int", nullable: true),
                    utilidad_servicio = table.Column<int>(type: "int", nullable: true),
                    comentario = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    recomendaciones = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    creado_en = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_evaluaciones_servicio", x => x.id);
                    table.CheckConstraint("ck_eval_claridad", "[claridad_orientacion] IS NULL OR [claridad_orientacion] BETWEEN 1 AND 5");
                    table.CheckConstraint("ck_eval_general", "[calificacion_general] BETWEEN 1 AND 5");
                    table.CheckConstraint("ck_eval_oportunidad", "[oportunidad_atencion] IS NULL OR [oportunidad_atencion] BETWEEN 1 AND 5");
                    table.CheckConstraint("ck_eval_utilidad", "[utilidad_servicio] IS NULL OR [utilidad_servicio] BETWEEN 1 AND 5");
                    table.ForeignKey(
                        name: "FK_evaluaciones_servicio_casos_asesoria_caso_id",
                        column: x => x.caso_id,
                        principalTable: "casos_asesoria",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_evaluaciones_servicio_solicitantes_solicitante_id",
                        column: x => x.solicitante_id,
                        principalTable: "solicitantes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "revisiones_solicitud",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    solicitud_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    revisado_por = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    resultado = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    observacion = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    fecha_revision = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_revisiones_solicitud", x => x.id);
                    table.CheckConstraint("ck_revsol_resultado", "[resultado] IN ('aprobada','rechazada','requiere_correccion')");
                    table.ForeignKey(
                        name: "FK_revisiones_solicitud_solicitudes_asesoria_solicitud_id",
                        column: x => x.solicitud_id,
                        principalTable: "solicitudes_asesoria",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_revisiones_solicitud_usuarios_revisado_por",
                        column: x => x.revisado_por,
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "trazabilidad_eventos",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    tipo_evento = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    entidad_tipo = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    entidad_id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    estado_anterior = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    estado_nuevo = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    descripcion = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    observacion = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    usuario_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    fecha_evento = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_trazabilidad_eventos", x => x.id);
                    table.ForeignKey(
                        name: "FK_trazabilidad_eventos_usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "avances",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    caso_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    estudiante_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    tipo_avance = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    titulo = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: false),
                    descripcion = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    resultado = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    recomendacion = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ocurrido_en = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    creado_por = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    actualizado_por = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    creado_en = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    actualizado_en = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_avances", x => x.id);
                    table.CheckConstraint("ck_avance_tipo", "[tipo_avance] IN ('reunion','diagnostico','orientacion','revision_documental','recomendacion','cierre','otro')");
                    table.ForeignKey(
                        name: "FK_avances_casos_asesoria_caso_id",
                        column: x => x.caso_id,
                        principalTable: "casos_asesoria",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_avances_estudiantes_estudiante_id",
                        column: x => x.estudiante_id,
                        principalTable: "estudiantes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_avances_usuarios_actualizado_por",
                        column: x => x.actualizado_por,
                        principalTable: "usuarios",
                        principalColumn: "id");
                    table.ForeignKey(
                        name: "FK_avances_usuarios_creado_por",
                        column: x => x.creado_por,
                        principalTable: "usuarios",
                        principalColumn: "id");
                });

            migrationBuilder.CreateTable(
                name: "revisiones_avance",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    avance_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    docente_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    resultado = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    observacion = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    fecha_revision = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_revisiones_avance", x => x.id);
                    table.CheckConstraint("ck_revavance_resultado", "[resultado] IN ('aprobado','rechazado','requiere_correccion')");
                    table.ForeignKey(
                        name: "FK_revisiones_avance_avances_avance_id",
                        column: x => x.avance_id,
                        principalTable: "avances",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_revisiones_avance_docentes_docente_id",
                        column: x => x.docente_id,
                        principalTable: "docentes",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "categorias_documento",
                columns: new[] { "id", "activo", "codigo", "descripcion", "nombre", "orden" },
                values: new object[,]
                {
                    { new Guid("80000000-0000-0000-0000-000000000001"), true, "DOC_IDENT", null, "Documento de identificación", (short)1 },
                    { new Guid("80000000-0000-0000-0000-000000000002"), true, "SOPORTE_SOL", null, "Soporte de solicitud", (short)2 },
                    { new Guid("80000000-0000-0000-0000-000000000003"), true, "FORMATO_INST", null, "Formato institucional", (short)3 },
                    { new Guid("80000000-0000-0000-0000-000000000004"), true, "EVID_AVANCE", null, "Evidencia de avance", (short)4 },
                    { new Guid("80000000-0000-0000-0000-000000000005"), true, "DOC_CONTABLE", null, "Documento contable", (short)5 },
                    { new Guid("80000000-0000-0000-0000-000000000006"), true, "INFORME_FINAL", null, "Reporte final", (short)6 },
                    { new Guid("80000000-0000-0000-0000-000000000007"), true, "EVAL_SERVICIO", null, "Evaluación del servicio", (short)7 },
                    { new Guid("80000000-0000-0000-0000-000000000008"), true, "OTRO", null, "Otro", (short)8 }
                });

            migrationBuilder.InsertData(
                table: "estados_caso",
                columns: new[] { "id", "codigo", "color", "descripcion", "nombre", "orden", "terminal" },
                values: new object[,]
                {
                    { new Guid("70000000-0000-0000-0000-000000000001"), "ASIGNADO", null, null, "Asignado", (short)1, false },
                    { new Guid("70000000-0000-0000-0000-000000000002"), "EN_PROCESO", null, null, "En proceso", (short)2, false },
                    { new Guid("70000000-0000-0000-0000-000000000003"), "EN_REV_AVANCE", null, null, "En revisión de avances", (short)3, false },
                    { new Guid("70000000-0000-0000-0000-000000000004"), "PEND_CORREC", null, null, "Pendiente corrección", (short)4, false },
                    { new Guid("70000000-0000-0000-0000-000000000005"), "FINALIZADO", null, null, "Finalizado", (short)5, true },
                    { new Guid("70000000-0000-0000-0000-000000000006"), "CERRADO", null, null, "Cerrado", (short)6, true },
                    { new Guid("70000000-0000-0000-0000-000000000007"), "CANCELADO", null, null, "Cancelado", (short)7, true },
                    { new Guid("70000000-0000-0000-0000-000000000008"), "REABIERTO", null, null, "Reabierto", (short)8, false }
                });

            migrationBuilder.InsertData(
                table: "estados_solicitud",
                columns: new[] { "id", "codigo", "color", "descripcion", "nombre", "orden", "terminal" },
                values: new object[,]
                {
                    { new Guid("60000000-0000-0000-0000-000000000001"), "RADICADA", null, null, "Radicada", (short)1, false },
                    { new Guid("60000000-0000-0000-0000-000000000002"), "PEND_INFO", null, null, "Pendiente información", (short)2, false },
                    { new Guid("60000000-0000-0000-0000-000000000003"), "EN_REVISION", null, null, "En revisión", (short)3, false },
                    { new Guid("60000000-0000-0000-0000-000000000004"), "APROBADA", null, null, "Aprobada", (short)4, false },
                    { new Guid("60000000-0000-0000-0000-000000000005"), "RECHAZADA", null, null, "Rechazada", (short)5, true },
                    { new Guid("60000000-0000-0000-0000-000000000006"), "CANCELADA", null, null, "Cancelada", (short)6, true },
                    { new Guid("60000000-0000-0000-0000-000000000007"), "CONVERTIDA", null, null, "Convertida en caso", (short)7, true }
                });

            migrationBuilder.InsertData(
                table: "periodos_academicos",
                columns: new[] { "id", "activo", "codigo", "fecha_fin", "fecha_inicio", "nombre" },
                values: new object[,]
                {
                    { new Guid("10000000-0000-0000-0000-000000000002"), false, "2025-2", new DateOnly(2025, 12, 15), new DateOnly(2025, 8, 1), "Segundo semestre 2025" },
                    { new Guid("10000000-0000-0000-0000-000000000003"), false, "2026-1", new DateOnly(2026, 6, 15), new DateOnly(2026, 1, 20), "Primer semestre 2026" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_solicitudes_asesoria_actualizado_por",
                table: "solicitudes_asesoria",
                column: "actualizado_por");

            migrationBuilder.CreateIndex(
                name: "IX_solicitudes_asesoria_creado_por",
                table: "solicitudes_asesoria",
                column: "creado_por");

            migrationBuilder.CreateIndex(
                name: "IX_solicitudes_asesoria_empresa_id",
                table: "solicitudes_asesoria",
                column: "empresa_id");

            migrationBuilder.CreateIndex(
                name: "IX_solicitudes_asesoria_estado_catalogo_id",
                table: "solicitudes_asesoria",
                column: "estado_catalogo_id");

            migrationBuilder.CreateIndex(
                name: "IX_solicitantes_empresa_id",
                table: "solicitantes",
                column: "empresa_id");

            migrationBuilder.CreateIndex(
                name: "IX_notificaciones_usuario_id_leido_en",
                table: "notificaciones",
                columns: new[] { "usuario_id", "leido_en" });

            migrationBuilder.CreateIndex(
                name: "IX_casos_asesoria_actualizado_por",
                table: "casos_asesoria",
                column: "actualizado_por");

            migrationBuilder.CreateIndex(
                name: "IX_casos_asesoria_creado_por",
                table: "casos_asesoria",
                column: "creado_por");

            migrationBuilder.CreateIndex(
                name: "IX_casos_asesoria_estado_id",
                table: "casos_asesoria",
                column: "estado_id");

            migrationBuilder.CreateIndex(
                name: "IX_casos_asesoria_solicitud_origen_id",
                table: "casos_asesoria",
                column: "solicitud_origen_id",
                unique: true,
                filter: "[solicitud_origen_id] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_asignacion_docente_activo",
                table: "asignaciones_caso",
                column: "caso_id",
                unique: true,
                filter: "[docente_id] IS NOT NULL AND [desasignado_en] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_asignaciones_caso_asignado_por",
                table: "asignaciones_caso",
                column: "asignado_por");

            migrationBuilder.CreateIndex(
                name: "IX_asignaciones_caso_docente_id",
                table: "asignaciones_caso",
                column: "docente_id");

            migrationBuilder.CreateIndex(
                name: "IX_asignaciones_caso_estudiante_id",
                table: "asignaciones_caso",
                column: "estudiante_id");

            migrationBuilder.CreateIndex(
                name: "ux_asignacion_estudiante_activa",
                table: "asignaciones_caso",
                columns: new[] { "caso_id", "estudiante_id" },
                unique: true,
                filter: "[estudiante_id] IS NOT NULL AND [desasignado_en] IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_documentos_avance_id",
                table: "documentos",
                column: "avance_id");

            migrationBuilder.CreateIndex(
                name: "IX_documentos_cargado_por",
                table: "documentos",
                column: "cargado_por");

            migrationBuilder.CreateIndex(
                name: "IX_documentos_categoria_id",
                table: "documentos",
                column: "categoria_id");

            migrationBuilder.CreateIndex(
                name: "IX_documentos_evaluacion_id",
                table: "documentos",
                column: "evaluacion_id");

            migrationBuilder.CreateIndex(
                name: "IX_documentos_grupo_documento_id_numero_version",
                table: "documentos",
                columns: new[] { "grupo_documento_id", "numero_version" },
                unique: true,
                filter: "[grupo_documento_id] IS NOT NULL AND [numero_version] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_documentos_solicitud_id",
                table: "documentos",
                column: "solicitud_id");

            migrationBuilder.CreateIndex(
                name: "IX_registros_auditoria_tipo_entidad_entidad_id",
                table: "registros_auditoria",
                columns: new[] { "tipo_entidad", "entidad_id" });

            migrationBuilder.CreateIndex(
                name: "IX_registros_auditoria_usuario_id",
                table: "registros_auditoria",
                column: "usuario_id");

            migrationBuilder.CreateIndex(
                name: "IX_avances_actualizado_por",
                table: "avances",
                column: "actualizado_por");

            migrationBuilder.CreateIndex(
                name: "IX_avances_caso_id",
                table: "avances",
                column: "caso_id");

            migrationBuilder.CreateIndex(
                name: "IX_avances_creado_por",
                table: "avances",
                column: "creado_por");

            migrationBuilder.CreateIndex(
                name: "IX_avances_estudiante_id",
                table: "avances",
                column: "estudiante_id");

            migrationBuilder.CreateIndex(
                name: "IX_categorias_documento_codigo",
                table: "categorias_documento",
                column: "codigo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_categorias_documento_nombre",
                table: "categorias_documento",
                column: "nombre",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_docentes_usuario_id",
                table: "docentes",
                column: "usuario_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_empresas_actualizado_por",
                table: "empresas",
                column: "actualizado_por");

            migrationBuilder.CreateIndex(
                name: "IX_empresas_creado_por",
                table: "empresas",
                column: "creado_por");

            migrationBuilder.CreateIndex(
                name: "IX_empresas_tipo_documento_numero_documento",
                table: "empresas",
                columns: new[] { "tipo_documento", "numero_documento" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_estados_caso_codigo",
                table: "estados_caso",
                column: "codigo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_estados_caso_nombre",
                table: "estados_caso",
                column: "nombre",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_estados_solicitud_codigo",
                table: "estados_solicitud",
                column: "codigo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_estados_solicitud_nombre",
                table: "estados_solicitud",
                column: "nombre",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_estudiantes_usuario_id",
                table: "estudiantes",
                column: "usuario_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_evaluaciones_servicio_caso_id",
                table: "evaluaciones_servicio",
                column: "caso_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_evaluaciones_servicio_solicitante_id",
                table: "evaluaciones_servicio",
                column: "solicitante_id");

            migrationBuilder.CreateIndex(
                name: "IX_revisiones_avance_avance_id",
                table: "revisiones_avance",
                column: "avance_id");

            migrationBuilder.CreateIndex(
                name: "IX_revisiones_avance_docente_id",
                table: "revisiones_avance",
                column: "docente_id");

            migrationBuilder.CreateIndex(
                name: "IX_revisiones_solicitud_revisado_por",
                table: "revisiones_solicitud",
                column: "revisado_por");

            migrationBuilder.CreateIndex(
                name: "IX_revisiones_solicitud_solicitud_id",
                table: "revisiones_solicitud",
                column: "solicitud_id");

            migrationBuilder.CreateIndex(
                name: "IX_trazabilidad_eventos_entidad_tipo_entidad_id",
                table: "trazabilidad_eventos",
                columns: new[] { "entidad_tipo", "entidad_id" });

            migrationBuilder.CreateIndex(
                name: "IX_trazabilidad_eventos_fecha_evento",
                table: "trazabilidad_eventos",
                column: "fecha_evento");

            migrationBuilder.CreateIndex(
                name: "IX_trazabilidad_eventos_tipo_evento",
                table: "trazabilidad_eventos",
                column: "tipo_evento");

            migrationBuilder.CreateIndex(
                name: "IX_trazabilidad_eventos_usuario_id",
                table: "trazabilidad_eventos",
                column: "usuario_id");

            migrationBuilder.AddForeignKey(
                name: "FK_asignaciones_caso_docentes_docente_id",
                table: "asignaciones_caso",
                column: "docente_id",
                principalTable: "docentes",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_asignaciones_caso_estudiantes_estudiante_id",
                table: "asignaciones_caso",
                column: "estudiante_id",
                principalTable: "estudiantes",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_asignaciones_caso_usuarios_asignado_por",
                table: "asignaciones_caso",
                column: "asignado_por",
                principalTable: "usuarios",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_casos_asesoria_estados_caso_estado_id",
                table: "casos_asesoria",
                column: "estado_id",
                principalTable: "estados_caso",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_casos_asesoria_solicitudes_asesoria_solicitud_origen_id",
                table: "casos_asesoria",
                column: "solicitud_origen_id",
                principalTable: "solicitudes_asesoria",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_casos_asesoria_usuarios_actualizado_por",
                table: "casos_asesoria",
                column: "actualizado_por",
                principalTable: "usuarios",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_casos_asesoria_usuarios_creado_por",
                table: "casos_asesoria",
                column: "creado_por",
                principalTable: "usuarios",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_documentos_avances_avance_id",
                table: "documentos",
                column: "avance_id",
                principalTable: "avances",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_documentos_casos_asesoria_caso_id",
                table: "documentos",
                column: "caso_id",
                principalTable: "casos_asesoria",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_documentos_categorias_documento_categoria_id",
                table: "documentos",
                column: "categoria_id",
                principalTable: "categorias_documento",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_documentos_evaluaciones_servicio_evaluacion_id",
                table: "documentos",
                column: "evaluacion_id",
                principalTable: "evaluaciones_servicio",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_documentos_solicitudes_asesoria_solicitud_id",
                table: "documentos",
                column: "solicitud_id",
                principalTable: "solicitudes_asesoria",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_documentos_usuarios_cargado_por",
                table: "documentos",
                column: "cargado_por",
                principalTable: "usuarios",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_notificaciones_usuarios_usuario_id",
                table: "notificaciones",
                column: "usuario_id",
                principalTable: "usuarios",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_registros_auditoria_usuarios_usuario_id",
                table: "registros_auditoria",
                column: "usuario_id",
                principalTable: "usuarios",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_solicitantes_empresas_empresa_id",
                table: "solicitantes",
                column: "empresa_id",
                principalTable: "empresas",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_solicitudes_asesoria_empresas_empresa_id",
                table: "solicitudes_asesoria",
                column: "empresa_id",
                principalTable: "empresas",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_solicitudes_asesoria_estados_solicitud_estado_catalogo_id",
                table: "solicitudes_asesoria",
                column: "estado_catalogo_id",
                principalTable: "estados_solicitud",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_solicitudes_asesoria_usuarios_actualizado_por",
                table: "solicitudes_asesoria",
                column: "actualizado_por",
                principalTable: "usuarios",
                principalColumn: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_solicitudes_asesoria_usuarios_creado_por",
                table: "solicitudes_asesoria",
                column: "creado_por",
                principalTable: "usuarios",
                principalColumn: "id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_asignaciones_caso_docentes_docente_id",
                table: "asignaciones_caso");

            migrationBuilder.DropForeignKey(
                name: "FK_asignaciones_caso_estudiantes_estudiante_id",
                table: "asignaciones_caso");

            migrationBuilder.DropForeignKey(
                name: "FK_asignaciones_caso_usuarios_asignado_por",
                table: "asignaciones_caso");

            migrationBuilder.DropForeignKey(
                name: "FK_casos_asesoria_estados_caso_estado_id",
                table: "casos_asesoria");

            migrationBuilder.DropForeignKey(
                name: "FK_casos_asesoria_solicitudes_asesoria_solicitud_origen_id",
                table: "casos_asesoria");

            migrationBuilder.DropForeignKey(
                name: "FK_casos_asesoria_usuarios_actualizado_por",
                table: "casos_asesoria");

            migrationBuilder.DropForeignKey(
                name: "FK_casos_asesoria_usuarios_creado_por",
                table: "casos_asesoria");

            migrationBuilder.DropForeignKey(
                name: "FK_documentos_avances_avance_id",
                table: "documentos");

            migrationBuilder.DropForeignKey(
                name: "FK_documentos_casos_asesoria_caso_id",
                table: "documentos");

            migrationBuilder.DropForeignKey(
                name: "FK_documentos_categorias_documento_categoria_id",
                table: "documentos");

            migrationBuilder.DropForeignKey(
                name: "FK_documentos_evaluaciones_servicio_evaluacion_id",
                table: "documentos");

            migrationBuilder.DropForeignKey(
                name: "FK_documentos_solicitudes_asesoria_solicitud_id",
                table: "documentos");

            migrationBuilder.DropForeignKey(
                name: "FK_documentos_usuarios_cargado_por",
                table: "documentos");

            migrationBuilder.DropForeignKey(
                name: "FK_notificaciones_usuarios_usuario_id",
                table: "notificaciones");

            migrationBuilder.DropForeignKey(
                name: "FK_registros_auditoria_usuarios_usuario_id",
                table: "registros_auditoria");

            migrationBuilder.DropForeignKey(
                name: "FK_solicitantes_empresas_empresa_id",
                table: "solicitantes");

            migrationBuilder.DropForeignKey(
                name: "FK_solicitudes_asesoria_empresas_empresa_id",
                table: "solicitudes_asesoria");

            migrationBuilder.DropForeignKey(
                name: "FK_solicitudes_asesoria_estados_solicitud_estado_catalogo_id",
                table: "solicitudes_asesoria");

            migrationBuilder.DropForeignKey(
                name: "FK_solicitudes_asesoria_usuarios_actualizado_por",
                table: "solicitudes_asesoria");

            migrationBuilder.DropForeignKey(
                name: "FK_solicitudes_asesoria_usuarios_creado_por",
                table: "solicitudes_asesoria");

            migrationBuilder.DropTable(
                name: "categorias_documento");

            migrationBuilder.DropTable(
                name: "empresas");

            migrationBuilder.DropTable(
                name: "estados_caso");

            migrationBuilder.DropTable(
                name: "estados_solicitud");

            migrationBuilder.DropTable(
                name: "evaluaciones_servicio");

            migrationBuilder.DropTable(
                name: "revisiones_avance");

            migrationBuilder.DropTable(
                name: "revisiones_solicitud");

            migrationBuilder.DropTable(
                name: "trazabilidad_eventos");

            migrationBuilder.DropTable(
                name: "avances");

            migrationBuilder.DropTable(
                name: "docentes");

            migrationBuilder.DropTable(
                name: "estudiantes");

            migrationBuilder.DropIndex(
                name: "IX_solicitudes_asesoria_actualizado_por",
                table: "solicitudes_asesoria");

            migrationBuilder.DropIndex(
                name: "IX_solicitudes_asesoria_creado_por",
                table: "solicitudes_asesoria");

            migrationBuilder.DropIndex(
                name: "IX_solicitudes_asesoria_empresa_id",
                table: "solicitudes_asesoria");

            migrationBuilder.DropIndex(
                name: "IX_solicitudes_asesoria_estado_catalogo_id",
                table: "solicitudes_asesoria");

            migrationBuilder.DropIndex(
                name: "IX_solicitantes_empresa_id",
                table: "solicitantes");

            migrationBuilder.DropIndex(
                name: "IX_notificaciones_usuario_id_leido_en",
                table: "notificaciones");

            migrationBuilder.DropIndex(
                name: "IX_casos_asesoria_actualizado_por",
                table: "casos_asesoria");

            migrationBuilder.DropIndex(
                name: "IX_casos_asesoria_creado_por",
                table: "casos_asesoria");

            migrationBuilder.DropIndex(
                name: "IX_casos_asesoria_estado_id",
                table: "casos_asesoria");

            migrationBuilder.DropIndex(
                name: "IX_casos_asesoria_solicitud_origen_id",
                table: "casos_asesoria");

            migrationBuilder.DropIndex(
                name: "ix_asignacion_docente_activo",
                table: "asignaciones_caso");

            migrationBuilder.DropIndex(
                name: "IX_asignaciones_caso_asignado_por",
                table: "asignaciones_caso");

            migrationBuilder.DropIndex(
                name: "IX_asignaciones_caso_docente_id",
                table: "asignaciones_caso");

            migrationBuilder.DropIndex(
                name: "IX_asignaciones_caso_estudiante_id",
                table: "asignaciones_caso");

            migrationBuilder.DropIndex(
                name: "ux_asignacion_estudiante_activa",
                table: "asignaciones_caso");

            migrationBuilder.DropPrimaryKey(
                name: "PK_registros_auditoria",
                table: "registros_auditoria");

            migrationBuilder.DropIndex(
                name: "IX_registros_auditoria_tipo_entidad_entidad_id",
                table: "registros_auditoria");

            migrationBuilder.DropIndex(
                name: "IX_registros_auditoria_usuario_id",
                table: "registros_auditoria");

            migrationBuilder.DropPrimaryKey(
                name: "PK_documentos",
                table: "documentos");

            migrationBuilder.DropIndex(
                name: "IX_documentos_avance_id",
                table: "documentos");

            migrationBuilder.DropIndex(
                name: "IX_documentos_cargado_por",
                table: "documentos");

            migrationBuilder.DropIndex(
                name: "IX_documentos_categoria_id",
                table: "documentos");

            migrationBuilder.DropIndex(
                name: "IX_documentos_evaluacion_id",
                table: "documentos");

            migrationBuilder.DropIndex(
                name: "IX_documentos_grupo_documento_id_numero_version",
                table: "documentos");

            migrationBuilder.DropIndex(
                name: "IX_documentos_solicitud_id",
                table: "documentos");

            migrationBuilder.DeleteData(
                table: "periodos_academicos",
                keyColumn: "id",
                keyValue: new Guid("10000000-0000-0000-0000-000000000002"));

            migrationBuilder.DeleteData(
                table: "periodos_academicos",
                keyColumn: "id",
                keyValue: new Guid("10000000-0000-0000-0000-000000000003"));

            migrationBuilder.DropColumn(
                name: "actualizado_por",
                table: "solicitudes_asesoria");

            migrationBuilder.DropColumn(
                name: "creado_por",
                table: "solicitudes_asesoria");

            migrationBuilder.DropColumn(
                name: "empresa_id",
                table: "solicitudes_asesoria");

            migrationBuilder.DropColumn(
                name: "estado_catalogo_id",
                table: "solicitudes_asesoria");

            migrationBuilder.DropColumn(
                name: "fecha_solicitud",
                table: "solicitudes_asesoria");

            migrationBuilder.DropColumn(
                name: "cargo_o_relacion",
                table: "solicitantes");

            migrationBuilder.DropColumn(
                name: "direccion",
                table: "solicitantes");

            migrationBuilder.DropColumn(
                name: "empresa_id",
                table: "solicitantes");

            migrationBuilder.DropColumn(
                name: "municipio",
                table: "solicitantes");

            migrationBuilder.DropColumn(
                name: "creado_en",
                table: "notificaciones");

            migrationBuilder.DropColumn(
                name: "entidad_id",
                table: "notificaciones");

            migrationBuilder.DropColumn(
                name: "entidad_relacionada",
                table: "notificaciones");

            migrationBuilder.DropColumn(
                name: "leido_en",
                table: "notificaciones");

            migrationBuilder.DropColumn(
                name: "mensaje",
                table: "notificaciones");

            migrationBuilder.DropColumn(
                name: "usuario_id",
                table: "notificaciones");

            migrationBuilder.DropColumn(
                name: "actualizado_por",
                table: "casos_asesoria");

            migrationBuilder.DropColumn(
                name: "creado_en",
                table: "casos_asesoria");

            migrationBuilder.DropColumn(
                name: "creado_por",
                table: "casos_asesoria");

            migrationBuilder.DropColumn(
                name: "descripcion",
                table: "casos_asesoria");

            migrationBuilder.DropColumn(
                name: "estado_id",
                table: "casos_asesoria");

            migrationBuilder.DropColumn(
                name: "fecha_apertura",
                table: "casos_asesoria");

            migrationBuilder.DropColumn(
                name: "fecha_cierre",
                table: "casos_asesoria");

            migrationBuilder.DropColumn(
                name: "solicitud_origen_id",
                table: "casos_asesoria");

            migrationBuilder.DropColumn(
                name: "titulo",
                table: "casos_asesoria");

            migrationBuilder.DropColumn(
                name: "asignado_por",
                table: "asignaciones_caso");

            migrationBuilder.DropColumn(
                name: "comentario",
                table: "asignaciones_caso");

            migrationBuilder.DropColumn(
                name: "desasignado_en",
                table: "asignaciones_caso");

            migrationBuilder.DropColumn(
                name: "docente_id",
                table: "asignaciones_caso");

            migrationBuilder.DropColumn(
                name: "estudiante_id",
                table: "asignaciones_caso");

            migrationBuilder.DropColumn(
                name: "agente_usuario",
                table: "registros_auditoria");

            migrationBuilder.DropColumn(
                name: "direccion_ip",
                table: "registros_auditoria");

            migrationBuilder.DropColumn(
                name: "entidad_id",
                table: "registros_auditoria");

            migrationBuilder.DropColumn(
                name: "tipo_entidad",
                table: "registros_auditoria");

            migrationBuilder.DropColumn(
                name: "usuario_id",
                table: "registros_auditoria");

            migrationBuilder.DropColumn(
                name: "avance_id",
                table: "documentos");

            migrationBuilder.DropColumn(
                name: "cargado_por",
                table: "documentos");

            migrationBuilder.DropColumn(
                name: "categoria_id",
                table: "documentos");

            migrationBuilder.DropColumn(
                name: "creado_en",
                table: "documentos");

            migrationBuilder.DropColumn(
                name: "descripcion",
                table: "documentos");

            migrationBuilder.DropColumn(
                name: "es_vigente",
                table: "documentos");

            migrationBuilder.DropColumn(
                name: "evaluacion_id",
                table: "documentos");

            migrationBuilder.DropColumn(
                name: "extension",
                table: "documentos");

            migrationBuilder.DropColumn(
                name: "grupo_documento_id",
                table: "documentos");

            migrationBuilder.DropColumn(
                name: "hash_archivo",
                table: "documentos");

            migrationBuilder.DropColumn(
                name: "numero_version",
                table: "documentos");

            migrationBuilder.DropColumn(
                name: "ruta_almacenamiento",
                table: "documentos");

            migrationBuilder.DropColumn(
                name: "solicitud_id",
                table: "documentos");

            migrationBuilder.RenameTable(
                name: "registros_auditoria",
                newName: "auditoria_eventos");

            migrationBuilder.RenameTable(
                name: "documentos",
                newName: "documentos_caso");

            migrationBuilder.RenameIndex(
                name: "IX_documentos_caso_id",
                table: "documentos_caso",
                newName: "IX_documentos_caso_caso_id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_auditoria_eventos",
                table: "auditoria_eventos",
                column: "id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_documentos_caso",
                table: "documentos_caso",
                column: "id");

            migrationBuilder.CreateIndex(
                name: "IX_asignaciones_caso_caso_id",
                table: "asignaciones_caso",
                column: "caso_id");

            migrationBuilder.AddForeignKey(
                name: "FK_documentos_caso_casos_asesoria_caso_id",
                table: "documentos_caso",
                column: "caso_id",
                principalTable: "casos_asesoria",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
