using Microsoft.AspNetCore.Mvc;
using DashboardAPI.Services;
using DashboardAPI.Models;
using DashboardAPI.Data;
using Microsoft.EntityFrameworkCore;

namespace DashboardAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly DashboardService _dashboardService;
    private readonly ILogger<DashboardController> _logger;
    private readonly DashboardDbContext _context;

    public DashboardController(DashboardService dashboardService, ILogger<DashboardController> logger, DashboardDbContext context)
    {
        _dashboardService = dashboardService;
        _logger = logger;
        _context = context;
    }

    /// <summary>
    /// Get dashboard summary with key metrics
    /// </summary>
    [HttpGet("summary")]
    [ResponseCache(Duration = 300)] // 5 minutes cache
    public async Task<ActionResult<object>> GetSummary([FromQuery] string? processCell = null)
    {
        try
        {
            _logger.LogInformation("Dashboard API: Getting enhanced summary for processCell: '{ProcessCell}'", processCell ?? "all");
            
            // Get enhanced summary
            var enhancedSummary = await _dashboardService.GetDashboardSummaryAsync(processCell);
            
            _logger.LogInformation("Dashboard API: Successfully retrieved enhanced dashboard summary");
            return Ok(enhancedSummary);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Dashboard API: Error getting dashboard summary for processCell: '{ProcessCell}'. Inner exception: {InnerException}", 
                processCell ?? "all", ex.InnerException?.Message ?? "None");
            return StatusCode(500, new { 
                error = "Failed to load dashboard summary", 
                details = ex.Message,
                innerException = ex.InnerException?.Message,
                processCell = processCell
            });
        }
    }

    /// <summary>
    /// Get batch data with optional filtering by process cell and sub-line
    /// </summary>
    [HttpGet("batches")]
    [ResponseCache(Duration = 180)] // 3 minutes cache
    public async Task<ActionResult<IEnumerable<object>>> GetBatches(
        [FromQuery] string? processCell = null,
        [FromQuery] string? subLine = null)
    {
        try
        {
            _logger.LogInformation("Dashboard API: Getting batches for processCell: '{ProcessCell}', subLine: '{SubLine}'", 
                processCell ?? "all", subLine ?? "all");
            
            var batches = await _dashboardService.GetBatchesAsync(processCell, subLine);
            
            // Transform to match frontend interface
            var transformedBatches = batches.Select(b => new
            {
                batchNo = b.BatchNo ?? "N/A",
                productName = b.ProductName ?? "N/A", 
                processCell = b.ProcessCell ?? "N/A",
                startTime = b.StartTime?.ToString("yyyy-MM-dd HH:mm:ss") ?? "N/A",
                finishTime = b.FinishTime?.ToString("yyyy-MM-dd HH:mm:ss"),
                batchStatus = b.BatchStatus ?? "Unknown",
                totalBags = int.TryParse(b.TotalBags, out var bags) ? bags : 0,
                bagsPerHour = b.BagsPerHour ?? 0.0,
                totalMinutes = b.TotalMinutes ?? 0
            }).ToList();
            
            _logger.LogInformation("Dashboard API: Successfully transformed {Count} batches", transformedBatches.Count);
            return Ok(transformedBatches);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting batches for {ProcessCell}/{SubLine}", processCell, subLine);
            return StatusCode(500, new { error = "Failed to load batch data" });
        }
    }

    /// <summary>
    /// Get performance metrics and analytics
    /// </summary>
    [HttpGet("performance")]
    [ResponseCache(Duration = 600)] // 10 minutes cache
    public async Task<ActionResult<object>> GetPerformanceMetrics()
    {
        try
        {
            var metrics = await _dashboardService.GetPerformanceMetricsAsync();
            return Ok(metrics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting performance metrics");
            return StatusCode(500, new { error = "Failed to load performance metrics" });
        }
    }

    /// <summary>
    /// Get available process cells (production lines)
    /// </summary>
    [HttpGet("process-cells")]
    [ResponseCache(Duration = 3600)] // 1 hour cache
    public async Task<ActionResult<IEnumerable<string>>> GetProcessCells()
    {
        try
        {
            var cells = await _dashboardService.GetAvailableProcessCellsAsync();
            return Ok(cells);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting process cells");
            return StatusCode(500, new { error = "Failed to load process cells" });
        }
    }

    /// <summary>
    /// Health check endpoint
    /// </summary>
    [HttpGet("health")]
    public IActionResult HealthCheck()
    {
        return Ok(new
        {
            status = "healthy",
            timestamp = DateTime.Now,
            version = "1.0.0"
        });
    }

    [HttpGet("downtime-test")]
    public IActionResult GetDowntimeTest()
    {
        return Ok(new { 
            status = "working", 
            downtimeBreakdown = new[] 
            { 
                new { eventType = "Break Time", totalMinutes = 315, eventCount = 21, avgDuration = 15.0, percentage = 25.2 },
                new { eventType = "Cleaning", totalMinutes = 450, eventCount = 9, avgDuration = 50.0, percentage = 36.1 },
                new { eventType = "Machine Down", totalMinutes = 180, eventCount = 6, avgDuration = 30.0, percentage = 14.4 },
                new { eventType = "Meetings", totalMinutes = 150, eventCount = 10, avgDuration = 15.0, percentage = 12.0 },
                new { eventType = "Shift Change", totalMinutes = 155, eventCount = 14, avgDuration = 11.0, percentage = 12.4 }
            },
            dailyBreakdown = new[]
            {
                new { date = "2025-01-25", breakMinutes = 45, cleanMinutes = 60, machineDownMinutes = 30, meetingMinutes = 20, shiftChangeMinutes = 25, totalMinutes = 180 },
                new { date = "2025-01-24", breakMinutes = 40, cleanMinutes = 90, machineDownMinutes = 15, meetingMinutes = 15, shiftChangeMinutes = 20, totalMinutes = 180 },
                new { date = "2025-01-23", breakMinutes = 50, cleanMinutes = 45, machineDownMinutes = 45, meetingMinutes = 25, shiftChangeMinutes = 30, totalMinutes = 195 }
            }
        });
    }

    [HttpGet("batchtable")]
    public async Task<IActionResult> GetBatchTable(
        [FromQuery] string? processCell = null,
        [FromQuery] int days = 3)
    {
        try
        {
            var query = _context.BatchDashboardAnalytics.AsQueryable();

            if (!string.IsNullOrEmpty(processCell))
            {
                query = query.Where(b => b.ProcessCell == processCell);
            }

            var startDate = DateTime.Now.AddDays(-days);
            query = query.Where(b => b.StartTime >= startDate);

            var batches = await query
                .OrderByDescending(b => b.StartTime)
                .Take(100)
                .ToListAsync();

            var result = batches.Select(b => new
                {
                    batchNo = b.BatchNo,
                    productName = b.ProductName,
                    startTime = b.StartTime,
                    finishTime = b.FinishTime,
                    startBatch = b.StartBatch,
                    startBlend = b.StartBlend,
                    startPack = b.StartPack,
                    startTip = b.StartTip,
                    finishTip = b.FinishTip,
                finishBlend = b.FinishBlend,
                finishPack = b.FinishPack,
                    totalBags = b.TotalBags,
                    partialBags = b.PartialBags,
                    totalMinutes = b.TotalMinutes,
                    bagsPerHour = b.BagsPerHour,
                    batchStatus = b.BatchStatus,
                    processCell = b.ProcessCell,
                    downtimeMinutes = b.TotalDowntimeMinutes,
                downtimePercentage = b.DowntimePercentage,
                totalBreakMinutes = b.TotalBreakMinutes,
                totalCleanMinutes = b.TotalCleanMinutes,
                totalMachineDownMinutes = b.TotalMachineDownMinutes,
                totalShiftChangeMinutes = b.TotalShiftChangeMinutes,
                totalDowntimeMinutes = b.TotalDowntimeMinutes
            });

            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("events")]
    public async Task<IActionResult> GetEvents(
        [FromQuery] string? processCell = null,
        [FromQuery] string? eventType = null,
        [FromQuery] int days = 3)
    {
        try
        {
            var query = _context.ProductionEvents.AsQueryable();

            if (!string.IsNullOrEmpty(processCell))
            {
                query = query.Where(e => e.ProcessCell == processCell);
            }

            if (!string.IsNullOrEmpty(eventType))
            {
                query = query.Where(e => e.EventType == eventType);
            }

            var startDate = DateTime.Now.AddDays(-days);
            query = query.Where(e => e.EventStart >= startDate);

            var events = await query
                .Where(e => e.BatchNo != null && e.ProcessCell != null && e.EventType != null)
                .OrderByDescending(e => e.EventStart)
                .Take(100)
                .ToListAsync();

            var result = events.Select(e => new
            {
                batchNo = e.BatchNo ?? "N/A",
                eventType = e.EventType ?? "Unknown",
                activityType = e.EventType ?? "Unknown", // For consistency with interface
                location = e.Location ?? "N/A",
                startTime = e.EventStart,
                finishTime = e.EventEnd,
                durationMinutes = e.DurationMinutes,
                totalMinutes = e.DurationMinutes, // For consistency
                processCell = e.ProcessCell ?? "Unknown",
                batchStatus = e.EventType ?? "Unknown", // Use EventType as status for events
                productName = e.EventType ?? "Unknown", // Show event type in product column
                eventDate = e.EventDate,
                eventCategory = e.EventCategory ?? "Other"
            });

            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("cleaning")]
    public async Task<IActionResult> GetCleaning(
        [FromQuery] string? processCell = null,
        [FromQuery] int days = 3)
    {
        try
        {
            var query = _context.CleaningActivities.AsQueryable();

            if (!string.IsNullOrEmpty(processCell))
            {
                query = query.Where(c => c.ProcessCell == processCell);
            }

            var startDate = DateTime.Now.AddDays(-days);
            query = query.Where(c => c.CleanStart >= startDate);

            var cleaningActivities = await query
                .OrderByDescending(c => c.CleanStart)
                .Take(100)
                .ToListAsync();

            var result = cleaningActivities.Select(c => new
            {
                batchNo = c.BatchNo,
                activityType = c.ActivityType,
                eventType = c.ActivityType, // For consistency with interface
                location = c.Location,
                cleanCycle = c.CleanCycle,
                startTime = c.CleanStart,
                finishTime = c.CleanEnd,
                durationMinutes = c.DurationMinutes,
                totalMinutes = c.DurationMinutes, // For consistency
                processCell = c.ProcessCell,
                cleanStatus = c.CleanStatus,
                batchStatus = c.CleanStatus, // Use CleanStatus as batchStatus
                productName = $"{c.ActivityType} - Cycle {c.CleanCycle}", // Show activity in product column
                lineType = c.LineType,
                cleanDate = c.CleanDate,
                shiftType = c.ShiftType,
                durationCategory = c.DurationCategory
            });

            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("analytics")]
    public async Task<IActionResult> GetAnalytics()
    {
        try
        {
            _logger.LogInformation("Analytics API: Starting analytics data retrieval");
            
            // Get Process Cell Efficiency Data
            _logger.LogInformation("Analytics API: Fetching process cell efficiency data");
            var processCellData = await _context.ProcessCellEfficiencies
                .Where(p => p.ProcessCell != null)
                .ToListAsync();
            _logger.LogInformation("Analytics API: Retrieved {Count} process cell records", processCellData.Count);
            
            // Get Product Performance Data - Show all products for search functionality, remove duplicates
            _logger.LogInformation("Analytics API: Fetching product performance data");
            var productDataRaw = await _context.ProductPerformanceSummaries
                .Where(p => p.ItemKey != null && p.ProductName != null && p.ProcessCell != null)
                .OrderByDescending(p => p.BatchCount)
                .ToListAsync();
            
            // Remove duplicates in memory to avoid EF GroupBy translation issues
            // Use a more specific grouping key to ensure uniqueness
            var productData = productDataRaw
                .GroupBy(p => $"{p.ItemKey}_{p.ProductName}_{p.ProcessCell}")
                .Select(g => g.OrderByDescending(x => x.BatchCount).First())
                .OrderByDescending(p => p.BatchCount)
                .ToList();
            _logger.LogInformation("Analytics API: Retrieved {Count} unique product performance records from {RawCount} total records", 
                productData.Count, productDataRaw.Count);

            // Get Event Analytics Data from ProductionEvents
            _logger.LogInformation("Analytics API: Fetching event analytics data");
            var startDate = DateTime.Now.AddDays(-30);
            var events = await _context.ProductionEvents
                .Where(e => e.ProcessCell != null && e.EventType != null && e.EventType != "Meeting" 
                       && e.EventStart >= startDate && e.DurationMinutes.HasValue && e.DurationMinutes > 0)
                .ToListAsync();
            _logger.LogInformation("Analytics API: Retrieved {Count} production events", events.Count);

            var eventData = events
                .GroupBy(e => new { e.ProcessCell, e.EventType, e.EventCategory })
                .Select(g => new
                {
                    processCell = g.Key.ProcessCell ?? "Unknown",
                    eventType = g.Key.EventType ?? "Unknown",
                    eventCategory = g.Key.EventCategory ?? "Other",
                    eventCount = g.Count(),
                    totalDurationMinutes = g.Sum(e => e.DurationMinutes ?? 0),
                    avgDurationMinutes = g.Average(e => e.DurationMinutes ?? 0),
                    minDurationMinutes = g.Min(e => e.DurationMinutes ?? 0),
                    maxDurationMinutes = g.Max(e => e.DurationMinutes ?? 0),
                    eventsSince2023 = g.Count(e => e.EventStart >= new DateTime(2023, 1, 1)),
                    durationSince2023 = g.Where(e => e.EventStart >= new DateTime(2023, 1, 1)).Sum(e => e.DurationMinutes ?? 0),
                    eventsLast30Days = g.Count(),
                    durationLast30Days = g.Sum(e => e.DurationMinutes ?? 0),
                    peakHour = g.Where(e => e.EventStart.HasValue).GroupBy(e => e.EventStart!.Value.Hour).OrderByDescending(h => h.Count()).FirstOrDefault()?.Key ?? 0
                })
                .ToList();
            _logger.LogInformation("Analytics API: Processed {Count} event analytics records", eventData.Count);

            _logger.LogInformation("Analytics API: Building result object");
            var result = new
            {
                processCellEfficiency = processCellData.Select(p => new
                {
                    processCell = p.ProcessCell ?? "Unknown",
                    totalBatches = p.TotalBatches,
                    normalBatches = p.NormalBatches,
                    shiftChangeBatches = p.ShiftChangeBatches,
                    avgCycleTime = p.AvgCycleTime,
                    avgNetProductionTime = p.AvgNetProductionTime,
                    avgBagsPerHour = p.AvgBagsPerHour,
                    avgNetBagsPerHour = p.AvgNetBagsPerHour,
                    avgNormalPeriodBagsPerHour = p.AvgNormalPeriodBagsPerHour,
                    avgNormalPeriodNetBagsPerHour = p.AvgNormalPeriodNetBagsPerHour,
                    avgNormalPeriodCycleTime = p.AvgNormalPeriodCycleTime,
                    avgWeightPerHour = p.AvgWeightPerHour,
                    totalBagsProduced = p.TotalBagsProduced,
                    totalWeightProduced = p.TotalWeightProduced,
                    completionRate = p.CompletionRate,
                    avgDowntimePercentage = p.AvgDowntimePercentage,
                    avgBreakMinutes = p.AvgBreakMinutes,
                    avgCleanMinutes = p.AvgCleanMinutes,
                    avgMachineDownMinutes = p.AvgMachineDownMinutes,
                    avgShiftChangeMinutes = p.AvgShiftChangeMinutes,
                    shiftChangeImpactPercentage = p.ShiftChangeImpactPercentage,
                    potentialImprovementPercent = p.PotentialImprovementPercent
                }),
                productPerformance = productData.Select(p => new
                {
                    itemKey = p.ItemKey,
                    productName = p.ProductName,
                    processCell = p.ProcessCell,
                    batchCount = p.BatchCount,
                    avgTotalMinutes = p.AvgTotalMinutes,
                    avgBlendMinutes = p.AvgBlendMinutes,
                    avgPackMinutes = p.AvgPackMinutes,
                    avgTipMinutes = p.AvgTipMinutes,
                    avgBagsPerHour = p.AvgBagsPerHour,
                    avgNetBagsPerHour = p.AvgNetBagsPerHour,
                    totalBagsProduced = p.TotalBagsProduced,
                    avgDowntimePercentage = p.AvgDowntimePercentage,
                    stdDevTotalMinutes = p.StdDevTotalMinutes,
                    minTotalMinutes = p.MinTotalMinutes,
                    maxTotalMinutes = p.MaxTotalMinutes
                }),
                eventAnalytics = eventData
            };

            _logger.LogInformation("Analytics API: Successfully completed analytics data retrieval");
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Analytics API: Error retrieving analytics data. Inner exception: {InnerException}", 
                ex.InnerException?.Message ?? "None");
            return StatusCode(500, new { 
                error = ex.Message, 
                innerException = ex.InnerException?.Message,
                stackTrace = ex.StackTrace 
            });
        }
    }

    [HttpGet("downtime")]
    public async Task<IActionResult> GetDowntime([FromQuery] string? processCell = null, [FromQuery] int days = 7)
    {
        try
        {
            var startDate = DateTime.Now.AddDays(-days);
            
            var query = _context.ProductionEvents.AsQueryable()
                .Where(e => e.EventStart >= startDate && e.DurationMinutes.HasValue && e.DurationMinutes > 0);

            if (!string.IsNullOrEmpty(processCell))
            {
                query = query.Where(e => e.ProcessCell == processCell);
            }

            var events = await query
                .Where(e => e.EventType != null && e.EventType != "Meeting")
                .ToListAsync();

            // Calculate downtime breakdown by event type
            var downtimeBreakdown = events
                .GroupBy(e => e.EventType)
                .Select(g => new
                {
                    eventType = g.Key == "Break" ? "Break Time" : 
                               g.Key == "Clean" ? "Cleaning" : 
                               g.Key == "Machine Down" ? "Machine Down" :

                               g.Key == "Shift Change" ? "Shift Change" : g.Key,
                    totalMinutes = g.Sum(e => e.DurationMinutes ?? 0),
                    eventCount = g.Count(),
                    avgDuration = g.Average(e => e.DurationMinutes ?? 0)
                })
                .ToList();

            // Calculate total minutes for percentage calculation
            var totalDowntimeMinutes = downtimeBreakdown.Sum(d => d.totalMinutes);

            // Add percentage to downtime breakdown
            var downtimeWithPercentages = downtimeBreakdown.Select(d => new
            {
                d.eventType,
                d.totalMinutes,
                d.eventCount,
                d.avgDuration,
                percentage = totalDowntimeMinutes > 0 ? (double)d.totalMinutes / totalDowntimeMinutes * 100 : 0
            }).ToList();

            // Calculate daily breakdown
            var dailyBreakdown = events
                .Where(e => e.EventDate.HasValue)
                .GroupBy(e => e.EventDate!.Value.Date)
                .Select(g => new
                {
                    date = g.Key.ToString("yyyy-MM-dd"),
                    breakMinutes = g.Where(e => e.EventType == "Break").Sum(e => e.DurationMinutes ?? 0),
                    cleanMinutes = g.Where(e => e.EventType == "Clean").Sum(e => e.DurationMinutes ?? 0),
                    machineDownMinutes = g.Where(e => e.EventType == "Machine Down").Sum(e => e.DurationMinutes ?? 0),

                    shiftChangeMinutes = g.Where(e => e.EventType == "Shift Change").Sum(e => e.DurationMinutes ?? 0),
                    totalMinutes = g.Sum(e => e.DurationMinutes ?? 0)
                })
                .OrderByDescending(d => d.date)
                .Take(days)
                .ToList();

            return Ok(new
            {
                downtimeBreakdown = downtimeWithPercentages,
                dailyBreakdown = dailyBreakdown
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("realtime")]
    public async Task<IActionResult> GetRealtime(
        [FromQuery] string? processCell = null)
    {
        try
        {
            var query = _context.BatchDashboardAnalytics
                .Where(b => b.BatchStatus != "Complete" && b.BatchNo != "999999");

            if (!string.IsNullOrEmpty(processCell))
            {
                query = query.Where(b => b.ProcessCell == processCell);
            }

            var realTimeBatches = await query
                .OrderByDescending(b => b.StartTime)
                .Take(50)
                .ToListAsync();

            var result = realTimeBatches.Select(b => new
            {
                batchNo = b.BatchNo,
                productName = b.ProductName,
                processCell = b.ProcessCell,
                status = b.BatchStatus,
                startTime = b.StartTime,
                currentDuration = b.TotalMinutes ?? 0,
                estimatedCompletion = b.StartTime?.AddMinutes(
                    (double)(b.TotalMinutes ?? 0) + 60 // Add estimated remaining time
                ),
                efficiency = b.BagsPerHour ?? 0,
                totalBags = int.TryParse(b.TotalBags, out var bags) ? bags : 0,
                progress = CalculateProgress(b.BatchStatus)
            });

            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("product-baselines")]
    public async Task<IActionResult> GetProductBaselines([FromQuery] int days = 90)
    {
        try
        {
            _logger.LogInformation("Getting product baselines from vw_ProductPerformanceSummary");
            
            // Get all product performance data directly from the context
            var baselines = await _context.ProductPerformanceSummaries
                .Where(p => p.ProductName != null && p.ProcessCell != null)
                .Select(p => new
                {
                    itemKey = p.ItemKey,
                    productName = p.ProductName,
                    processCell = p.ProcessCell,
                    batchCount = p.BatchCount,
                    avgTotalTime = p.AvgTotalMinutes,
                    avgBlendTime = p.AvgBlendMinutes,
                    avgPackTime = p.AvgPackMinutes,
                    avgTipTime = p.AvgTipMinutes,
                    stdDevTotalTime = p.StdDevTotalMinutes,
                    minTotalTime = p.MinTotalMinutes,
                    maxTotalTime = p.MaxTotalMinutes
                })
                .OrderBy(p => p.processCell)
                .ThenByDescending(p => p.batchCount)
                .ToListAsync();

            _logger.LogInformation("Retrieved {Count} product baselines from vw_ProductPerformanceSummary", baselines.Count);
            return Ok(baselines);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting product baselines from vw_ProductPerformanceSummary");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    private static int CalculateProgress(string? status)
    {
        return status switch
        {
            "Tip Started" => 10,
            "Tipping" => 20,
            "Blend Started" => 30,
            "Blending" => 50,
            "Packing" => 80,
            "In Progress" => 40,
            _ => 0
        };
    }
} 