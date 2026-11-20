using System.Text;
using ConsultorioContable.Infrastructure.Identity;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace ConsultorioContable.Api.Infrastructure;

public static class JwtAuthenticationExtensions
{
    public static IServiceCollection AddJwtAuthentication(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        var jwt = new JwtOptions
        {
            Issuer = configuration["Jwt:Issuer"]
                ?? throw new InvalidOperationException("No se configuro Jwt:Issuer."),
            Audience = configuration["Jwt:Audience"]
                ?? throw new InvalidOperationException("No se configuro Jwt:Audience."),
            SigningKey = configuration["Jwt:SigningKey"]
                ?? throw new InvalidOperationException("No se configuro Jwt:SigningKey."),
            ExpirationMinutes = int.TryParse(
                configuration["Jwt:ExpirationMinutes"],
                out var expirationMinutes)
                    ? expirationMinutes
                    : 30
        };

        if (Encoding.UTF8.GetByteCount(jwt.SigningKey) < 32)
        {
            throw new InvalidOperationException("Jwt:SigningKey debe tener al menos 32 bytes.");
        }

        if (environment.IsProduction() && jwt.SigningKey.StartsWith("CHANGE_ME", StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                "Jwt:SigningKey debe configurarse mediante secretos en produccion.");
        }

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwt.Issuer,
                    ValidateAudience = true,
                    ValidAudience = jwt.Audience,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(jwt.SigningKey)),
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromSeconds(30)
                };
            });

        services.AddAuthorization();
        return services;
    }

    public static void AddBearerSecurity(this SwaggerGenOptions options)
    {
        options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
        {
            Name = "Authorization",
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            In = ParameterLocation.Header,
            Description = "Token JWT obtenido en POST /api/auth/login"
        });

        options.AddSecurityRequirement(new OpenApiSecurityRequirement
        {
            [new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            }] = Array.Empty<string>()
        });
    }
}

