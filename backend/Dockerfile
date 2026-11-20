FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY backend/ConsultorioContable.sln backend/Directory.Build.props ./backend/
COPY backend/src/ConsultorioContable.Domain/ConsultorioContable.Domain.csproj backend/src/ConsultorioContable.Domain/
COPY backend/src/ConsultorioContable.Application/ConsultorioContable.Application.csproj backend/src/ConsultorioContable.Application/
COPY backend/src/ConsultorioContable.Infrastructure/ConsultorioContable.Infrastructure.csproj backend/src/ConsultorioContable.Infrastructure/
COPY backend/src/ConsultorioContable.Api/ConsultorioContable.Api.csproj backend/src/ConsultorioContable.Api/
COPY backend/tests/ConsultorioContable.Domain.Tests/ConsultorioContable.Domain.Tests.csproj backend/tests/ConsultorioContable.Domain.Tests/
COPY backend/tests/ConsultorioContable.Application.Tests/ConsultorioContable.Application.Tests.csproj backend/tests/ConsultorioContable.Application.Tests/
COPY backend/tests/ConsultorioContable.Infrastructure.Tests/ConsultorioContable.Infrastructure.Tests.csproj backend/tests/ConsultorioContable.Infrastructure.Tests/
RUN dotnet restore backend/ConsultorioContable.sln

COPY backend ./backend
RUN dotnet publish backend/src/ConsultorioContable.Api/ConsultorioContable.Api.csproj \
    --configuration Release \
    --output /app/publish \
    --no-restore \
    /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
ENV ASPNETCORE_URLS=http://+:8080 \
    DOTNET_EnableDiagnostics=0
EXPOSE 8080
COPY --from=build /app/publish .
USER $APP_UID
ENTRYPOINT ["dotnet", "ConsultorioContable.Api.dll"]

