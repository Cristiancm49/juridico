using ConsultorioContable.Infrastructure;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace ConsultorioContable.Infrastructure.Tests.Identity;

public sealed class IdentityPasswordPolicyTests
{
    [Fact]
    public void PasswordPolicy_AllowsSecurePasswordWithoutSpecialCharacter()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Server=localhost;Database=Test;Trusted_Connection=True;TrustServerCertificate=True",
                ["Jwt:Issuer"] = "Test",
                ["Jwt:Audience"] = "Test",
                ["Jwt:SigningKey"] = "A_Test_Signing_Key_With_At_Least_Thirty_Two_Characters"
            })
            .Build();
        var services = new ServiceCollection();

        services.AddInfrastructure(configuration);
        using var provider = services.BuildServiceProvider();
        var policy = provider.GetRequiredService<IOptions<IdentityOptions>>().Value.Password;

        Assert.Equal(8, policy.RequiredLength);
        Assert.True(policy.RequireUppercase);
        Assert.True(policy.RequireLowercase);
        Assert.True(policy.RequireDigit);
        Assert.False(policy.RequireNonAlphanumeric);
    }
}
