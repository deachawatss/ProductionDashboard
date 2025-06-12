using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.ResponseCompression;
using DashboardAPI.Data;
using DashboardAPI.Services;
using System.IO.Compression;

// Load .env file from root directory if it exists
var rootDir = Directory.GetParent(Directory.GetCurrentDirectory())?.FullName;
var envFilePath = rootDir != null ? Path.Combine(rootDir, ".env") : Path.Combine(Directory.GetCurrentDirectory(), ".env");

if (File.Exists(envFilePath))
{
    Console.WriteLine($"Loading environment from: {envFilePath}");
    foreach (var line in File.ReadAllLines(envFilePath))
    {
        if (string.IsNullOrWhiteSpace(line) || line.StartsWith("#"))
            continue;
            
        var parts = line.Split('=', 2);
        if (parts.Length == 2)
        {
            var key = parts[0].Trim();
            var value = parts[1].Trim();
            Environment.SetEnvironmentVariable(key, value);
            Console.WriteLine($"Set env: {key} = {value}");
        }
    }
}
else
{
    Console.WriteLine($"No .env file found at: {envFilePath}");
}

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = null; // Keep original casing
        options.JsonSerializerOptions.WriteIndented = true;
    });

// Database configuration
var connectionString = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection") 
                      ?? builder.Configuration.GetConnectionString("DefaultConnection");
var displayLength = connectionString?.Length ?? 0;
Console.WriteLine($"Using connection string: {connectionString?.Substring(0, Math.Min(50, displayLength))}...");

builder.Services.AddDbContext<DashboardDbContext>(options =>
    options.UseSqlServer(connectionString));

// Add memory caching
builder.Services.AddMemoryCache();

// Add custom services
builder.Services.AddScoped<DashboardService>();
builder.Services.AddScoped<EventAnalyticsService>();

// Add CORS for the frontend - using environment variables
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowNextJS", policy =>
    {
        var allowedOrigins = new List<string>();
        
        // Get allowed origins from environment variables
        var frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL");
        var frontendUrlHttps = Environment.GetEnvironmentVariable("FRONTEND_URL_HTTPS");
        var apiUrl = Environment.GetEnvironmentVariable("API_URL");
        var apiUrlHttps = Environment.GetEnvironmentVariable("API_URL_HTTPS");
        
        // Add environment variable URLs if they exist
        if (!string.IsNullOrEmpty(frontendUrl)) allowedOrigins.Add(frontendUrl);
        if (!string.IsNullOrEmpty(frontendUrlHttps)) allowedOrigins.Add(frontendUrlHttps);
        if (!string.IsNullOrEmpty(apiUrl)) allowedOrigins.Add(apiUrl);
        if (!string.IsNullOrEmpty(apiUrlHttps)) allowedOrigins.Add(apiUrlHttps);
        
        // Fallback to environment-based ports if specific URLs not set
        if (allowedOrigins.Count == 0)
        {
            var frontendPort = Environment.GetEnvironmentVariable("FRONTEND_PORT") ?? "3000";
            allowedOrigins.AddRange(new[]
            {
                $"http://localhost:{frontendPort}",
                $"https://localhost:{frontendPort}"
            });
        }
        
        Console.WriteLine("CORS Policy - Allowed Origins:");
        foreach (var origin in allowedOrigins)
        {
            Console.WriteLine($"  - {origin}");
        }
        
        policy.WithOrigins(allowedOrigins.ToArray())
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Add API documentation
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Dashboard API", Version = "v1" });
});

// Add response caching
builder.Services.AddResponseCaching();

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Temporarily disable HTTPS redirection for debugging
// app.UseHttpsRedirection();

// Use CORS
app.UseCors("AllowNextJS");

// Use response caching
app.UseResponseCaching();

// Security headers
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["X-XSS-Protection"] = "1; mode=block";
    await next();
});

app.UseAuthorization();

app.MapControllers();

// Health check endpoint
app.MapGet("/", () => Results.Ok(new { 
    message = "Dashboard API is running", 
    timestamp = DateTime.Now 
}));

app.Run(); 