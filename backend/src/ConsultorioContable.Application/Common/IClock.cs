namespace ConsultorioContable.Application.Common;

public interface IClock
{
    DateTimeOffset UtcNow { get; }
}

