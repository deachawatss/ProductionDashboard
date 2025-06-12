using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using DashboardAPI.Data;
using DashboardAPI.Models;

namespace DashboardAPI.Services;

public class DashboardService
{
    private readonly DashboardDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly ILogger<DashboardService> _logger;
    
    private const int CACHE_MINUTES = 2; // Reduce cache time for more recent data
    private const int MAX_RECORDS = 500;

    public DashboardService(DashboardDbContext context, IMemoryCache cache, ILogger<DashboardService> logger)
    {
        _context = context;
        _cache = cache;
        _logger = logger;
    }

    public async Task<object> GetDashboardSummaryAsync(string? processCell = null)
    {
        var cacheKey = $"dashboard_summary_{processCell ?? "all"}";
        
        if (_cache.TryGetValue(cacheKey, out object? cachedResult))
        {
            return cachedResult!;
        }

        try
        {
            _logger.LogInformation("Starting GetDashboardSummaryAsync for processCell: '{ProcessCell}'", processCell ?? "all");
            
            // Optimized query - get only last 3 days for faster performance
            var fromDate = DateTime.Now.AddDays(-3);
            _logger.LogInformation("Querying from date: {FromDate}", fromDate);
            
            var baseQuery = _context.BatchDashboardAnalytics
                .Where(b => b.StartTime >= fromDate && b.BatchNo != "999999");

            // Apply process cell filter
            if (!string.IsNullOrEmpty(processCell))
            {
                _logger.LogInformation("Filtering by processCell: '{ProcessCell}'", processCell);
                baseQuery = baseQuery.Where(b => b.ProcessCell == processCell);
            }

            _logger.LogInformation("Executing database query...");
            var batches = await baseQuery.Take(MAX_RECORDS).ToListAsync();
            _logger.LogInformation("Retrieved {BatchCount} batches from database", batches.Count);

            if (batches.Count == 0)
            {
                _logger.LogInformation("No batches found, returning empty summary");
                var emptySummary = new
                {
                    totalBatches = 0,
                    completedBatches = 0,
                    inProgressBatches = 0,
                    avgBagsPerHour = 0.0,
                    totalProduction = 0,
                    lastUpdated = DateTime.Now,
                    avgNetBagsPerHour = 0.0,
                    avgAdjustedBagsPerHour = 0.0,
                    avgDowntimePercentage = 0.0,
                    shiftChangeBatches = 0,
                    shiftChangeImpactPercentage = 0.0,
                    downtime = new
                    {
                        totalBreakMinutes = 0,
                        totalCleanMinutes = 0,
                        totalMachineDownMinutes = 0,
                        totalMeetingMinutes = 0,
                        totalShiftChangeMinutes = 0,
                        totalDowntimeMinutes = 0
                    }
                };
                _cache.Set(cacheKey, emptySummary, TimeSpan.FromMinutes(CACHE_MINUTES));
                return emptySummary;
            }

            // Enhanced calculations with all new metrics
            var totalBags = batches.Sum(b => int.TryParse(b.TotalBags, out var bags) ? bags : 0);
            var shiftChangeBatches = batches.Count(b => b.HasShiftChangeImpact == 1);
            var batchesWithBagsPerHour = batches.Where(b => b.BagsPerHour.HasValue && b.BagsPerHour > 0).ToList();
            var batchesWithNetBagsPerHour = batches.Where(b => b.NetBagsPerHour.HasValue && b.NetBagsPerHour > 0).ToList();
            var batchesWithAdjustedBagsPerHour = batches.Where(b => b.AdjustedBagsPerHour.HasValue && b.AdjustedBagsPerHour > 0).ToList();
            var batchesWithDowntime = batches.Where(b => b.DowntimePercentage.HasValue).ToList();

            var summary = new
            {
                totalBatches = batches.Count,
                completedBatches = batches.Count(b => b.BatchStatus == "Complete"),
                inProgressBatches = batches.Count(b => b.BatchStatus != "Complete" && !string.IsNullOrEmpty(b.BatchStatus)),
                avgBagsPerHour = batchesWithBagsPerHour.Any() ? batchesWithBagsPerHour.Average(b => b.BagsPerHour ?? 0) : 0.0,
                totalProduction = totalBags,
                lastUpdated = DateTime.Now,
                
                // Enhanced metrics
                avgNetBagsPerHour = batchesWithNetBagsPerHour.Any() ? batchesWithNetBagsPerHour.Average(b => b.NetBagsPerHour ?? 0) : 0.0,
                avgAdjustedBagsPerHour = batchesWithAdjustedBagsPerHour.Any() ? batchesWithAdjustedBagsPerHour.Average(b => b.AdjustedBagsPerHour ?? 0) : 0.0,
                avgDowntimePercentage = batchesWithDowntime.Any() ? batchesWithDowntime.Average(b => b.DowntimePercentage ?? 0) : 0.0,
                shiftChangeBatches = shiftChangeBatches,
                shiftChangeImpactPercentage = batches.Count > 0 ? (double)shiftChangeBatches / batches.Count * 100 : 0.0,
                
                downtime = new
                {
                    totalBreakMinutes = batches.Sum(b => b.TotalBreakMinutes ?? 0),
                    totalCleanMinutes = batches.Sum(b => b.TotalCleanMinutes ?? 0),
                    totalMachineDownMinutes = batches.Sum(b => b.TotalMachineDownMinutes ?? 0),
                    totalMeetingMinutes = batches.Sum(b => b.TotalMeetingMinutes ?? 0),
                    totalShiftChangeMinutes = batches.Sum(b => b.TotalShiftChangeMinutes ?? 0),
                    totalDowntimeMinutes = batches.Sum(b => b.TotalDowntimeMinutes ?? 0)
                }
            };

            _logger.LogInformation("Summary created: {TotalBatches} total, {Completed} completed, {InProgress} in progress", 
                summary.totalBatches, summary.completedBatches, summary.inProgressBatches);
            
            _cache.Set(cacheKey, summary, TimeSpan.FromMinutes(CACHE_MINUTES));
            return summary;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting dashboard summary for processCell: '{ProcessCell}'. Error: {ErrorMessage}", processCell ?? "all", ex.Message);
            throw;
        }
    }

