namespace DashboardAPI.Models
{
    public class EventAnalytics
    {
        public string? ProcessCell { get; set; }
        public string? EventType { get; set; }
        public string? EventCategory { get; set; }
        public int EventCount { get; set; }
        public int TotalDurationMinutes { get; set; }
        public double AvgDurationMinutes { get; set; }
        public int MinDurationMinutes { get; set; }
        public int MaxDurationMinutes { get; set; }
        public int EventsSince2023 { get; set; }
        public int DurationSince2023 { get; set; }
        public int EventsLast30Days { get; set; }
        public int DurationLast30Days { get; set; }
        public int? PeakHour { get; set; }
    }
} 