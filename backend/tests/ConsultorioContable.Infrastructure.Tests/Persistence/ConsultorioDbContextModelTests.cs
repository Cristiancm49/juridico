using ConsultorioContable.Domain.Solicitudes;
using ConsultorioContable.Infrastructure.Identity;
using ConsultorioContable.Infrastructure.Persistence;
using ConsultorioContable.Infrastructure.Persistence.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

namespace ConsultorioContable.Infrastructure.Tests.Persistence;

public sealed class ConsultorioDbContextModelTests
{
    private readonly IModel _model;

    public ConsultorioDbContextModelTests()
    {
        var options = new DbContextOptionsBuilder<ConsultorioDbContext>()
            .UseSqlServer("Server=localhost;Database=ModelOnly;Trusted_Connection=True")
            .Options;

        using var context = new ConsultorioDbContext(options);
        _model = context.Model;
    }

    [Fact]
    public void Mapea_las_tablas_principales_en_snake_case()
    {
        Assert.Equal(
            "usuarios",
            _model.FindEntityType(typeof(ApplicationUser))!.GetTableName());
        Assert.Equal(
            "solicitantes",
            _model.FindEntityType(typeof(SolicitanteRecord))!.GetTableName());
        Assert.Equal(
            "solicitudes_asesoria",
            _model.FindEntityType(typeof(SolicitudAsesoria))!.GetTableName());
    }

    [Fact]
    public void Correo_y_periodo_activo_tienen_indices_unicos()
    {
        var emailIndex = _model.FindEntityType(typeof(ApplicationUser))!
            .GetIndexes()
            .Single(index => index.GetDatabaseName() == "EmailIndex");
        var activePeriodIndex = _model.FindEntityType(typeof(PeriodoAcademicoRecord))!
            .GetIndexes()
            .Single(index => index.GetDatabaseName() == "ux_periodo_academico_activo");

        Assert.True(emailIndex.IsUnique);
        Assert.Equal("[normalized_email] IS NOT NULL", emailIndex.GetFilter());
        Assert.True(activePeriodIndex.IsUnique);
        Assert.Equal("[activo] = 1", activePeriodIndex.GetFilter());
    }

    [Fact]
    public void Solicitud_usa_rowversion_para_concurrencia()
    {
        var version = _model.FindEntityType(typeof(SolicitudAsesoria))!
            .FindProperty("Version")!;

        Assert.True(version.IsConcurrencyToken);
        Assert.Equal(ValueGenerated.OnAddOrUpdate, version.ValueGenerated);
        Assert.False(version.IsNullable);
    }

    [Fact]
    public void Incluye_las_23_tablas_de_negocio_del_modelo_original()
    {
        string[] expectedTables =
        [
            "usuarios", "roles", "usuarios_roles", "registros_auditoria",
            "empresas", "solicitantes", "docentes", "estudiantes",
            "periodos_academicos", "areas_asesoria", "estados_solicitud",
            "estados_caso", "categorias_documento", "solicitudes_asesoria",
            "revisiones_solicitud", "casos_asesoria", "asignaciones_caso",
            "trazabilidad_eventos", "evaluaciones_servicio", "avances",
            "revisiones_avance", "documentos", "notificaciones"
        ];

        var mappedTables = _model.GetEntityTypes()
            .Select(entity => entity.GetTableName())
            .Where(table => table is not null)
            .ToHashSet(StringComparer.Ordinal);

        Assert.All(expectedTables, table => Assert.Contains(table, mappedTables));
    }
}