    public async Task<IEnumerable<BatchDashboardAnalytics>> GetBatchesAsync(string? processCell = null, string? subLine = null)
    {
        var cacheKey = $"batches_{processCell}_{subLine}";
        
        if (_cache.TryGetValue(cacheKey, out IEnumerable<BatchDashboardAnalytics>? cachedBatches))
        {
            return cachedBatches!;
        }

        try
        {
            var fromDate = DateTime.Now.AddDays(-3);
            var query = _context.BatchDashboardAnalytics
                .Where(b => b.StartTime >= fromDate)
                .AsQueryable();

            // Filter by process cell (line)
            if (!string.IsNullOrEmpty(processCell))
            {
                if (processCell == "Aussie" || processCell == "Yankee")
                {
                    query = query.Where(b => b.ProcessCell == processCell);
                }
                else if (processCell == "Seasoning")
                {
                    query = query.Where(b => b.ProcessCell == "Seasoning");
                }
                else if (processCell == "Texas")
                {
                    query = query.Where(b => b.ProcessCell.StartsWith("TX"));
                }
            }

            // Filter by sub-line operations
            if (!string.IsNullOrEmpty(subLine))
            {
                switch (subLine)
                {
                    case "CLEAN":
                        query = query.Where(b => b.BatchNo == "999999");
                        break;
                    case "MAINPROCESS":
                        query = query.Where(b => b.BatchNo != "999999" && b.StartBatch.HasValue);
                        break;
                    case "MACHINEDOWN":
                        query = query.Where(b => b.TotalMachineDownMinutes.HasValue && b.TotalMachineDownMinutes > 0);
                        break;
                    case "BREAKTIME":
                        query = query.Where(b => b.TotalBreakMinutes.HasValue && b.TotalBreakMinutes > 0);
                        break;
                    case "SHIFTCHANGE":
                        query = query.Where(b => b.TotalShiftChangeMinutes.HasValue && b.TotalShiftChangeMinutes > 0);
                        break;
                }
            }

            var batches = await query
                .OrderByDescending(b => b.StartTime)
                .Take(MAX_RECORDS)
                .ToListAsync();

            _logger.LogInformation("GetBatchesAsync: Retrieved {BatchCount} batches for processCell: '{ProcessCell}', subLine: '{SubLine}'", 
                batches.Count, processCell ?? "all", subLine ?? "all");
            
            // Log a sample of the data to see what we're getting
            if (batches.Any())
            {
                var sample = batches.First();
                _logger.LogInformation("Sample batch: BatchNo={BatchNo}, Product={Product}, Status={Status}, StartTime={StartTime}", 
                    sample.BatchNo ?? "NULL", sample.ProductName ?? "NULL", sample.BatchStatus ?? "NULL", sample.StartTime?.ToString() ?? "NULL");
            }

            _cache.Set(cacheKey, batches, TimeSpan.FromMinutes(CACHE_MINUTES));
            return batches;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting batches for {ProcessCell}/{SubLine}", processCell, subLine);
            throw;
        }
    }

