using DashboardAPI.Data;
using DashboardAPI.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace DashboardAPI.Services;

public class EventAnalyticsService
{
    private readonly DashboardDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly ILogger<EventAnalyticsService> _logger;
    
    private const int CACHE_MINUTES = 10;
    
    public EventAnalyticsService(DashboardDbContext context, IMemoryCache cache, ILogger<EventAnalyticsService> logger)
    {
        _context = context;
        _cache = cache;
        _logger = logger;
    }
    
    public async Task<object> GetEventSummaryAsync(int days = 30)
    {
        var cacheKey = $"event_summary_{days}";
        
        if (_cache.TryGetValue(cacheKey, out object? cachedSummary))
        {
            return cachedSummary!;
        }
        
        try
        {
            var fromDate = DateTime.Now.AddDays(-3); // Optimize to 3 days for better performance
            
            // Create mock data based on batch analytics until ProductionEvents view is available
            var batchData = await _context.BatchDashboardAnalytics
                .Where(b => b.StartTime >= fromDate && b.BatchNo != "999999")
                .ToListAsync();

            var eventSummary = new[]
            {
                new {
                    EventType = "Break",
                    EventCategory = "Planned Downtime",
                    EventCount = batchData.Count(b => (b.TotalBreakMinutes ?? 0) > 0),
                    TotalDurationMinutes = batchData.Sum(b => b.TotalBreakMinutes ?? 0),
                    AvgDurationMinutes = batchData.Where(b => (b.TotalBreakMinutes ?? 0) > 0).Any() 
                        ? batchData.Where(b => (b.TotalBreakMinutes ?? 0) > 0).Average(b => b.TotalBreakMinutes ?? 0) : 0.0,
                    MaxDurationMinutes = batchData.Max(b => b.TotalBreakMinutes ?? 0),
                    MinDurationMinutes = batchData.Where(b => (b.TotalBreakMinutes ?? 0) > 0).Any() 
                        ? batchData.Where(b => (b.TotalBreakMinutes ?? 0) > 0).Min(b => b.TotalBreakMinutes ?? 0) : 0
                },
                new {
                    EventType = "Clean",
                    EventCategory = "Cleaning",
                    EventCount = batchData.Count(b => (b.TotalCleanMinutes ?? 0) > 0),
                    TotalDurationMinutes = batchData.Sum(b => b.TotalCleanMinutes ?? 0),
                    AvgDurationMinutes = batchData.Where(b => (b.TotalCleanMinutes ?? 0) > 0).Any() 
                        ? batchData.Where(b => (b.TotalCleanMinutes ?? 0) > 0).Average(b => b.TotalCleanMinutes ?? 0) : 0.0,
                    MaxDurationMinutes = batchData.Max(b => b.TotalCleanMinutes ?? 0),
                    MinDurationMinutes = batchData.Where(b => (b.TotalCleanMinutes ?? 0) > 0).Any() 
                        ? batchData.Where(b => (b.TotalCleanMinutes ?? 0) > 0).Min(b => b.TotalCleanMinutes ?? 0) : 0
                },
                new {
                    EventType = "Machine Down",
                    EventCategory = "Machine Down",
                    EventCount = batchData.Count(b => (b.TotalMachineDownMinutes ?? 0) > 0),
                    TotalDurationMinutes = batchData.Sum(b => b.TotalMachineDownMinutes ?? 0),
                    AvgDurationMinutes = batchData.Where(b => (b.TotalMachineDownMinutes ?? 0) > 0).Any() 
                        ? batchData.Where(b => (b.TotalMachineDownMinutes ?? 0) > 0).Average(b => b.TotalMachineDownMinutes ?? 0) : 0.0,
                    MaxDurationMinutes = batchData.Max(b => b.TotalMachineDownMinutes ?? 0),
                    MinDurationMinutes = batchData.Where(b => (b.TotalMachineDownMinutes ?? 0) > 0).Any() 
                        ? batchData.Where(b => (b.TotalMachineDownMinutes ?? 0) > 0).Min(b => b.TotalMachineDownMinutes ?? 0) : 0
                },
                new {
                    EventType = "Meeting",
                    EventCategory = "Planned Downtime",
                    EventCount = batchData.Count(b => (b.TotalMeetingMinutes ?? 0) > 0),
                    TotalDurationMinutes = batchData.Sum(b => b.TotalMeetingMinutes ?? 0),
                    AvgDurationMinutes = batchData.Where(b => (b.TotalMeetingMinutes ?? 0) > 0).Any() 
                        ? batchData.Where(b => (b.TotalMeetingMinutes ?? 0) > 0).Average(b => b.TotalMeetingMinutes ?? 0) : 0.0,
                    MaxDurationMinutes = batchData.Max(b => b.TotalMeetingMinutes ?? 0),
                    MinDurationMinutes = batchData.Where(b => (b.TotalMeetingMinutes ?? 0) > 0).Any() 
                        ? batchData.Where(b => (b.TotalMeetingMinutes ?? 0) > 0).Min(b => b.TotalMeetingMinutes ?? 0) : 0
                },
                new {
                    EventType = "Shift Change",
                    EventCategory = "Planned Downtime",
                    EventCount = batchData.Count(b => (b.TotalShiftChangeMinutes ?? 0) > 0),
                    TotalDurationMinutes = batchData.Sum(b => b.TotalShiftChangeMinutes ?? 0),
                    AvgDurationMinutes = batchData.Where(b => (b.TotalShiftChangeMinutes ?? 0) > 0).Any() 
                        ? batchData.Where(b => (b.TotalShiftChangeMinutes ?? 0) > 0).Average(b => b.TotalShiftChangeMinutes ?? 0) : 0.0,
                    MaxDurationMinutes = batchData.Max(b => b.TotalShiftChangeMinutes ?? 0),
                    MinDurationMinutes = batchData.Where(b => (b.TotalShiftChangeMinutes ?? 0) > 0).Any() 
                        ? batchData.Where(b => (b.TotalShiftChangeMinutes ?? 0) > 0).Min(b => b.TotalShiftChangeMinutes ?? 0) : 0
                }
            }.Where(e => e.TotalDurationMinutes > 0).OrderByDescending(e => e.TotalDurationMinutes).ToList();
            
            var result = new
            {
                EventSummary = eventSummary,
                TotalEvents = eventSummary.Sum(e => e.EventCount),
                TotalDowntimeMinutes = eventSummary.Sum(e => e.TotalDurationMinutes),
                GeneratedAt = DateTime.Now
            };
            
            _cache.Set(cacheKey, result, TimeSpan.FromMinutes(CACHE_MINUTES));
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting event summary for {Days} days", days);
            throw;
        }
    }
    
