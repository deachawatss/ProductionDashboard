using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DashboardAPI.Models;

[Table("vw_ProductionEvents")]
public class ProductionEvent
{

    
    public string? BatchNo { get; set; }
    public string? ProcessCell { get; set; }
    public string? EventType { get; set; }
    public string? Location { get; set; }
    
    public DateTime? EventStart { get; set; }
    public DateTime? EventEnd { get; set; }
    public int? DurationMinutes { get; set; }
    public string? SourceTable { get; set; }
    
    // Date/Time Analytics
    public DateTime? EventDate { get; set; }
    public int? EventHour { get; set; }
    public int? DayOfWeek { get; set; }
    public int? WeekOfYear { get; set; }
    public int? MonthOfYear { get; set; }
    public int? Quarter { get; set; }
    public int? Year { get; set; }
    
    // Event Classification
    public string? EventCategory { get; set; }
} 