using System.ComponentModel.DataAnnotations;

namespace ConsultorioContable.Api.Contracts.Asistente;

public sealed record ConsultarCasosRequest(
    [Required, StringLength(500)] string Pregunta);
