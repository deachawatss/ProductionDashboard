namespace DashboardAPI.Models
{
    public class ProcessCellEfficiency
    {
        public string? ProcessCell { get; set; }
        public int TotalBatches { get; set; }
        public int NormalBatches { get; set; }
        public int ShiftChangeBatches { get; set; }
        public double? AvgCycleTime { get; set; }
        public double? AvgNetProductionTime { get; set; }
        public double? AvgBagsPerHour { get; set; }
        public double? AvgNetBagsPerHour { get; set; }
        public double? AvgAdjustedBagsPerHour { get; set; }
        public double? AvgAdjustedNetBagsPerHour { get; set; }
        public double? AvgNormalPeriodBagsPerHour { get; set; }
        public double? AvgNormalPeriodNetBagsPerHour { get; set; }
        public double? AvgNormalPeriodCycleTime { get; set; }
        public double? AvgWeightPerHour { get; set; }
        public double? TotalBagsProduced { get; set; }
        public double? TotalWeightProduced { get; set; }
        public double? CompletionRate { get; set; }
        public double? AvgDowntimePercentage { get; set; }
        public double? AvgBreakMinutes { get; set; }
        public double? AvgCleanMinutes { get; set; }
        public double? AvgMachineDownMinutes { get; set; }
        public double? AvgShiftChangeMinutes { get; set; }
        public double? ShiftChangeImpactPercentage { get; set; }
        public double? PotentialImprovementPercent { get; set; }
    }
} 