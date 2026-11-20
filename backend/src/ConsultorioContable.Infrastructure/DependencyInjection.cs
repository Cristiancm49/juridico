using ConsultorioContable.Application.Common;
using ConsultorioContable.Application.Asistente;
using ConsultorioContable.Application.Catalogos;
using ConsultorioContable.Application.Identity;
using ConsultorioContable.Application.Modulos;
using ConsultorioContable.Application.Solicitudes;
using ConsultorioContable.Infrastructure.Common;
using ConsultorioContable.Infrastructure.Asistente;
using ConsultorioContable.Infrastructure.Catalogos;
using ConsultorioContable.Infrastructure.Identity;
using ConsultorioContable.Infrastructure.Modulos;
using ConsultorioContable.Infrastructure.Persistence;
using ConsultorioContable.Infrastructure.Solicitudes;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace ConsultorioContable.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "No se configuro ConnectionStrings:DefaultConnection.");
        }

        services.AddDbContext<ConsultorioDbContext>(options =>
            options.UseSqlServer(
                connectionString,
                sql => sql.MigrationsAssembly(typeof(ConsultorioDbContext).Assembly.FullName)));

        services
            .AddIdentityCore<ApplicationUser>(options =>
            {
                options.Password.RequiredLength = 8;
                options.Password.RequireDigit = true;
                options.Password.RequireLowercase = true;
                options.Password.RequireUppercase = true;
                options.Password.RequireNonAlphanumeric = false;
                options.Lockout.MaxFailedAccessAttempts = 5;
                options.User.RequireUniqueEmail = true;
            })
            .AddRoles<ApplicationRole>()
            .AddEntityFrameworkStores<ConsultorioDbContext>();

        services.AddSingleton<IClock, SystemClock>();
        services.Configure<JwtOptions>(options =>
        {
            options.Issuer = configuration["Jwt:Issuer"]
                ?? throw new InvalidOperationException("No se configuro Jwt:Issuer.");
            options.Audience = configuration["Jwt:Audience"]
                ?? throw new InvalidOperationException("No se configuro Jwt:Audience.");
            options.SigningKey = configuration["Jwt:SigningKey"]
                ?? throw new InvalidOperationException("No se configuro Jwt:SigningKey.");
            options.ExpirationMinutes = int.TryParse(
                configuration["Jwt:ExpirationMinutes"],
                out var expirationMinutes)
                    ? expirationMinutes
                    : 30;
        });
        services.AddScoped<IIdentityService, IdentityService>();
        services.AddSingleton<ITokenService, JwtTokenService>();
        services.AddScoped<ISolicitudRepository, EfSolicitudRepository>();
        services.AddScoped<ICatalogoConsulta, EfCatalogoConsulta>();
        services.AddScoped<IModuleReadRepository, EfModuleReadRepository>();
        services.AddScoped<IAsistenteCasosRepository, EfAsistenteCasosRepository>();
        services.Configure<GeminiOptions>(options =>
        {
            options.Enabled = configuration.GetValue("Gemini:Enabled", true);
            var configuredApiKey = configuration["Gemini:ApiKey"];
            options.ApiKey = !string.IsNullOrWhiteSpace(configuredApiKey)
                ? configuredApiKey
                : configuration["GEMINI_API_KEY"] ?? string.Empty;
            options.Model = configuration["Gemini:Model"] ?? "gemini-2.5-flash";
            options.TimeoutSeconds = configuration.GetValue("Gemini:TimeoutSeconds", 15);
        });
        services.AddHttpClient<IAsistenteLenguajeNatural, GeminiAsistenteLenguajeNatural>(client =>
        {
            client.BaseAddress = new Uri("https://generativelanguage.googleapis.com/");
            client.Timeout = TimeSpan.FromSeconds(
                configuration.GetValue("Gemini:TimeoutSeconds", 15));
        });

        return services;
    }
}
