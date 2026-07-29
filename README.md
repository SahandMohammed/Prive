# Prive

## Prerequisites

- .NET SDK 10.0.302 (or a compatible SDK permitted by `global.json`)
- Node.js and pnpm for the client

## Backend

```bash
cd Api
dotnet tool restore
dotnet run --launch-profile http
```

The API runs at `http://localhost:5094`. Swagger is available at `/swagger` in Development.

`GET /api/v1/health/live` is a process liveness endpoint. `GET /api/v1/health` also checks PostgreSQL once `ConnectionStrings:Default` has been configured, for example through user secrets:

```bash
cd Api
dotnet user-secrets set "ConnectionStrings:Default" "Host=localhost;Database=prive;Username=postgres;Password=postgres"
dotnet user-secrets set "Jwt:Key" "<Base64-encoded random value of at least 32 bytes>"
```

Generate a suitable JWT secret locally with `openssl rand -base64 48`. Never add it to `appsettings.json` or commit it.

Apply the initial database schema after setting the connection string:

```bash
cd Api
dotnet tool run dotnet-ef -- database update
```

Run EF Core commands through the repository-local tool:

```bash
cd Api
dotnet tool run dotnet-ef -- --version
```

## Frontend

The frontend is intentionally deferred for this MVP setup pass. Its development server currently uses the standard Vite command:

```bash
cd client
pnpm install
pnpm dev
```
