using System.Net;
using ConsultorioContable.Application.Asistente;
using ConsultorioContable.Infrastructure.Asistente;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace ConsultorioContable.Infrastructure.Tests.Asistente;

public sealed class GeminiAsistenteLenguajeNaturalTests
{
    [Fact]
    public async Task Interpreta_respuesta_estructurada_sin_enviar_datos_de_casos()
    {
        string? body = null;
        var handler = new StubHandler(async request =>
        {
            Assert.Equal(HttpMethod.Post, request.Method);
            Assert.Equal("secret-key", request.Headers.GetValues("x-goog-api-key").Single());
            body = await request.Content!.ReadAsStringAsync();
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    """
                    {"candidates":[{"content":{"parts":[{"text":"Analizando la intención", "thought":true},{"text":"Aquí está el resultado:\n```json\n{\"tipo\":\"Retrasados\",\"area\":\"Costos\",\"numeroCaso\":null,\"persona\":null,\"rolPersona\":\"Cualquiera\",\"periodo\":null,\"desde\":null,\"hasta\":null,\"agruparPor\":\"Area\",\"entidad\":\"Casos\"}\n```"}]}}]}
                    """,
                    System.Text.Encoding.UTF8,
                    "application/json")
            };
        });
        var client = new HttpClient(handler)
        {
            BaseAddress = new Uri("https://generativelanguage.googleapis.com/")
        };
        var options = Options.Create(new GeminiOptions
        {
            Enabled = true,
            ApiKey = "secret-key",
            Model = "gemini-test"
        });
        var assistant = new GeminiAsistenteLenguajeNatural(
            client,
            options,
            NullLogger<GeminiAsistenteLenguajeNatural>.Instance);

        var result = await assistant.InterpretarAsync(
            "¿Cuáles requieren atención urgente en costos?",
            new OpcionesInterpretacionAsistente(
                ["Costos", "Inventarios"],
                ["2026-2"],
                new DateOnly(2026, 11, 10)),
            default);

        Assert.NotNull(result);
        Assert.Equal(TipoConsultaAsistente.Retrasados, result.Tipo);
        Assert.Equal("Costos", result.Area);
        Assert.DoesNotContain("Empresa Uno", body);
        Assert.DoesNotContain("Docente Uno", body);
    }

    [Fact]
    public async Task Sin_clave_no_realiza_solicitudes_externas()
    {
        var handler = new StubHandler(_ =>
            throw new InvalidOperationException("No debe llamar a Gemini."));
        var assistant = new GeminiAsistenteLenguajeNatural(
            new HttpClient(handler)
            {
                BaseAddress = new Uri("https://generativelanguage.googleapis.com/")
            },
            Options.Create(new GeminiOptions { Enabled = true, ApiKey = string.Empty }),
            NullLogger<GeminiAsistenteLenguajeNatural>.Instance);

        var result = await assistant.InterpretarAsync(
            "Resumen",
            new OpcionesInterpretacionAsistente(["Costos"], ["2026-2"], new(2026, 11, 10)),
            default);

        Assert.Null(result);
    }

    private sealed class StubHandler(
        Func<HttpRequestMessage, Task<HttpResponseMessage>> responseFactory)
        : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken) => responseFactory(request);
    }
}
