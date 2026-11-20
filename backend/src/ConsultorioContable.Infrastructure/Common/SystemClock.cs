using ConsultorioContable.Application.Common;

namespace ConsultorioContable.Infrastructure.Common;

public sealed class SystemClock : IClock
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}

