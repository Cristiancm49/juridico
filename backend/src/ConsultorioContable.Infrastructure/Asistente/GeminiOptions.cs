namespace ConsultorioContable.Infrastructure.Asistente;

public sealed class GeminiOptions
{
    public const string SectionName = "Gemini";

    public bool Enabled { get; set; } = true;

    public string ApiKey { get; set; } = string.Empty;

    public string Model { get; set; } = "gemini-2.5-flash";

    public int TimeoutSeconds { get; set; } = 15;
}
