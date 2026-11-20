using ConsultorioContable.Application.Catalogos;
using ConsultorioContable.Application.Common;
using ConsultorioContable.Infrastructure.Persistence;
using ConsultorioContable.Infrastructure.Persistence.Models;
using Microsoft.EntityFrameworkCore;

namespace ConsultorioContable.Infrastructure.Catalogos;

public sealed class EfCatalogoConsulta(
    ConsultorioDbContext dbContext,
    IClock clock) : ICatalogoConsulta
{
    public async Task<IReadOnlyCollection<AreaAsesoriaDto>> ListarAreasAsync(
        CancellationToken cancellationToken) =>
        await dbContext.AreasAsesoria
            .AsNoTracking()
            .OrderBy(x => x.Orden)
            .Select(x => new AreaAsesoriaDto(
                x.Id,
                x.Codigo,
                x.Nombre,
                x.Descripcion,
                x.Activo,
                x.Orden))
            .ToArrayAsync(cancellationToken);

    public async Task<IReadOnlyCollection<PeriodoAcademicoDto>> ListarPeriodosAsync(
        CancellationToken cancellationToken) =>
        await dbContext.PeriodosAcademicos
            .AsNoTracking()
            .OrderByDescending(x => x.FechaInicio)
            .Select(x => new PeriodoAcademicoDto(
                x.Id,
                x.Codigo,
                x.Nombre,
                x.FechaInicio,
                x.FechaFin,
                x.Activo))
            .ToArrayAsync(cancellationToken);

    public async Task<IReadOnlyCollection<SolicitanteDto>> ListarSolicitantesAsync(
        CancellationToken cancellationToken) =>
        await dbContext.Solicitantes
            .AsNoTracking()
            .OrderBy(x => x.NombreCompleto)
            .Select(x => new SolicitanteDto(
                x.Id,
                x.TipoDocumento,
                x.NumeroDocumento,
                x.NombreCompleto,
                x.CorreoElectronico,
                x.Telefono,
                x.Activo))
            .ToArrayAsync(cancellationToken);

    public async Task<SolicitanteDto> CrearSolicitanteAsync(
        CrearSolicitanteCommand command,
        string actor,
        CancellationToken cancellationToken)
    {
        var documentType = command.TipoDocumento.Trim().ToUpperInvariant();
        var documentNumber = Required(command.NumeroDocumento, "número de documento");
        if (!new[] { "CC", "CE", "TI", "NIT" }.Contains(documentType))
        {
            throw new ArgumentException("El tipo de documento no es válido.");
        }
        if (await dbContext.Solicitantes.AnyAsync(
                x => x.TipoDocumento == documentType && x.NumeroDocumento == documentNumber,
                cancellationToken))
        {
            throw new ArgumentException("Ya existe un solicitante con ese documento.");
        }

        var record = new SolicitanteRecord
        {
            Id = Guid.NewGuid(),
            TipoDocumento = documentType,
            NumeroDocumento = documentNumber,
            NombreCompleto = Required(command.NombreCompleto, "nombre completo"),
            CorreoElectronico = Clean(command.CorreoElectronico),
            Telefono = Clean(command.Telefono),
            Activo = true,
            CreadoEn = clock.UtcNow,
            ActualizadoEn = clock.UtcNow
        };
        dbContext.Solicitantes.Add(record);
        AddAudit(actor, "Solicitantes", $"Solicitante {record.NombreCompleto} creado");
        await dbContext.SaveChangesAsync(cancellationToken);
        return new(record.Id, record.TipoDocumento, record.NumeroDocumento, record.NombreCompleto, record.CorreoElectronico, record.Telefono, record.Activo);
    }

    public async Task<AreaAsesoriaDto> CrearAreaAsync(
        CrearAreaCommand command,
        string actor,
        CancellationToken cancellationToken)
    {
        var code = Required(command.Codigo, "código").ToUpperInvariant();
        var name = Required(command.Nombre, "nombre");
        if (await dbContext.AreasAsesoria.AnyAsync(x => x.Codigo == code || x.Nombre == name, cancellationToken))
        {
            throw new ArgumentException("Ya existe un área con el mismo código o nombre.");
        }
        var nextOrder = (short)((await dbContext.AreasAsesoria.MaxAsync(x => (short?)x.Orden, cancellationToken) ?? 0) + 1);
        var record = new AreaAsesoriaRecord
        {
            Id = Guid.NewGuid(), Codigo = code, Nombre = name,
            Descripcion = Clean(command.Descripcion), Activo = true, Orden = nextOrder
        };
        dbContext.AreasAsesoria.Add(record);
        AddAudit(actor, "Catálogos", $"Área {record.Nombre} creada");
        await dbContext.SaveChangesAsync(cancellationToken);
        return new(record.Id, record.Codigo, record.Nombre, record.Descripcion, record.Activo, record.Orden);
    }

    public async Task<PeriodoAcademicoDto> CrearPeriodoAsync(
        CrearPeriodoCommand command,
        string actor,
        CancellationToken cancellationToken)
    {
        if (command.FechaFin <= command.FechaInicio)
        {
            throw new ArgumentException("La fecha final debe ser posterior a la inicial.");
        }
        var code = Required(command.Codigo, "código");
        if (await dbContext.PeriodosAcademicos.AnyAsync(x => x.Codigo == code, cancellationToken))
        {
            throw new ArgumentException("Ya existe un periodo con ese código.");
        }
        if (command.Activo && await dbContext.PeriodosAcademicos.AnyAsync(x => x.Activo, cancellationToken))
        {
            throw new ArgumentException("Ya existe un periodo activo. Crea el nuevo periodo como inactivo.");
        }
        var record = new PeriodoAcademicoRecord
        {
            Id = Guid.NewGuid(), Codigo = code, Nombre = Required(command.Nombre, "nombre"),
            FechaInicio = command.FechaInicio, FechaFin = command.FechaFin, Activo = command.Activo
        };
        dbContext.PeriodosAcademicos.Add(record);
        AddAudit(actor, "Catálogos", $"Periodo {record.Codigo} creado");
        await dbContext.SaveChangesAsync(cancellationToken);
        return new(record.Id, record.Codigo, record.Nombre, record.FechaInicio, record.FechaFin, record.Activo);
    }

    private void AddAudit(string actor, string module, string detail) =>
        dbContext.Auditoria.Add(new AuditoriaRecord
        {
            Id = Guid.NewGuid(), Fecha = clock.UtcNow, Usuario = actor,
            Modulo = module, Operacion = "Creación", Resultado = "Exitoso", Detalle = detail
        });

    private static string Required(string value, string field) =>
        !string.IsNullOrWhiteSpace(value) ? value.Trim() : throw new ArgumentException($"El campo {field} es obligatorio.");

    private static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
