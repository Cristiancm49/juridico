using System.Text;
using ConsultorioContable.Domain.Solicitudes;
using ConsultorioContable.Infrastructure.Identity;
using ConsultorioContable.Infrastructure.Persistence.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace ConsultorioContable.Infrastructure.Persistence;

public sealed class ConsultorioDbContext(
    DbContextOptions<ConsultorioDbContext> options)
    : IdentityDbContext<ApplicationUser, ApplicationRole, Guid>(options)
{
    public DbSet<SolicitudAsesoria> Solicitudes => Set<SolicitudAsesoria>();
    public DbSet<SolicitanteRecord> Solicitantes => Set<SolicitanteRecord>();
    public DbSet<AreaAsesoriaRecord> AreasAsesoria => Set<AreaAsesoriaRecord>();
    public DbSet<PeriodoAcademicoRecord> PeriodosAcademicos => Set<PeriodoAcademicoRecord>();
    public DbSet<CasoRecord> Casos => Set<CasoRecord>();
    public DbSet<AsignacionRecord> Asignaciones => Set<AsignacionRecord>();
    public DbSet<SesionRecord> Sesiones => Set<SesionRecord>();
    public DbSet<DocumentoRecord> Documentos => Set<DocumentoRecord>();
    public DbSet<NotificacionRecord> Notificaciones => Set<NotificacionRecord>();
    public DbSet<AuditoriaRecord> Auditoria => Set<AuditoriaRecord>();
    public DbSet<EmpresaRecord> Empresas => Set<EmpresaRecord>();
    public DbSet<DocenteRecord> Docentes => Set<DocenteRecord>();
    public DbSet<EstudianteRecord> Estudiantes => Set<EstudianteRecord>();
    public DbSet<EstadoSolicitudRecord> EstadosSolicitud => Set<EstadoSolicitudRecord>();
    public DbSet<EstadoCasoRecord> EstadosCaso => Set<EstadoCasoRecord>();
    public DbSet<CategoriaDocumentoRecord> CategoriasDocumento => Set<CategoriaDocumentoRecord>();
    public DbSet<RevisionSolicitudRecord> RevisionesSolicitud => Set<RevisionSolicitudRecord>();
    public DbSet<TrazabilidadEventoRecord> TrazabilidadEventos => Set<TrazabilidadEventoRecord>();
    public DbSet<EvaluacionServicioRecord> EvaluacionesServicio => Set<EvaluacionServicioRecord>();
    public DbSet<AvanceRecord> Avances => Set<AvanceRecord>();
    public DbSet<RevisionAvanceRecord> RevisionesAvance => Set<RevisionAvanceRecord>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        ConfigureIdentity(builder);
        ConfigureCatalogs(builder);
        ConfigureSolicitantes(builder);
        ConfigureSolicitudes(builder);
        ConfigureOperationalModules(builder);
        ConfigureOriginalModel(builder);
        ApplySnakeCaseColumns(builder);
    }

    private static void ConfigureIdentity(ModelBuilder builder)
    {
        builder.Entity<ApplicationUser>(entity =>
        {
            entity.ToTable("usuarios");
            entity.Property(x => x.NombreCompleto).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Activo).HasDefaultValue(true);
            entity.Property(x => x.DebeCambiarContrasena).HasDefaultValue(false);
            entity.Property(x => x.CreadoEn).HasColumnType("datetimeoffset");
            entity.Property(x => x.ActualizadoEn).HasColumnType("datetimeoffset");
            entity.Property(x => x.UltimoAccesoEn).HasColumnType("datetimeoffset");
            entity.HasIndex(x => x.NormalizedEmail)
                .HasDatabaseName("EmailIndex")
                .IsUnique()
                .HasFilter("[normalized_email] IS NOT NULL");
        });

        builder.Entity<ApplicationRole>(entity =>
        {
            entity.ToTable("roles");
            entity.Property(x => x.Descripcion).HasMaxLength(300);
            entity.Property(x => x.RolSistema).HasDefaultValue(true);
            entity.Property(x => x.CreadoEn).HasColumnType("datetimeoffset");
            entity.Property(x => x.ActualizadoEn).HasColumnType("datetimeoffset");
            entity.HasData(RoleSeed.Roles);
        });

        builder.Entity<IdentityUserRole<Guid>>().ToTable("usuarios_roles");
        builder.Entity<IdentityUserClaim<Guid>>().ToTable("usuarios_claims");
        builder.Entity<IdentityUserLogin<Guid>>().ToTable("usuarios_logins");
        builder.Entity<IdentityUserToken<Guid>>().ToTable("usuarios_tokens");
        builder.Entity<IdentityRoleClaim<Guid>>().ToTable("roles_claims");
    }

    private static void ConfigureCatalogs(ModelBuilder builder)
    {
        builder.Entity<AreaAsesoriaRecord>(entity =>
        {
            entity.ToTable("areas_asesoria");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Codigo).HasMaxLength(50).IsRequired();
            entity.Property(x => x.Nombre).HasMaxLength(150).IsRequired();
            entity.Property(x => x.Descripcion).HasMaxLength(300);
            entity.HasIndex(x => x.Codigo).IsUnique();
            entity.HasIndex(x => x.Nombre).IsUnique();
            entity.HasData(CatalogSeed.Areas);
        });

        builder.Entity<PeriodoAcademicoRecord>(entity =>
        {
            entity.ToTable(
                "periodos_academicos",
                table => table.HasCheckConstraint(
                    "ck_periodo_fechas",
                    "[fecha_fin] > [fecha_inicio]"));
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Codigo).HasMaxLength(20).IsRequired();
            entity.Property(x => x.Nombre).HasMaxLength(50).IsRequired();
            entity.HasIndex(x => x.Codigo).IsUnique();
            entity.HasIndex(x => x.Activo)
                .HasDatabaseName("ux_periodo_academico_activo")
                .IsUnique()
                .HasFilter("[activo] = 1");
            entity.HasData(CatalogSeed.Periodos);
        });
    }

    private static void ConfigureSolicitantes(ModelBuilder builder)
    {
        builder.Entity<SolicitanteRecord>(entity =>
        {
            entity.ToTable(
                "solicitantes",
                table => table.HasCheckConstraint(
                    "ck_solicitante_tipo_documento",
                    "[tipo_documento] IN ('CC','CE','TI','NIT')"));
            entity.HasKey(x => x.Id);
            entity.Property(x => x.TipoDocumento).HasMaxLength(20).IsRequired();
            entity.Property(x => x.NumeroDocumento).HasMaxLength(50).IsRequired();
            entity.Property(x => x.NombreCompleto).HasMaxLength(200).IsRequired();
            entity.Property(x => x.CorreoElectronico).HasMaxLength(150);
            entity.Property(x => x.Telefono).HasMaxLength(50);
            entity.Property(x => x.Direccion).HasMaxLength(250);
            entity.Property(x => x.Municipio).HasMaxLength(100);
            entity.Property(x => x.CargoORelacion).HasMaxLength(150);
            entity.Property(x => x.CreadoEn).HasColumnType("datetimeoffset");
            entity.Property(x => x.ActualizadoEn).HasColumnType("datetimeoffset");
            entity.HasIndex(x => new { x.TipoDocumento, x.NumeroDocumento }).IsUnique();
            entity.HasOne<ApplicationUser>()
                .WithMany()
                .HasForeignKey(x => x.UsuarioId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne<EmpresaRecord>()
                .WithMany()
                .HasForeignKey(x => x.EmpresaId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }

    private static void ConfigureSolicitudes(ModelBuilder builder)
    {
        builder.Entity<SolicitudAsesoria>(entity =>
        {
            entity.ToTable(
                "solicitudes_asesoria",
                table =>
                {
                    table.HasCheckConstraint(
                        "ck_solicitud_canal",
                        "[canal_recepcion] IN ('Web','Presencial','Correo','Telefono','Otro')");
                    table.HasCheckConstraint(
                        "ck_solicitud_estado",
                        "[estado] IN ('Radicada','PendienteInformacion','EnRevision','Aprobada','Rechazada','Cancelada','Convertida')");
                });

            entity.HasKey(x => x.Id);
            entity.Property(x => x.Radicado).HasMaxLength(50).IsRequired();
            entity.Property(x => x.Asunto).HasMaxLength(250).IsRequired();
            entity.Property(x => x.DescripcionNecesidad).HasMaxLength(4_000).IsRequired();
            entity.Property(x => x.CanalRecepcion).HasConversion<string>().HasMaxLength(50);
            entity.Property(x => x.Estado).HasConversion<string>().HasMaxLength(50);
            entity.Property(x => x.CreadoEn).HasColumnType("datetimeoffset");
            entity.Property(x => x.ActualizadoEn).HasColumnType("datetimeoffset");
            entity.Property<byte[]>("Version")
                .IsRowVersion()
                .IsRequired()
                .HasColumnName("version");

            entity.HasIndex(x => x.Radicado).IsUnique();
            entity.HasIndex(x => x.Estado);
            entity.HasIndex(x => x.CreadoEn);

            entity.HasOne<SolicitanteRecord>()
                .WithMany()
                .HasForeignKey(x => x.SolicitanteId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<AreaAsesoriaRecord>()
                .WithMany()
                .HasForeignKey(x => x.AreaAsesoriaId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<PeriodoAcademicoRecord>()
                .WithMany()
                .HasForeignKey(x => x.PeriodoAcademicoId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.Property<Guid?>("EmpresaId");
            entity.Property<Guid?>("EstadoCatalogoId");
            entity.Property<DateOnly?>("FechaSolicitud").HasColumnType("date");
            entity.Property<Guid?>("CreadoPor");
            entity.Property<Guid?>("ActualizadoPor");
            entity.HasOne<EmpresaRecord>().WithMany().HasForeignKey("EmpresaId").OnDelete(DeleteBehavior.SetNull);
            entity.HasOne<EstadoSolicitudRecord>().WithMany().HasForeignKey("EstadoCatalogoId").OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<ApplicationUser>().WithMany().HasForeignKey("CreadoPor").OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<ApplicationUser>().WithMany().HasForeignKey("ActualizadoPor").OnDelete(DeleteBehavior.NoAction);
        });
    }

    private static void ConfigureOperationalModules(ModelBuilder builder)
    {
        builder.Entity<CasoRecord>(entity =>
        {
            entity.ToTable("casos_asesoria");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Numero).HasMaxLength(50).IsRequired();
            entity.Property(x => x.Responsable).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Estado).HasMaxLength(50).IsRequired();
            entity.Property(x => x.Titulo).HasMaxLength(250);
            entity.Property(x => x.FechaApertura).HasColumnType("date");
            entity.Property(x => x.FechaCierre).HasColumnType("date");
            entity.Property(x => x.CreadoEn).HasColumnType("datetimeoffset");
            entity.Property(x => x.ActualizadoEn).HasColumnType("datetimeoffset");
            entity.HasIndex(x => x.Numero).IsUnique();
            entity.HasIndex(x => x.SolicitudOrigenId).IsUnique().HasFilter("[solicitud_origen_id] IS NOT NULL");
            entity.HasOne<SolicitanteRecord>().WithMany().HasForeignKey(x => x.SolicitanteId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<AreaAsesoriaRecord>().WithMany().HasForeignKey(x => x.AreaAsesoriaId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<SolicitudAsesoria>().WithOne().HasForeignKey<CasoRecord>(x => x.SolicitudOrigenId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<EstadoCasoRecord>().WithMany().HasForeignKey(x => x.EstadoId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.CreadoPor).OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.ActualizadoPor).OnDelete(DeleteBehavior.NoAction);
        });

        builder.Entity<AsignacionRecord>(entity =>
        {
            entity.ToTable("asignaciones_caso");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Area).HasMaxLength(150).IsRequired();
            entity.Property(x => x.Docente).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Estudiante).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Estado).HasMaxLength(50).IsRequired();
            entity.Property(x => x.AsignadoEn).HasColumnType("datetimeoffset");
            entity.Property(x => x.DesasignadoEn).HasColumnType("datetimeoffset");
            entity.HasOne<CasoRecord>().WithMany().HasForeignKey(x => x.CasoId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<DocenteRecord>().WithMany().HasForeignKey(x => x.DocenteId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<EstudianteRecord>().WithMany().HasForeignKey(x => x.EstudianteId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.AsignadoPor).OnDelete(DeleteBehavior.NoAction);
            entity.HasIndex(x => x.CasoId)
                .HasDatabaseName("ix_asignacion_docente_activo")
                .IsUnique()
                .HasFilter("[docente_id] IS NOT NULL AND [desasignado_en] IS NULL");
            entity.HasIndex(x => new { x.CasoId, x.EstudianteId })
                .HasDatabaseName("ux_asignacion_estudiante_activa")
                .IsUnique()
                .HasFilter("[estudiante_id] IS NOT NULL AND [desasignado_en] IS NULL");
        });

        builder.Entity<SesionRecord>(entity =>
        {
            entity.ToTable("sesiones_asesoria");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Fecha).HasColumnType("datetimeoffset");
            entity.Property(x => x.Tipo).HasMaxLength(100).IsRequired();
            entity.Property(x => x.Responsable).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Estado).HasMaxLength(50).IsRequired();
            entity.HasOne<CasoRecord>().WithMany().HasForeignKey(x => x.CasoId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<DocumentoRecord>(entity =>
        {
            entity.ToTable("documentos");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Nombre).HasMaxLength(250).IsRequired();
            entity.Property(x => x.Categoria).HasMaxLength(100).IsRequired();
            entity.Property(x => x.Version).HasMaxLength(20).IsRequired();
            entity.Property(x => x.Responsable).HasMaxLength(200).IsRequired();
            entity.Property(x => x.RutaAlmacenamiento).HasMaxLength(500);
            entity.Property(x => x.Extension).HasMaxLength(20);
            entity.Property(x => x.HashArchivo).HasMaxLength(128);
            entity.Property(x => x.CreadoEn).HasColumnType("datetimeoffset");
            entity.Property(x => x.ActualizadoEn).HasColumnType("datetimeoffset");
            entity.Property(x => x.Contenido).HasColumnType("varbinary(max)");
            entity.Property(x => x.MimeType).HasMaxLength(150);
            entity.HasOne<CasoRecord>().WithMany().HasForeignKey(x => x.CasoId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<SolicitudAsesoria>().WithMany().HasForeignKey(x => x.SolicitudId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<AvanceRecord>().WithMany().HasForeignKey(x => x.AvanceId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<EvaluacionServicioRecord>().WithMany().HasForeignKey(x => x.EvaluacionId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<CategoriaDocumentoRecord>().WithMany().HasForeignKey(x => x.CategoriaId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.CargadoPor).OnDelete(DeleteBehavior.NoAction);
            entity.HasIndex(x => new { x.GrupoDocumentoId, x.NumeroVersion })
                .IsUnique()
                .HasFilter("[grupo_documento_id] IS NOT NULL AND [numero_version] IS NOT NULL");
        });

        builder.Entity<NotificacionRecord>(entity =>
        {
            entity.ToTable("notificaciones");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Fecha).HasColumnType("datetimeoffset");
            entity.Property(x => x.CreadoEn).HasColumnType("datetimeoffset");
            entity.Property(x => x.LeidoEn).HasColumnType("datetimeoffset");
            entity.Property(x => x.Destinatario).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Tipo).HasMaxLength(100).IsRequired();
            entity.Property(x => x.Asunto).HasMaxLength(250).IsRequired();
            entity.Property(x => x.Canal).HasMaxLength(50).IsRequired();
            entity.Property(x => x.Estado).HasMaxLength(50).IsRequired();
            entity.Property(x => x.EntidadRelacionada).HasMaxLength(100);
            entity.Property(x => x.EntidadId).HasMaxLength(100);
            entity.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.UsuarioId).OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(x => new { x.UsuarioId, x.LeidoEn });
        });

        builder.Entity<AuditoriaRecord>(entity =>
        {
            entity.ToTable("registros_auditoria");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Fecha).HasColumnType("datetimeoffset");
            entity.Property(x => x.Usuario).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Modulo).HasMaxLength(100).IsRequired();
            entity.Property(x => x.Operacion).HasMaxLength(150).IsRequired();
            entity.Property(x => x.Resultado).HasMaxLength(50).IsRequired();
            entity.Property(x => x.Detalle).HasMaxLength(500).IsRequired();
            entity.Property(x => x.TipoEntidad).HasMaxLength(100);
            entity.Property(x => x.EntidadId).HasMaxLength(100);
            entity.Property(x => x.DireccionIp).HasMaxLength(50);
            entity.Property(x => x.AgenteUsuario).HasMaxLength(500);
            entity.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.UsuarioId).OnDelete(DeleteBehavior.SetNull);
            entity.HasIndex(x => x.UsuarioId);
            entity.HasIndex(x => new { x.TipoEntidad, x.EntidadId });
        });
    }

    private static void ConfigureOriginalModel(ModelBuilder builder)
    {
        builder.Entity<EmpresaRecord>(entity =>
        {
            entity.ToTable(
                "empresas",
                table => table.HasCheckConstraint(
                    "ck_empresa_tipo_doc",
                    "[tipo_documento] IN ('NIT','CC','CE')"));
            entity.HasKey(x => x.Id);
            entity.Property(x => x.TipoDocumento).HasMaxLength(20).IsRequired();
            entity.Property(x => x.NumeroDocumento).HasMaxLength(50).IsRequired();
            entity.Property(x => x.RazonSocial).HasMaxLength(200).IsRequired();
            entity.Property(x => x.Direccion).HasMaxLength(250);
            entity.Property(x => x.Municipio).HasMaxLength(100);
            entity.Property(x => x.Telefono).HasMaxLength(50);
            entity.Property(x => x.CorreoElectronico).HasMaxLength(150);
            entity.Property(x => x.RepresentanteLegal).HasMaxLength(200);
            entity.Property(x => x.CreadoEn).HasColumnType("datetimeoffset");
            entity.Property(x => x.ActualizadoEn).HasColumnType("datetimeoffset");
            entity.HasIndex(x => new { x.TipoDocumento, x.NumeroDocumento }).IsUnique();
            entity.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.CreadoPor).OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.ActualizadoPor).OnDelete(DeleteBehavior.NoAction);
        });

        builder.Entity<DocenteRecord>(entity =>
        {
            entity.ToTable("docentes");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.CodigoDocente).HasMaxLength(50);
            entity.Property(x => x.NombreCompleto).HasMaxLength(200).IsRequired();
            entity.Property(x => x.CorreoInstitucional).HasMaxLength(150);
            entity.Property(x => x.Telefono).HasMaxLength(50);
            entity.Property(x => x.CreadoEn).HasColumnType("datetimeoffset");
            entity.Property(x => x.ActualizadoEn).HasColumnType("datetimeoffset");
            entity.HasIndex(x => x.UsuarioId).IsUnique();
            entity.HasOne<ApplicationUser>().WithOne().HasForeignKey<DocenteRecord>(x => x.UsuarioId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<EstudianteRecord>(entity =>
        {
            entity.ToTable("estudiantes");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.CodigoEstudiante).HasMaxLength(50);
            entity.Property(x => x.NombreCompleto).HasMaxLength(200).IsRequired();
            entity.Property(x => x.CorreoInstitucional).HasMaxLength(150);
            entity.Property(x => x.Telefono).HasMaxLength(50);
            entity.Property(x => x.ProgramaAcademico).HasMaxLength(150).IsRequired();
            entity.Property(x => x.CreadoEn).HasColumnType("datetimeoffset");
            entity.Property(x => x.ActualizadoEn).HasColumnType("datetimeoffset");
            entity.HasIndex(x => x.UsuarioId).IsUnique();
            entity.HasOne<ApplicationUser>().WithOne().HasForeignKey<EstudianteRecord>(x => x.UsuarioId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<EstadoSolicitudRecord>(entity =>
        {
            entity.ToTable("estados_solicitud");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Codigo).HasMaxLength(50).IsRequired();
            entity.Property(x => x.Nombre).HasMaxLength(100).IsRequired();
            entity.Property(x => x.Descripcion).HasMaxLength(300);
            entity.Property(x => x.Color).HasMaxLength(20);
            entity.HasIndex(x => x.Codigo).IsUnique();
            entity.HasIndex(x => x.Nombre).IsUnique();
            entity.HasData(OriginalCatalogSeed.EstadosSolicitud);
        });

        builder.Entity<EstadoCasoRecord>(entity =>
        {
            entity.ToTable("estados_caso");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Codigo).HasMaxLength(50).IsRequired();
            entity.Property(x => x.Nombre).HasMaxLength(100).IsRequired();
            entity.Property(x => x.Descripcion).HasMaxLength(300);
            entity.Property(x => x.Color).HasMaxLength(20);
            entity.HasIndex(x => x.Codigo).IsUnique();
            entity.HasIndex(x => x.Nombre).IsUnique();
            entity.HasData(OriginalCatalogSeed.EstadosCaso);
        });

        builder.Entity<CategoriaDocumentoRecord>(entity =>
        {
            entity.ToTable("categorias_documento");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Codigo).HasMaxLength(50).IsRequired();
            entity.Property(x => x.Nombre).HasMaxLength(150).IsRequired();
            entity.Property(x => x.Descripcion).HasMaxLength(300);
            entity.HasIndex(x => x.Codigo).IsUnique();
            entity.HasIndex(x => x.Nombre).IsUnique();
            entity.HasData(OriginalCatalogSeed.CategoriasDocumento);
        });

        builder.Entity<RevisionSolicitudRecord>(entity =>
        {
            entity.ToTable(
                "revisiones_solicitud",
                table => table.HasCheckConstraint(
                    "ck_revsol_resultado",
                    "[resultado] IN ('aprobada','rechazada','requiere_correccion')"));
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Resultado).HasMaxLength(50).IsRequired();
            entity.Property(x => x.FechaRevision).HasColumnType("datetimeoffset");
            entity.HasOne<SolicitudAsesoria>().WithMany().HasForeignKey(x => x.SolicitudId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.RevisadoPor).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => x.SolicitudId);
        });

        builder.Entity<TrazabilidadEventoRecord>(entity =>
        {
            entity.ToTable("trazabilidad_eventos");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.TipoEvento).HasMaxLength(50).IsRequired();
            entity.Property(x => x.EntidadTipo).HasMaxLength(50).IsRequired();
            entity.Property(x => x.EntidadId).HasMaxLength(100).IsRequired();
            entity.Property(x => x.EstadoAnterior).HasMaxLength(100);
            entity.Property(x => x.EstadoNuevo).HasMaxLength(100);
            entity.Property(x => x.Descripcion).HasMaxLength(300).IsRequired();
            entity.Property(x => x.FechaEvento).HasColumnType("datetimeoffset");
            entity.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.UsuarioId).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => new { x.EntidadTipo, x.EntidadId });
            entity.HasIndex(x => x.FechaEvento);
            entity.HasIndex(x => x.TipoEvento);
        });

        builder.Entity<EvaluacionServicioRecord>(entity =>
        {
            entity.ToTable(
                "evaluaciones_servicio",
                table =>
                {
                    table.HasCheckConstraint("ck_eval_general", "[calificacion_general] BETWEEN 1 AND 5");
                    table.HasCheckConstraint("ck_eval_claridad", "[claridad_orientacion] IS NULL OR [claridad_orientacion] BETWEEN 1 AND 5");
                    table.HasCheckConstraint("ck_eval_oportunidad", "[oportunidad_atencion] IS NULL OR [oportunidad_atencion] BETWEEN 1 AND 5");
                    table.HasCheckConstraint("ck_eval_utilidad", "[utilidad_servicio] IS NULL OR [utilidad_servicio] BETWEEN 1 AND 5");
                });
            entity.HasKey(x => x.Id);
            entity.Property(x => x.CreadoEn).HasColumnType("datetimeoffset");
            entity.HasIndex(x => x.CasoId).IsUnique();
            entity.HasOne<CasoRecord>().WithOne().HasForeignKey<EvaluacionServicioRecord>(x => x.CasoId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<SolicitanteRecord>().WithMany().HasForeignKey(x => x.SolicitanteId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<AvanceRecord>(entity =>
        {
            entity.ToTable(
                "avances",
                table => table.HasCheckConstraint(
                    "ck_avance_tipo",
                    "[tipo_avance] IN ('reunion','diagnostico','orientacion','revision_documental','recomendacion','cierre','otro')"));
            entity.HasKey(x => x.Id);
            entity.Property(x => x.TipoAvance).HasMaxLength(80).IsRequired();
            entity.Property(x => x.Titulo).HasMaxLength(250).IsRequired();
            entity.Property(x => x.OcurridoEn).HasColumnType("datetimeoffset");
            entity.Property(x => x.CreadoEn).HasColumnType("datetimeoffset");
            entity.Property(x => x.ActualizadoEn).HasColumnType("datetimeoffset");
            entity.HasOne<CasoRecord>().WithMany().HasForeignKey(x => x.CasoId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<EstudianteRecord>().WithMany().HasForeignKey(x => x.EstudianteId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.CreadoPor).OnDelete(DeleteBehavior.NoAction);
            entity.HasOne<ApplicationUser>().WithMany().HasForeignKey(x => x.ActualizadoPor).OnDelete(DeleteBehavior.NoAction);
            entity.HasIndex(x => x.CasoId);
            entity.HasIndex(x => x.EstudianteId);
        });

        builder.Entity<RevisionAvanceRecord>(entity =>
        {
            entity.ToTable(
                "revisiones_avance",
                table => table.HasCheckConstraint(
                    "ck_revavance_resultado",
                    "[resultado] IN ('aprobado','rechazado','requiere_correccion')"));
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Resultado).HasMaxLength(50).IsRequired();
            entity.Property(x => x.FechaRevision).HasColumnType("datetimeoffset");
            entity.HasOne<AvanceRecord>().WithMany().HasForeignKey(x => x.AvanceId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne<DocenteRecord>().WithMany().HasForeignKey(x => x.DocenteId).OnDelete(DeleteBehavior.Restrict);
            entity.HasIndex(x => x.AvanceId);
            entity.HasIndex(x => x.DocenteId);
        });
    }

    private static void ApplySnakeCaseColumns(ModelBuilder builder)
    {
        foreach (var entity in builder.Model.GetEntityTypes())
        {
            foreach (var property in entity.GetProperties())
            {
                property.SetColumnName(ToSnakeCase(property.Name));
            }
        }
    }

    private static string ToSnakeCase(string value)
    {
        var result = new StringBuilder(value.Length + 8);

        for (var index = 0; index < value.Length; index++)
        {
            var character = value[index];
            if (char.IsUpper(character) && index > 0)
            {
                result.Append('_');
            }

            result.Append(char.ToLowerInvariant(character));
        }

        return result.ToString();
    }
}

