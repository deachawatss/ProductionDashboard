using Microsoft.AspNetCore.Mvc;
using DashboardAPI.Services;

namespace DashboardAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class EventAnalyticsController : ControllerBase
{
    private readonly EventAnalyticsService _eventAnalyticsService;
    private readonly ILogger<EventAnalyticsController> _logger;

    public EventAnalyticsController(EventAnalyticsService eventAnalyticsService, ILogger<EventAnalyticsController> logger)
    {
        _eventAnalyticsService = eventAnalyticsService;
        _logger = logger;
    }

    /// <summary>
    /// Get production event summary with downtime analysis
    /// </summary>
    [HttpGet("summary")]
    [ResponseCache(Duration = 600)] // 10 minutes cache
    public async Task<ActionResult<object>> GetEventSummary([FromQuery] int days = 30)
    {
        try
        {
            _logger.LogInformation("Event Analytics API: Getting event summary for {Days} days", days);
            var summary = await _eventAnalyticsService.GetEventSummaryAsync(days);
            return Ok(summary);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting event summary for {Days} days", days);
            return StatusCode(500, new { error = "Failed to load event summary" });
        }
    }

    /// <summary>
    /// Get detailed downtime analysis by process cell
    /// </summary>
    [HttpGet("downtime")]
    [ResponseCache(Duration = 600)] // 10 minutes cache
    public async Task<ActionResult<object>> GetDowntimeAnalysis([FromQuery] string? processCell = null)
    {
        try
        {
            _logger.LogInformation("Event Analytics API: Getting downtime analysis for processCell: '{ProcessCell}'", processCell ?? "all");
            var analysis = await _eventAnalyticsService.GetDowntimeAnalysisAsync(processCell);
            return Ok(analysis);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting downtime analysis for {ProcessCell}", processCell ?? "all");
            return StatusCode(500, new { error = "Failed to load downtime analysis" });
        }
    }

    /// <summary>
    /// Get shift change impact analysis
    /// </summary>
    [HttpGet("shift-change-impact")]
    [ResponseCache(Duration = 1200)] // 20 minutes cache
    public async Task<ActionResult<object>> GetShiftChangeImpact()
    {
        try
        {
            _logger.LogInformation("Event Analytics API: Getting shift change impact analysis");
            var impact = await _eventAnalyticsService.GetShiftChangeImpactAsync();
            return Ok(impact);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting shift change impact analysis");
            return StatusCode(500, new { error = "Failed to load shift change impact analysis" });
        }
    }

    /// <summary>
    /// Health check endpoint for event analytics
    /// </summary>
    [HttpGet("health")]
    public IActionResult HealthCheck()
    {
        return Ok(new
        {
            service = "EventAnalytics",
            status = "healthy",
            timestamp = DateTime.Now,
            version = "1.0.0"
        });
    }
} 