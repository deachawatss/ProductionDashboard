using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DashboardAPI.Models;

[Table("vw_CleaningActivities")]
public class CleaningActivity
{

    
    public string BatchNo { get; set; } = string.Empty;
    public string ProcessCell { get; set; } = string.Empty;
    public string ActivityType { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public int CleanCycle { get; set; }
    
    public DateTime? CleanStart { get; set; }
    public DateTime? CleanEnd { get; set; }
    public int? DurationMinutes { get; set; }
    public string SourceTable { get; set; } = string.Empty;
    public string LineType { get; set; } = string.Empty;
    
    // Date/Time Analytics
    public DateTime? CleanDate { get; set; }
    public int? CleanHour { get; set; }
    public int? DayOfWeek { get; set; }
    public int? WeekOfYear { get; set; }
    public int? MonthOfYear { get; set; }
    public int? Quarter { get; set; }
    public int? Year { get; set; }
    
    // Shift Classification
    public string ShiftType { get; set; } = string.Empty;
    
    // Duration Categories
    public string DurationCategory { get; set; } = string.Empty;
    
    // Efficiency Indicators
    public double? Hours { get; set; }
    
    // Status
    public string CleanStatus { get; set; } = string.Empty;
} 