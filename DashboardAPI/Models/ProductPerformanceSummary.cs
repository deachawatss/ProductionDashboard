namespace DashboardAPI.Models
{
    public class ProductPerformanceSummary
    {
        public string ItemKey { get; set; } = string.Empty;
        public string ProductName { get; set; } = string.Empty;
        public string ProcessCell { get; set; } = string.Empty;
        public int BatchCount { get; set; }
        public int NormalBatchCount { get; set; }
        public int ShiftChangeBatchCount { get; set; }
        public double? AvgTotalMinutes { get; set; }
        public double? AvgNetProductionMinutes { get; set; }
        public double? MinTotalMinutes { get; set; }
        public double? MaxTotalMinutes { get; set; }
        public double? StdDevTotalMinutes { get; set; }
        public double? AvgBlendMinutes { get; set; }
        public double? AvgPackMinutes { get; set; }
        public double? AvgTipMinutes { get; set; }
        public double? AvgBagsPerHour { get; set; }
        public double? AvgNetBagsPerHour { get; set; }
        public double? AvgAdjustedBagsPerHour { get; set; }
        public double? AvgAdjustedNetBagsPerHour { get; set; }
        public double? AvgNormalPeriodBagsPerHour { get; set; }
        public double? AvgNormalPeriodNetBagsPerHour { get; set; }
        public double? TotalBagsProduced { get; set; }
        public double? AvgDowntimePercentage { get; set; }
        public double? ShiftChangeImpactPercentage { get; set; }
    }
} 