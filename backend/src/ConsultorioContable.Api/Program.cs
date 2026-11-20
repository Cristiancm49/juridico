using System.Text.Json.Serialization;
using ConsultorioContable.Api.Infrastructure;
using ConsultorioContable.Application.Auth;
using ConsultorioContable.Application.Asistente;
using ConsultorioContable.Application.Catalogos;
using ConsultorioContable.Application.Modulos;
using ConsultorioContable.Application.Solicitudes;
using ConsultorioContable.Infrastructure;
using ConsultorioContable.Infrastructure.Persistence;
using Microsoft.AspNetCore.HttpOverrides;

var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddControllers()
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options => options.AddBearerSecurity());
builder.Services.AddHealthChecks();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<DomainExceptionHandler>();
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders =
        ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddJwtAuthentication(builder.Configuration, builder.Environment);
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<AsistenteCasosService>();
builder.Services.AddScoped<CatalogoService>();
builder.Services.AddScoped<ModuleService>();
builder.Services.AddScoped<SolicitudService>();

var app = builder.Build();

await app.Services.InitialiseDatabaseAsync(app.Configuration);

app.UseForwardedHeaders();
app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health");
app.MapControllers();

app.Run();

public partial class Program;
