namespace DashboardAPI.Models
{
    public class DailyProductionSummary
    {
        public DateTime BatchDate { get; set; }
        public string ProcessCell { get; set; } = string.Empty;
        public int TotalBatches { get; set; }
        public int NormalBatches { get; set; }
        public int ShiftChangeBatches { get; set; }
        public double? TotalBagsProduced { get; set; }
        public double? AvgCycleTimeMinutes { get; set; }
        public double? AvgBagsPerHour { get; set; }
        public double? AvgNetBagsPerHour { get; set; }
        public double? AvgAdjustedBagsPerHour { get; set; }
        public double? AvgAdjustedNetBagsPerHour { get; set; }
        public double? TotalWeightProduced { get; set; }
        public int CompletedBatches { get; set; }
        public int IncompleteBatches { get; set; }
        public double? AvgDowntimeMinutes { get; set; }
        public double? AvgDowntimePercentage { get; set; }
        public int TotalBreakMinutes { get; set; }
        public int TotalCleanMinutes { get; set; }
        public int TotalMachineDownMinutes { get; set; }
        public int TotalMeetingMinutes { get; set; }
        public int TotalShiftChangeMinutes { get; set; }
        public double? ShiftChangeImpactPercentage { get; set; }
    }
} 