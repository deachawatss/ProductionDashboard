using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DashboardAPI.Models;

[Table("vw_BatchDashboardAnalytics")]
public class BatchDashboardAnalytics
{
    [Key]
    public string BatchNo { get; set; } = string.Empty;
    
    public string? ItemKey { get; set; }
    public string? ProductName { get; set; }
    public string? CustKey { get; set; }
    public string? ProcessCellId { get; set; }
    public string ProcessCell { get; set; } = string.Empty;
    public string? LineCategory { get; set; }
    public string? SourceTable { get; set; }
    
    // Timing Information
    public DateTime? StartTime { get; set; }
    public DateTime? FinishTime { get; set; }
    public DateTime? StartBatch { get; set; }
    public DateTime? StartBlend { get; set; }
    public DateTime? StartPack { get; set; }
    public DateTime? StartTip { get; set; }
    public DateTime? FinishTip { get; set; }
    public DateTime? FinishBlend { get; set; }
    public DateTime? FinishPack { get; set; }
    
    // Duration Metrics (minutes)
    public int? TotalMinutes { get; set; }
    public int? BatchToBlendMinutes { get; set; }
    public int? BlendMinutes { get; set; }
    public int? PackMinutes { get; set; }
    public int? TipMinutes { get; set; }
    
    // Event Duration Metrics (minutes)
    public int? TotalBreakMinutes { get; set; }
    public int? TotalCleanMinutes { get; set; }
    public int? TotalMachineDownMinutes { get; set; }
    public int? TotalMeetingMinutes { get; set; }
    public int? TotalShiftChangeMinutes { get; set; }
    public int? TotalDowntimeMinutes { get; set; }
    public int? NetProductionMinutes { get; set; }
    
    // Production Metrics
    public string? TotalBags { get; set; }
    public string? PartialBags { get; set; }
    public string? TotBatchWeight { get; set; }
    public string? BagSize { get; set; }
    
    // Calculated Efficiency Metrics
    public double? Hours { get; set; }
    public double? BagsPerHour { get; set; }
    public double? NetBagsPerHour { get; set; }
    public double? WeightPerHour { get; set; }
    public double? DowntimePercentage { get; set; }
    
    // Shift Change Detection
    public int? IsShiftChangePeriod { get; set; }
    public int? EndsInShiftChangePeriod { get; set; }
    public int? HasShiftChangeImpact { get; set; }
    
    // Adjusted Efficiency Metrics
    public double? AdjustedBagsPerHour { get; set; }
    public double? AdjustedNetBagsPerHour { get; set; }
    
    // Date/Time Analytics
    public DateTime? BatchDate { get; set; }
    public int? StartHour { get; set; }
    public int? DayOfWeek { get; set; }
    public int? WeekOfYear { get; set; }
    public int? MonthOfYear { get; set; }
    public int? Quarter { get; set; }
    public int? Year { get; set; }
    
    public string? BatchStatus { get; set; }
} 