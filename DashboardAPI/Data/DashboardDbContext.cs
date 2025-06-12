using Microsoft.EntityFrameworkCore;
using DashboardAPI.Models;

namespace DashboardAPI.Data;

public class DashboardDbContext : DbContext
{
    public DashboardDbContext(DbContextOptions<DashboardDbContext> options) : base(options)
    {
    }

    public DbSet<BatchDashboardAnalytics> BatchDashboardAnalytics { get; set; }
    public DbSet<ProductionEvent> ProductionEvents { get; set; }
    public DbSet<CleaningActivity> CleaningActivities { get; set; }
    
    // Analytics views
    public DbSet<ProcessCellEfficiency> ProcessCellEfficiencies { get; set; }
    public DbSet<ProductPerformanceSummary> ProductPerformanceSummaries { get; set; }
    // public DbSet<EventAnalytics> EventAnalytics { get; set; } // Temporarily disabled due to null value issues
    public DbSet<DailyProductionSummary> DailyProductionSummaries { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Configure the view entity
        modelBuilder.Entity<BatchDashboardAnalytics>(entity =>
        {
            entity.ToTable("vw_BatchDashboardAnalytics");
            entity.HasKey(e => e.BatchNo);
            
            // Configure string length for performance
            entity.Property(e => e.BatchNo).HasMaxLength(50);
            entity.Property(e => e.ProcessCell).HasMaxLength(50);
            entity.Property(e => e.ProductName).HasMaxLength(200);
            entity.Property(e => e.BatchStatus).HasMaxLength(50);
            
            // Configure properties for database compatibility - map FLOAT columns to double
            entity.Property(e => e.Hours).HasColumnType("float");
            entity.Property(e => e.BagsPerHour).HasColumnType("float");
            entity.Property(e => e.NetBagsPerHour).HasColumnType("float");
            entity.Property(e => e.WeightPerHour).HasColumnType("float");
            entity.Property(e => e.DowntimePercentage).HasColumnType("float");
            entity.Property(e => e.AdjustedBagsPerHour).HasColumnType("float");
            entity.Property(e => e.AdjustedNetBagsPerHour).HasColumnType("float");
        });

        modelBuilder.Entity<ProductionEvent>(entity =>
        {
            entity.ToTable("vw_ProductionEvents");
            entity.HasKey(e => new { e.BatchNo, e.EventStart, e.EventType, e.Location });
        });

        modelBuilder.Entity<CleaningActivity>(entity =>
        {
            entity.ToTable("vw_CleaningActivities");
            entity.HasKey(e => new { e.BatchNo, e.CleanStart, e.Location, e.CleanCycle });
            entity.Property(e => e.Hours).HasColumnType("float");
        });

        // Configure ProcessCellEfficiency as a view
        modelBuilder.Entity<ProcessCellEfficiency>(entity =>
        {
            entity.ToView("vw_ProcessCellEfficiency");
            entity.HasKey(e => e.ProcessCell);
            entity.Property(e => e.ProcessCell).HasColumnName("ProcessCell");
        });

        // Configure ProductPerformanceSummary as a view
        modelBuilder.Entity<ProductPerformanceSummary>(entity =>
        {
            entity.ToView("vw_ProductPerformanceSummary");
            entity.HasKey(e => new { e.ItemKey, e.ProductName, e.ProcessCell });
            entity.Property(e => e.ItemKey).HasColumnName("ItemKey");
            entity.Property(e => e.ProductName).HasColumnName("ProductName");
            entity.Property(e => e.ProcessCell).HasColumnName("ProcessCell");
        });

        // Configure EventAnalytics as a view - Temporarily disabled due to null value issues
        /*
        modelBuilder.Entity<EventAnalytics>(entity =>
        {
            entity.ToView("vw_EventAnalytics");
            entity.HasKey(e => new { e.ProcessCell, e.EventType, e.EventCategory });
            entity.Property(e => e.ProcessCell).HasColumnName("ProcessCell");
            entity.Property(e => e.EventType).HasColumnName("EventType");
            entity.Property(e => e.EventCategory).HasColumnName("EventCategory");
        });
        */

        // Configure DailyProductionSummary as a view
        modelBuilder.Entity<DailyProductionSummary>(entity =>
        {
            entity.ToView("vw_DailyProductionSummary");
            entity.HasKey(e => new { e.BatchDate, e.ProcessCell });
            entity.Property(e => e.BatchDate).HasColumnName("BatchDate");
            entity.Property(e => e.ProcessCell).HasColumnName("ProcessCell");
        });
    }
} 