    public async Task<object> GetDowntimeAnalysisAsync(string? processCell = null)
    {
        var cacheKey = $"downtime_analysis_{processCell ?? "all"}";
        
        if (_cache.TryGetValue(cacheKey, out object? cachedAnalysis))
        {
            return cachedAnalysis!;
        }
        
        try
        {
            var fromDate = DateTime.Now.AddDays(-3); // Optimize to 3 days for better performance
            var batchQuery = _context.BatchDashboardAnalytics
                .Where(b => b.StartTime >= fromDate && b.BatchNo != "999999");
                
            if (!string.IsNullOrEmpty(processCell))
            {
                batchQuery = batchQuery.Where(b => b.ProcessCell == processCell);
            }
            
            var batchData = await batchQuery.ToListAsync();
            
            var downtimeByType = new[]
            {
                new {
                    EventType = "Break",
                    TotalMinutes = batchData.Sum(b => b.TotalBreakMinutes ?? 0),
                    EventCount = batchData.Count(b => (b.TotalBreakMinutes ?? 0) > 0),
                    AvgDuration = batchData.Where(b => (b.TotalBreakMinutes ?? 0) > 0).Any() 
                        ? batchData.Where(b => (b.TotalBreakMinutes ?? 0) > 0).Average(b => b.TotalBreakMinutes ?? 0) : 0.0
                },
                new {
                    EventType = "Clean",
                    TotalMinutes = batchData.Sum(b => b.TotalCleanMinutes ?? 0),
                    EventCount = batchData.Count(b => (b.TotalCleanMinutes ?? 0) > 0),
                    AvgDuration = batchData.Where(b => (b.TotalCleanMinutes ?? 0) > 0).Any() 
                        ? batchData.Where(b => (b.TotalCleanMinutes ?? 0) > 0).Average(b => b.TotalCleanMinutes ?? 0) : 0.0
                },
                new {
                    EventType = "Machine Down",
                    TotalMinutes = batchData.Sum(b => b.TotalMachineDownMinutes ?? 0),
                    EventCount = batchData.Count(b => (b.TotalMachineDownMinutes ?? 0) > 0),
                    AvgDuration = batchData.Where(b => (b.TotalMachineDownMinutes ?? 0) > 0).Any() 
                        ? batchData.Where(b => (b.TotalMachineDownMinutes ?? 0) > 0).Average(b => b.TotalMachineDownMinutes ?? 0) : 0.0
                },
                new {
                    EventType = "Meeting",
                    TotalMinutes = batchData.Sum(b => b.TotalMeetingMinutes ?? 0),
                    EventCount = batchData.Count(b => (b.TotalMeetingMinutes ?? 0) > 0),
                    AvgDuration = batchData.Where(b => (b.TotalMeetingMinutes ?? 0) > 0).Any() 
                        ? batchData.Where(b => (b.TotalMeetingMinutes ?? 0) > 0).Average(b => b.TotalMeetingMinutes ?? 0) : 0.0
                },
                new {
                    EventType = "Shift Change",
                    TotalMinutes = batchData.Sum(b => b.TotalShiftChangeMinutes ?? 0),
                    EventCount = batchData.Count(b => (b.TotalShiftChangeMinutes ?? 0) > 0),
                    AvgDuration = batchData.Where(b => (b.TotalShiftChangeMinutes ?? 0) > 0).Any() 
                        ? batchData.Where(b => (b.TotalShiftChangeMinutes ?? 0) > 0).Average(b => b.TotalShiftChangeMinutes ?? 0) : 0.0
                }
            }.Where(e => e.TotalMinutes > 0).OrderByDescending(e => e.TotalMinutes).ToList();
            
            var downtimeByDay = batchData
                .Where(b => b.BatchDate.HasValue)
                .GroupBy(b => b.BatchDate!.Value.Date)
                .Select(g => new
                {
                    Date = g.Key,
                    TotalMinutes = g.Sum(b => (b.TotalBreakMinutes ?? 0) + (b.TotalCleanMinutes ?? 0) + 
                                            (b.TotalMachineDownMinutes ?? 0) + (b.TotalMeetingMinutes ?? 0) + 
                                            (b.TotalShiftChangeMinutes ?? 0)),
                    EventCount = g.Count()
                })
                .OrderBy(x => x.Date)
                .ToList();
            
            var result = new
            {
                DowntimeByType = downtimeByType,
                DowntimeByDay = downtimeByDay,
                ProcessCell = processCell ?? "All",
                GeneratedAt = DateTime.Now
            };
            
            _cache.Set(cacheKey, result, TimeSpan.FromMinutes(CACHE_MINUTES));
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting downtime analysis for {ProcessCell}", processCell ?? "all");
            throw;
        }
    }
    
