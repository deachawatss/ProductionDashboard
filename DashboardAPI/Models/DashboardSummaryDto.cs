namespace DashboardAPI.Models;

public class DashboardSummaryDto
{
    public int TotalBatches { get; set; }
    public int CompletedBatches { get; set; }
    public int InProgressBatches { get; set; }
    public double AvgBagsPerHour { get; set; }
    public int TotalProduction { get; set; }
    public DateTime LastUpdated { get; set; }
    
    // Enhanced metrics
    public double AvgNetBagsPerHour { get; set; }
    public double AvgAdjustedBagsPerHour { get; set; }
    public double AvgDowntimePercentage { get; set; }
    public int ShiftChangeBatches { get; set; }
    public double ShiftChangeImpactPercentage { get; set; }
    
    // Downtime breakdown
    public DowntimeBreakdown Downtime { get; set; } = new();
}

public class DowntimeBreakdown
{
    public int TotalBreakMinutes { get; set; }
    public int TotalCleanMinutes { get; set; }
    public int TotalMachineDownMinutes { get; set; }
    public int TotalMeetingMinutes { get; set; }
    public int TotalShiftChangeMinutes { get; set; }
    public int TotalDowntimeMinutes { get; set; }
} 