    public async Task<object> GetPerformanceMetricsAsync()
    {
        const string cacheKey = "performance_metrics";
        
        if (_cache.TryGetValue(cacheKey, out object? cachedMetrics))
        {
            return cachedMetrics!;
        }

        try
        {
            var fromDate = DateTime.Now.AddDays(-30);
            var batches = await _context.BatchDashboardAnalytics
                .Where(b => b.StartTime >= fromDate && b.BatchNo != "999999")
                .ToListAsync();

            var metrics = new
            {
                dailyProduction = batches
                    .Where(b => b.BatchDate.HasValue)
                    .GroupBy(b => new { Date = b.BatchDate!.Value.Date, b.ProcessCell })
                    .Select(g => new
                    {
                        date = g.Key.Date,
                        processCell = g.Key.ProcessCell,
                        batchCount = g.Count(),
                        avgBagsPerHour = g.Average(b => b.BagsPerHour ?? 0),
                        avgDowntimePercentage = g.Average(b => b.DowntimePercentage ?? 0)
                    })
                    .OrderByDescending(x => x.date),

                processCellEfficiency = batches
                    .GroupBy(b => b.ProcessCell)
                    .Select(g => new
                    {
                        processCell = g.Key,
                        totalBatches = g.Count(),
                        avgCycleTime = g.Average(b => b.TotalMinutes ?? 0),
                        avgBagsPerHour = g.Average(b => b.BagsPerHour ?? 0),
                        avgDowntimePercentage = g.Average(b => b.DowntimePercentage ?? 0),
                        completionRate = (double)g.Count(b => b.BatchStatus == "Complete") / g.Count() * 100
                    }),

                generatedAt = DateTime.Now
            };

            _cache.Set(cacheKey, metrics, TimeSpan.FromMinutes(CACHE_MINUTES * 2));
            return metrics;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting performance metrics");
            throw;
        }
    }

    public async Task<IEnumerable<string>> GetAvailableProcessCellsAsync()
    {
        const string cacheKey = "process_cells";
        
        if (_cache.TryGetValue(cacheKey, out IEnumerable<string>? cachedCells))
        {
            return cachedCells!;
        }

        try
        {
            var cells = await _context.BatchDashboardAnalytics
                .Select(b => b.ProcessCell)
                .Distinct()
                .Where(c => !string.IsNullOrEmpty(c))
                .OrderBy(c => c)
                .ToListAsync();

            _cache.Set(cacheKey, cells, TimeSpan.FromHours(1));
            return cells;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting process cells");
            throw;
        }
    }
} 