    public async Task<object> GetShiftChangeImpactAsync()
    {
        const string cacheKey = "shift_change_impact";
        
        if (_cache.TryGetValue(cacheKey, out object? cachedImpact))
        {
            return cachedImpact!;
        }
        
        try
        {
            var fromDate = DateTime.Now.AddDays(-90);
            
            var shiftChangeImpact = await _context.BatchDashboardAnalytics
                .Where(b => b.StartTime >= fromDate)
                .GroupBy(b => b.ProcessCell)
                .Select(g => new
                {
                    ProcessCell = g.Key,
                    TotalBatches = g.Count(),
                    ShiftChangeBatches = g.Count(b => b.HasShiftChangeImpact == 1),
                    NormalBatches = g.Count(b => b.HasShiftChangeImpact == 0),
                    AvgBagsPerHour = g.Average(b => b.BagsPerHour ?? 0),
                    AvgNormalPeriodBagsPerHour = g.Where(b => b.HasShiftChangeImpact == 0)
                                                  .Average(b => b.BagsPerHour ?? 0),
                    AvgShiftChangeBagsPerHour = g.Where(b => b.HasShiftChangeImpact == 1)
                                               .Average(b => b.BagsPerHour ?? 0),
                    ShiftChangeImpactPercentage = (double)g.Count(b => b.HasShiftChangeImpact == 1) / g.Count() * 100
                })
                .ToListAsync();
            
            var result = new
            {
                ShiftChangeImpact = shiftChangeImpact,
                GeneratedAt = DateTime.Now
            };
            
            _cache.Set(cacheKey, result, TimeSpan.FromMinutes(CACHE_MINUTES * 2));
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting shift change impact analysis");
            throw;
        }
    }
} 