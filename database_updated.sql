-- Drop existing views if they exist
IF OBJECT_ID('dbo.vw_BatchDashboardAnalytics', 'V') IS NOT NULL
    DROP VIEW dbo.vw_BatchDashboardAnalytics;
IF OBJECT_ID('dbo.vw_ProductionEvents', 'V') IS NOT NULL
    DROP VIEW dbo.vw_ProductionEvents;
IF OBJECT_ID('dbo.vw_EventAnalytics', 'V') IS NOT NULL
    DROP VIEW dbo.vw_EventAnalytics;
IF OBJECT_ID('dbo.vw_DailyProductionSummary', 'V') IS NOT NULL
    DROP VIEW dbo.vw_DailyProductionSummary;
IF OBJECT_ID('dbo.vw_ProductPerformanceSummary', 'V') IS NOT NULL
    DROP VIEW dbo.vw_ProductPerformanceSummary;
IF OBJECT_ID('dbo.vw_ProcessCellEfficiency', 'V') IS NOT NULL
    DROP VIEW dbo.vw_ProcessCellEfficiency;
IF OBJECT_ID('dbo.vw_CleaningActivities', 'V') IS NOT NULL
    DROP VIEW dbo.vw_CleaningActivities;
IF OBJECT_ID('dbo.vw_CleaningAnalytics', 'V') IS NOT NULL
    DROP VIEW dbo.vw_CleaningAnalytics;
IF OBJECT_ID('dbo.vw_DailyCleaningSummary', 'V') IS NOT NULL
    DROP VIEW dbo.vw_DailyCleaningSummary;
GO

-- Create enhanced view with Event Management support
CREATE VIEW dbo.vw_BatchDashboardAnalytics AS
WITH BatchDataCombined AS (
    -- ข้อมูลจาก TFC_PTiming (Aussie & Yankee Lines) with Event Data
    SELECT
        pn.BatchNo,
        pn.FormulaId AS ItemKey,
        pn.Description AS ProductName,
        pn.CustKey,
        pn.ProcessCellId,
        tp.ProcessCell,
        tp.ProcessCell AS LineCategory,
        'TFC_PTiming' AS SourceTable,
        
        -- Timing Information
        tp.StartBatch AS StartTime,
        tp.Finish AS FinishTime,
        tp.StartBatch,
        tp.Startblend AS StartBlend,
        tp.StartPack,
        tp.Finish AS FinishAll,
        NULL AS StartTip,
        NULL AS FinishTip,
        NULL AS FinishBlend,
        NULL AS FinishPack,
        
        -- Duration Calculations (in minutes)
        CASE 
            WHEN tp.StartBatch IS NOT NULL AND tp.Finish IS NOT NULL
            THEN DATEDIFF(MINUTE, tp.StartBatch, tp.Finish)
        END AS TotalMinutes,
        
        CASE 
            WHEN tp.StartBatch IS NOT NULL AND tp.Startblend IS NOT NULL
            THEN DATEDIFF(MINUTE, tp.StartBatch, tp.Startblend)
        END AS BatchToBlendMinutes,
        
        CASE 
            WHEN tp.Startblend IS NOT NULL AND tp.StartPack IS NOT NULL
            THEN DATEDIFF(MINUTE, tp.Startblend, tp.StartPack)
        END AS BlendMinutes,
        
        CASE 
            WHEN tp.StartPack IS NOT NULL AND tp.Finish IS NOT NULL
            THEN DATEDIFF(MINUTE, tp.StartPack, tp.Finish)
        END AS PackMinutes,
        
        NULL AS TipMinutes,
        
        -- Production Metrics
        tp.TotalBags AS TotalBags,
        tp.PartialBags AS PartialBags,
        tp.TotBatchWeight,
        tp.BagSize,
        
        -- Event Duration Calculations (in minutes)
        COALESCE(
            CASE 
                WHEN tp.Breakstartup IS NOT NULL AND tp.Breakfinishup IS NOT NULL
                THEN DATEDIFF(MINUTE, tp.Breakstartup, tp.Breakfinishup)
                ELSE 0
            END +
            CASE 
                WHEN tp.Breakstartdown IS NOT NULL AND tp.Breakfinishdown IS NOT NULL
                THEN DATEDIFF(MINUTE, tp.Breakstartdown, tp.Breakfinishdown)
                ELSE 0
            END, 0) AS TotalBreakMinutes,
        
        COALESCE(
            CASE 
                WHEN tp.Cleanstartup IS NOT NULL AND tp.Cleanfinishup IS NOT NULL
                THEN DATEDIFF(MINUTE, tp.Cleanstartup, tp.Cleanfinishup)
                ELSE 0
            END +
            CASE 
                WHEN tp.Cleanstartdown IS NOT NULL AND tp.Cleanfinishdown IS NOT NULL
                THEN DATEDIFF(MINUTE, tp.Cleanstartdown, tp.Cleanfinishdown)
                ELSE 0
            END +
            CASE 
                WHEN tp.cleanstartup2 IS NOT NULL AND tp.cleanfinishup2 IS NOT NULL
                THEN DATEDIFF(MINUTE, tp.cleanstartup2, tp.cleanfinishup2)
                ELSE 0
            END +
            CASE 
                WHEN tp.cleanstartdown2 IS NOT NULL AND tp.cleanfinishdown2 IS NOT NULL
                THEN DATEDIFF(MINUTE, tp.cleanstartdown2, tp.cleanfinishdown2)
                ELSE 0
            END +
            CASE 
                WHEN tp.cleanstartup3 IS NOT NULL AND tp.cleanfinishup3 IS NOT NULL
                THEN DATEDIFF(MINUTE, tp.cleanstartup3, tp.cleanfinishup3)
                ELSE 0
            END +
            CASE 
                WHEN tp.cleanstartdown3 IS NOT NULL AND tp.cleanfinishdown3 IS NOT NULL
                THEN DATEDIFF(MINUTE, tp.cleanstartdown3, tp.cleanfinishdown3)
                ELSE 0
            END, 0) AS TotalCleanMinutes,
        
        COALESCE(
            CASE 
                WHEN tp.Machdownstartupstairs IS NOT NULL AND tp.Machdownfinishupstairs IS NOT NULL
                THEN DATEDIFF(MINUTE, tp.Machdownstartupstairs, tp.Machdownfinishupstairs)
                ELSE 0
            END +
            CASE 
                WHEN tp.Machdownstartdownstairs IS NOT NULL AND tp.Machdownfinishdownstairs IS NOT NULL
                THEN DATEDIFF(MINUTE, tp.Machdownstartdownstairs, tp.Machdownfinishdownstairs)
                ELSE 0
            END, 0) AS TotalMachineDownMinutes,
        
        COALESCE(
            CASE 
                WHEN tp.meetingstartup IS NOT NULL AND tp.meetingfinishup IS NOT NULL
                THEN DATEDIFF(MINUTE, tp.meetingstartup, tp.meetingfinishup)
                ELSE 0
            END +
            CASE 
                WHEN tp.meetingstartdown IS NOT NULL AND tp.meetingfinishdown IS NOT NULL
                THEN DATEDIFF(MINUTE, tp.meetingstartdown, tp.meetingfinishdown)
                ELSE 0
            END, 0) AS TotalMeetingMinutes,
        
        COALESCE(
            CASE 
                WHEN tp.shiftchangestartup IS NOT NULL AND tp.shiftchangefinishup IS NOT NULL
                THEN DATEDIFF(MINUTE, tp.shiftchangestartup, tp.shiftchangefinishup)
                ELSE 0
            END +
            CASE 
                WHEN tp.shiftchangestartdown IS NOT NULL AND tp.shiftchangefinishdown IS NOT NULL
                THEN DATEDIFF(MINUTE, tp.shiftchangestartdown, tp.shiftchangefinishdown)
                ELSE 0
            END, 0) AS TotalShiftChangeMinutes,
        
        -- Batch Status
        CASE 
            WHEN tp.Finish IS NOT NULL THEN 'Complete'
            WHEN tp.StartPack IS NOT NULL THEN 'Packing'
            WHEN tp.Startblend IS NOT NULL THEN 'Blending'
            WHEN tp.StartBatch IS NOT NULL THEN 'In Progress'
            ELSE 'Unknown'
        END AS BatchStatus

    FROM TFCLIVE.dbo.TFC_PTiming tp
    LEFT JOIN TFCLIVE.dbo.PNMAST pn ON tp.BatchNo = pn.BatchNo
    WHERE tp.StartBatch IS NOT NULL
      AND tp.StartBatch >= '2023-01-01'

    UNION ALL

    -- ข้อมูลจาก TFC_PTiming2 (Seasoning Line) - placeholder for future event columns
    SELECT
        pn.BatchNo,
        tp2.FGItemkey AS ItemKey,
        pn.Description AS ProductName,
        pn.CustKey,
        pn.ProcessCellId,
        'Seasoning' AS ProcessCell,
        'Seasoning' AS LineCategory,
        'TFC_PTiming2' AS SourceTable,
        
        -- Timing Information (ใช้ StartTip เป็นจุดเริ่มต้น)
        tp2.StartTip AS StartTime,
        tp2.FinishPack AS FinishTime,
        NULL AS StartBatch,
        tp2.StartBlend,
        tp2.StartPack,
        tp2.FinishPack AS FinishAll,
        tp2.StartTip,
        tp2.FinishTip,
        tp2.FinishBlend,
        tp2.FinishPack,
        
        -- Duration Calculations (in minutes)
        CASE 
            WHEN tp2.StartTip IS NOT NULL AND tp2.FinishPack IS NOT NULL
            THEN DATEDIFF(MINUTE, tp2.StartTip, tp2.FinishPack)
        END AS TotalMinutes,
        
        CASE 
            WHEN tp2.StartTip IS NOT NULL AND tp2.StartBlend IS NOT NULL
            THEN DATEDIFF(MINUTE, tp2.StartTip, tp2.StartBlend)
        END AS BatchToBlendMinutes,
        
        CASE 
            WHEN tp2.StartBlend IS NOT NULL AND tp2.FinishBlend IS NOT NULL
            THEN DATEDIFF(MINUTE, tp2.StartBlend, tp2.FinishBlend)
        END AS BlendMinutes,
        
        CASE 
            WHEN tp2.StartPack IS NOT NULL AND tp2.FinishPack IS NOT NULL
            THEN DATEDIFF(MINUTE, tp2.StartPack, tp2.FinishPack)
        END AS PackMinutes,
        
        CASE 
            WHEN tp2.StartTip IS NOT NULL AND tp2.FinishTip IS NOT NULL
            THEN DATEDIFF(MINUTE, tp2.StartTip, tp2.FinishTip)
        END AS TipMinutes,
        
        -- Production Metrics
        tp2.FullBags AS TotalBags,
        tp2.PartBags AS PartialBags,
        tp2.IBCKG AS TotBatchWeight,
        tp2.BagSize,
        
        -- Event Duration Calculations (placeholder for future implementation)
        0 AS TotalBreakMinutes,
        0 AS TotalCleanMinutes,
        0 AS TotalMachineDownMinutes,
        0 AS TotalMeetingMinutes,
        0 AS TotalShiftChangeMinutes,
        
        -- Batch Status
        CASE 
            WHEN tp2.FinishPack IS NOT NULL THEN 'Complete'
            WHEN tp2.StartPack IS NOT NULL THEN 'Packing'
            WHEN tp2.FinishBlend IS NOT NULL THEN 'Blending'
            WHEN tp2.StartBlend IS NOT NULL THEN 'Blend Started'
            WHEN tp2.FinishTip IS NOT NULL THEN 'Tipping'
            WHEN tp2.StartTip IS NOT NULL THEN 'Tip Started'
            ELSE 'Unknown'
        END AS BatchStatus

    FROM TFCLIVE.dbo.TFC_PTiming2 tp2
    LEFT JOIN TFCLIVE.dbo.PNMAST pn ON tp2.BatchNo = pn.BatchNo
    WHERE tp2.StartTip IS NOT NULL
      AND tp2.StartTip >= '2023-01-01'
)
SELECT 
    -- Basic Information
    BatchNo,
    ItemKey,
    ProductName,
    CustKey,
    ProcessCellId,
    ProcessCell,
    LineCategory,
    SourceTable,
    
    -- Timing Information
    StartTime,
    FinishTime,
    StartBatch,
    StartBlend,
    StartPack,
    StartTip,
    FinishTip,
    FinishBlend,
    FinishPack,
    
    -- Duration Metrics (minutes)
    TotalMinutes,
    BatchToBlendMinutes,
    BlendMinutes,
    PackMinutes,
    TipMinutes,
    
    -- Event Duration Metrics (minutes)
    TotalBreakMinutes,
    TotalCleanMinutes,
    TotalMachineDownMinutes,
    TotalMeetingMinutes,
    TotalShiftChangeMinutes,
    
    -- Total Non-Production Time
    (TotalBreakMinutes + TotalCleanMinutes + TotalMachineDownMinutes + 
     TotalMeetingMinutes + TotalShiftChangeMinutes) AS TotalDowntimeMinutes,
    
    -- Net Production Time (Total - Downtime)
    CASE 
        WHEN TotalMinutes > 0 
        THEN TotalMinutes - (TotalBreakMinutes + TotalCleanMinutes + TotalMachineDownMinutes + 
                           TotalMeetingMinutes + TotalShiftChangeMinutes)
        ELSE TotalMinutes
    END AS NetProductionMinutes,
    
    -- Production Metrics
    TotalBags,
    PartialBags,
    TotBatchWeight,
    BagSize,
    
    -- Calculated Efficiency Metrics
    CASE 
        WHEN TotalMinutes > 0 AND TotalMinutes IS NOT NULL
        THEN ROUND(CAST(TotalMinutes AS FLOAT) / 60.0, 2)
    END AS Hours,
    
    CASE 
        WHEN TotalMinutes > 0 AND TRY_CAST(TotalBags AS FLOAT) > 0 AND TotalMinutes IS NOT NULL AND TotalBags IS NOT NULL
        THEN ROUND((TRY_CAST(TotalBags AS FLOAT) * 60.0) / CAST(TotalMinutes AS FLOAT), 2)
    END AS BagsPerHour,
    
    -- Net Efficiency (excluding downtime)
    CASE 
        WHEN (TotalMinutes - (TotalBreakMinutes + TotalCleanMinutes + TotalMachineDownMinutes + 
              TotalMeetingMinutes + TotalShiftChangeMinutes)) > 0 
             AND TRY_CAST(TotalBags AS FLOAT) > 0 AND TotalMinutes IS NOT NULL AND TotalBags IS NOT NULL
        THEN ROUND((TRY_CAST(TotalBags AS FLOAT) * 60.0) / 
             CAST((TotalMinutes - (TotalBreakMinutes + TotalCleanMinutes + TotalMachineDownMinutes + 
                   TotalMeetingMinutes + TotalShiftChangeMinutes)) AS FLOAT), 2)
    END AS NetBagsPerHour,
    
    CASE 
        WHEN TotalMinutes > 0 AND TRY_CAST(TotBatchWeight AS FLOAT) > 0 AND TotalMinutes IS NOT NULL AND TotBatchWeight IS NOT NULL
        THEN ROUND((TRY_CAST(TotBatchWeight AS FLOAT) * 60.0) / CAST(TotalMinutes AS FLOAT), 2)
    END AS WeightPerHour,
    
    -- Downtime Percentages
    CASE 
        WHEN TotalMinutes > 0 
        THEN ROUND(CAST((TotalBreakMinutes + TotalCleanMinutes + TotalMachineDownMinutes + 
                   TotalMeetingMinutes + TotalShiftChangeMinutes) AS FLOAT) / TotalMinutes * 100, 2)
        ELSE 0
    END AS DowntimePercentage,
    
    -- Shift Change Period Detection
    CASE 
        WHEN (DATEPART(HOUR, StartTime) = 6 AND DATEPART(MINUTE, StartTime) >= 30) OR
             (DATEPART(HOUR, StartTime) = 7 AND DATEPART(MINUTE, StartTime) <= 30) OR
             (DATEPART(HOUR, StartTime) = 18 AND DATEPART(MINUTE, StartTime) >= 30) OR
             (DATEPART(HOUR, StartTime) = 19 AND DATEPART(MINUTE, StartTime) <= 30)
        THEN 1 ELSE 0
    END AS IsShiftChangePeriod,
    
    CASE 
        WHEN (DATEPART(HOUR, FinishTime) = 6 AND DATEPART(MINUTE, FinishTime) >= 30) OR
             (DATEPART(HOUR, FinishTime) = 7 AND DATEPART(MINUTE, FinishTime) <= 30) OR
             (DATEPART(HOUR, FinishTime) = 18 AND DATEPART(MINUTE, FinishTime) >= 30) OR
             (DATEPART(HOUR, FinishTime) = 19 AND DATEPART(MINUTE, FinishTime) <= 30)
        THEN 1 ELSE 0
    END AS EndsInShiftChangePeriod,
    
    -- Overall Shift Change Impact Flag
    CASE 
        WHEN ((DATEPART(HOUR, StartTime) = 6 AND DATEPART(MINUTE, StartTime) >= 30) OR
              (DATEPART(HOUR, StartTime) = 7 AND DATEPART(MINUTE, StartTime) <= 30) OR
              (DATEPART(HOUR, StartTime) = 18 AND DATEPART(MINUTE, StartTime) >= 30) OR
              (DATEPART(HOUR, StartTime) = 19 AND DATEPART(MINUTE, StartTime) <= 30)) OR
             ((DATEPART(HOUR, FinishTime) = 6 AND DATEPART(MINUTE, FinishTime) >= 30) OR
              (DATEPART(HOUR, FinishTime) = 7 AND DATEPART(MINUTE, FinishTime) <= 30) OR
              (DATEPART(HOUR, FinishTime) = 18 AND DATEPART(MINUTE, FinishTime) >= 30) OR
              (DATEPART(HOUR, FinishTime) = 19 AND DATEPART(MINUTE, FinishTime) <= 30))
        THEN 1 ELSE 0
    END AS HasShiftChangeImpact,
    
    -- Adjusted Efficiency Metrics (excluding shift change periods)
    CASE 
        WHEN TotalMinutes > 0 AND TRY_CAST(TotalBags AS FLOAT) > 0 AND TotalMinutes IS NOT NULL AND TotalBags IS NOT NULL
             AND NOT (((DATEPART(HOUR, StartTime) = 6 AND DATEPART(MINUTE, StartTime) >= 30) OR
                      (DATEPART(HOUR, StartTime) = 7 AND DATEPART(MINUTE, StartTime) <= 30) OR
                      (DATEPART(HOUR, StartTime) = 18 AND DATEPART(MINUTE, StartTime) >= 30) OR
                      (DATEPART(HOUR, StartTime) = 19 AND DATEPART(MINUTE, StartTime) <= 30)) OR
                     ((DATEPART(HOUR, FinishTime) = 6 AND DATEPART(MINUTE, FinishTime) >= 30) OR
                      (DATEPART(HOUR, FinishTime) = 7 AND DATEPART(MINUTE, FinishTime) <= 30) OR
                      (DATEPART(HOUR, FinishTime) = 18 AND DATEPART(MINUTE, FinishTime) >= 30) OR
                      (DATEPART(HOUR, FinishTime) = 19 AND DATEPART(MINUTE, FinishTime) <= 30)))
        THEN ROUND((TRY_CAST(TotalBags AS FLOAT) * 60.0) / CAST(TotalMinutes AS FLOAT), 2)
    END AS AdjustedBagsPerHour,
    
    CASE 
        WHEN (TotalMinutes - (TotalBreakMinutes + TotalCleanMinutes + TotalMachineDownMinutes + 
              TotalMeetingMinutes + TotalShiftChangeMinutes)) > 0 
             AND TRY_CAST(TotalBags AS FLOAT) > 0 AND TotalMinutes IS NOT NULL AND TotalBags IS NOT NULL
             AND NOT (((DATEPART(HOUR, StartTime) = 6 AND DATEPART(MINUTE, StartTime) >= 30) OR
                      (DATEPART(HOUR, StartTime) = 7 AND DATEPART(MINUTE, StartTime) <= 30) OR
                      (DATEPART(HOUR, StartTime) = 18 AND DATEPART(MINUTE, StartTime) >= 30) OR
                      (DATEPART(HOUR, StartTime) = 19 AND DATEPART(MINUTE, StartTime) <= 30)) OR
                     ((DATEPART(HOUR, FinishTime) = 6 AND DATEPART(MINUTE, FinishTime) >= 30) OR
                      (DATEPART(HOUR, FinishTime) = 7 AND DATEPART(MINUTE, FinishTime) <= 30) OR
                      (DATEPART(HOUR, FinishTime) = 18 AND DATEPART(MINUTE, FinishTime) >= 30) OR
                      (DATEPART(HOUR, FinishTime) = 19 AND DATEPART(MINUTE, FinishTime) <= 30)))
        THEN ROUND((TRY_CAST(TotalBags AS FLOAT) * 60.0) / 
             CAST((TotalMinutes - (TotalBreakMinutes + TotalCleanMinutes + TotalMachineDownMinutes + 
                   TotalMeetingMinutes + TotalShiftChangeMinutes)) AS FLOAT), 2)
    END AS AdjustedNetBagsPerHour,
    
    -- Date/Time Analytics Fields
    CAST(StartTime AS DATE) AS BatchDate,
    DATEPART(HOUR, StartTime) AS StartHour,
    DATEPART(WEEKDAY, StartTime) AS DayOfWeek,
    DATEPART(WEEK, StartTime) AS WeekOfYear,
    DATEPART(MONTH, StartTime) AS MonthOfYear,
    DATEPART(QUARTER, StartTime) AS Quarter,
    DATEPART(YEAR, StartTime) AS Year,
    
    -- Status
    BatchStatus

FROM BatchDataCombined
WHERE StartTime IS NOT NULL 
  AND BatchNo IS NOT NULL 
  AND BatchNo != '999999'  -- Exclude cleaning/maintenance records
GO

-- ===================================================================
-- Production Events View (Detailed Event Tracking)
-- ===================================================================
CREATE VIEW dbo.vw_ProductionEvents AS
WITH EventData AS (
    -- Break Events from TFC_PTiming
    SELECT
        tp.BatchNo,
        tp.ProcessCell,
        'Break' AS EventType,
        'Up Stairs' AS Location,
        tp.Breakstartup AS EventStart,
        tp.Breakfinishup AS EventEnd,
        CASE 
            WHEN tp.Breakstartup IS NOT NULL AND tp.Breakfinishup IS NOT NULL
            THEN DATEDIFF(MINUTE, tp.Breakstartup, tp.Breakfinishup)
        END AS DurationMinutes,
        'TFC_PTiming' AS SourceTable
    FROM TFCLIVE.dbo.TFC_PTiming tp
    WHERE tp.Breakstartup IS NOT NULL
      AND tp.Breakstartup >= '2023-01-01'
    
    UNION ALL
    
    SELECT
        tp.BatchNo,
        tp.ProcessCell,
        'Break' AS EventType,
        'Down Stairs' AS Location,
        tp.Breakstartdown AS EventStart,
        tp.Breakfinishdown AS EventEnd,
        CASE 
            WHEN tp.Breakstartdown IS NOT NULL AND tp.Breakfinishdown IS NOT NULL
            THEN DATEDIFF(MINUTE, tp.Breakstartdown, tp.Breakfinishdown)
        END AS DurationMinutes,
        'TFC_PTiming' AS SourceTable
    FROM TFCLIVE.dbo.TFC_PTiming tp
    WHERE tp.Breakstartdown IS NOT NULL
      AND tp.Breakstartdown >= '2023-01-01'
    
    UNION ALL
    
    -- Clean Events from TFC_PTiming (6 cleaning cycles)
    SELECT
        tp.BatchNo,
        tp.ProcessCell,
        'Clean' AS EventType,
        'Up Stairs #1' AS Location,
        tp.Cleanstartup AS EventStart,
        tp.Cleanfinishup AS EventEnd,
        CASE 
            WHEN tp.Cleanstartup IS NOT NULL AND tp.Cleanfinishup IS NOT NULL
            THEN DATEDIFF(MINUTE, tp.Cleanstartup, tp.Cleanfinishup)
        END AS DurationMinutes,
        'TFC_PTiming' AS SourceTable
    FROM TFCLIVE.dbo.TFC_PTiming tp
    WHERE tp.Cleanstartup IS NOT NULL
      AND tp.Cleanstartup >= '2023-01-01'
    
    UNION ALL
    
    SELECT
        tp.BatchNo,
        tp.ProcessCell,
        'Clean' AS EventType,
        'Down Stairs #1' AS Location,
        tp.Cleanstartdown AS EventStart,
        tp.Cleanfinishdown AS EventEnd,
        CASE 
            WHEN tp.Cleanstartdown IS NOT NULL AND tp.Cleanfinishdown IS NOT NULL
            THEN DATEDIFF(MINUTE, tp.Cleanstartdown, tp.Cleanfinishdown)
        END AS DurationMinutes,
        'TFC_PTiming' AS SourceTable
    FROM TFCLIVE.dbo.TFC_PTiming tp
    WHERE tp.Cleanstartdown IS NOT NULL
      AND tp.Cleanstartdown >= '2023-01-01'
    
    UNION ALL
    
    SELECT
        tp.BatchNo,
        tp.ProcessCell,
        'Clean' AS EventType,
        'Up Stairs #2' AS Location,
        tp.cleanstartup2 AS EventStart,
        tp.cleanfinishup2 AS EventEnd,
        CASE 
            WHEN tp.cleanstartup2 IS NOT NULL AND tp.cleanfinishup2 IS NOT NULL
            THEN DATEDIFF(MINUTE, tp.cleanstartup2, tp.cleanfinishup2)
        END AS DurationMinutes,
        'TFC_PTiming' AS SourceTable
    FROM TFCLIVE.dbo.TFC_PTiming tp
    WHERE tp.cleanstartup2 IS NOT NULL
      AND tp.cleanstartup2 >= '2023-01-01'
    
    UNION ALL
    
    SELECT
        tp.BatchNo,
        tp.ProcessCell,
        'Clean' AS EventType,
        'Down Stairs #2' AS Location,
        tp.cleanstartdown2 AS EventStart,
        tp.cleanfinishdown2 AS EventEnd,
        CASE 
            WHEN tp.cleanstartdown2 IS NOT NULL AND tp.cleanfinishdown2 IS NOT NULL
            THEN DATEDIFF(MINUTE, tp.cleanstartdown2, tp.cleanfinishdown2)
        END AS DurationMinutes,
        'TFC_PTiming' AS SourceTable
    FROM TFCLIVE.dbo.TFC_PTiming tp
    WHERE tp.cleanstartdown2 IS NOT NULL
      AND tp.cleanstartdown2 >= '2023-01-01'
    
    UNION ALL
    
    SELECT
        tp.BatchNo,
        tp.ProcessCell,
        'Clean' AS EventType,
        'Up Stairs #3' AS Location,
        tp.cleanstartup3 AS EventStart,
        tp.cleanfinishup3 AS EventEnd,
        CASE 
            WHEN tp.cleanstartup3 IS NOT NULL AND tp.cleanfinishup3 IS NOT NULL
            THEN DATEDIFF(MINUTE, tp.cleanstartup3, tp.cleanfinishup3)
        END AS DurationMinutes,
        'TFC_PTiming' AS SourceTable
    FROM TFCLIVE.dbo.TFC_PTiming tp
    WHERE tp.cleanstartup3 IS NOT NULL
      AND tp.cleanstartup3 >= '2023-01-01'
    
    UNION ALL
    
    SELECT
        tp.BatchNo,
        tp.ProcessCell,
        'Clean' AS EventType,
        'Down Stairs #3' AS Location,
        tp.cleanstartdown3 AS EventStart,
        tp.cleanfinishdown3 AS EventEnd,
        CASE 
            WHEN tp.cleanstartdown3 IS NOT NULL AND tp.cleanfinishdown3 IS NOT NULL
            THEN DATEDIFF(MINUTE, tp.cleanstartdown3, tp.cleanfinishdown3)
        END AS DurationMinutes,
        'TFC_PTiming' AS SourceTable
    FROM TFCLIVE.dbo.TFC_PTiming tp
    WHERE tp.cleanstartdown3 IS NOT NULL
      AND tp.cleanstartdown3 >= '2023-01-01'
    
    UNION ALL
    
    -- Machine Down Events
    SELECT
        tp.BatchNo,
        tp.ProcessCell,
        'Machine Down' AS EventType,
        'Up Stairs' AS Location,
        tp.Machdownstartupstairs AS EventStart,
        tp.Machdownfinishupstairs AS EventEnd,
        CASE 
            WHEN tp.Machdownstartupstairs IS NOT NULL AND tp.Machdownfinishupstairs IS NOT NULL
            THEN DATEDIFF(MINUTE, tp.Machdownstartupstairs, tp.Machdownfinishupstairs)
        END AS DurationMinutes,
        'TFC_PTiming' AS SourceTable
    FROM TFCLIVE.dbo.TFC_PTiming tp
    WHERE tp.Machdownstartupstairs IS NOT NULL
      AND tp.Machdownstartupstairs >= '2023-01-01'
    
    UNION ALL
    
    SELECT
        tp.BatchNo,
        tp.ProcessCell,
        'Machine Down' AS EventType,
        'Down Stairs' AS Location,
        tp.Machdownstartdownstairs AS EventStart,
        tp.Machdownfinishdownstairs AS EventEnd,
        CASE 
            WHEN tp.Machdownstartdownstairs IS NOT NULL AND tp.Machdownfinishdownstairs IS NOT NULL
            THEN DATEDIFF(MINUTE, tp.Machdownstartdownstairs, tp.Machdownfinishdownstairs)
        END AS DurationMinutes,
        'TFC_PTiming' AS SourceTable
    FROM TFCLIVE.dbo.TFC_PTiming tp
    WHERE tp.Machdownstartdownstairs IS NOT NULL
      AND tp.Machdownstartdownstairs >= '2023-01-01'
    
    UNION ALL
    
    -- Meeting Events
    SELECT
        tp.BatchNo,
        tp.ProcessCell,
        'Meeting' AS EventType,
        'Up Stairs' AS Location,
        tp.meetingstartup AS EventStart,
        tp.meetingfinishup AS EventEnd,
        CASE 
            WHEN tp.meetingstartup IS NOT NULL AND tp.meetingfinishup IS NOT NULL
            THEN DATEDIFF(MINUTE, tp.meetingstartup, tp.meetingfinishup)
        END AS DurationMinutes,
        'TFC_PTiming' AS SourceTable
    FROM TFCLIVE.dbo.TFC_PTiming tp
    WHERE tp.meetingstartup IS NOT NULL
      AND tp.meetingstartup >= '2023-01-01'
    
    UNION ALL
    
    SELECT
        tp.BatchNo,
        tp.ProcessCell,
        'Meeting' AS EventType,
        'Down Stairs' AS Location,
        tp.meetingstartdown AS EventStart,
        tp.meetingfinishdown AS EventEnd,
        CASE 
            WHEN tp.meetingstartdown IS NOT NULL AND tp.meetingfinishdown IS NOT NULL
            THEN DATEDIFF(MINUTE, tp.meetingstartdown, tp.meetingfinishdown)
        END AS DurationMinutes,
        'TFC_PTiming' AS SourceTable
    FROM TFCLIVE.dbo.TFC_PTiming tp
    WHERE tp.meetingstartdown IS NOT NULL
      AND tp.meetingstartdown >= '2023-01-01'
    
    UNION ALL
    
    -- Shift Change Events
    SELECT
        tp.BatchNo,
        tp.ProcessCell,
        'Shift Change' AS EventType,
        'Up Stairs' AS Location,
        tp.shiftchangestartup AS EventStart,
        tp.shiftchangefinishup AS EventEnd,
        CASE 
            WHEN tp.shiftchangestartup IS NOT NULL AND tp.shiftchangefinishup IS NOT NULL
            THEN DATEDIFF(MINUTE, tp.shiftchangestartup, tp.shiftchangefinishup)
        END AS DurationMinutes,
        'TFC_PTiming' AS SourceTable
    FROM TFCLIVE.dbo.TFC_PTiming tp
    WHERE tp.shiftchangestartup IS NOT NULL
      AND tp.shiftchangestartup >= '2023-01-01'
    
    UNION ALL
    
    SELECT
        tp.BatchNo,
        tp.ProcessCell,
        'Shift Change' AS EventType,
        'Down Stairs' AS Location,
        tp.shiftchangestartdown AS EventStart,
        tp.shiftchangefinishdown AS EventEnd,
        CASE 
            WHEN tp.shiftchangestartdown IS NOT NULL AND tp.shiftchangefinishdown IS NOT NULL
            THEN DATEDIFF(MINUTE, tp.shiftchangestartdown, tp.shiftchangefinishdown)
        END AS DurationMinutes,
        'TFC_PTiming' AS SourceTable
    FROM TFCLIVE.dbo.TFC_PTiming tp
    WHERE tp.shiftchangestartdown IS NOT NULL
      AND tp.shiftchangestartdown >= '2023-01-01'
)
SELECT 
    BatchNo,
    ProcessCell,
    EventType,
    Location,
    EventStart,
    EventEnd,
    DurationMinutes,
    SourceTable,
    
    -- Date/Time Analytics
    CAST(EventStart AS DATE) AS EventDate,
    DATEPART(HOUR, EventStart) AS EventHour,
    DATEPART(WEEKDAY, EventStart) AS DayOfWeek,
    DATEPART(WEEK, EventStart) AS WeekOfYear,
    DATEPART(MONTH, EventStart) AS MonthOfYear,
    DATEPART(QUARTER, EventStart) AS Quarter,
    DATEPART(YEAR, EventStart) AS Year,
    
    -- Event Classification
    CASE 
        WHEN EventType IN ('Break', 'Meeting', 'Shift Change') THEN 'Planned Downtime'
        WHEN EventType IN ('Machine Down') THEN 'Machine Down'
        WHEN EventType IN ('Clean') THEN 'Cleaning'
        ELSE 'Other'
    END AS EventCategory

FROM EventData
WHERE EventStart IS NOT NULL
GO

-- ===================================================================
-- Event Analytics Summary View
-- ===================================================================
CREATE VIEW dbo.vw_EventAnalytics AS
SELECT 
    ProcessCell,
    EventType,
    EventCategory,
    COUNT(*) AS EventCount,
    SUM(DurationMinutes) AS TotalDurationMinutes,
    ROUND(AVG(CAST(DurationMinutes AS FLOAT)), 2) AS AvgDurationMinutes,
    MIN(DurationMinutes) AS MinDurationMinutes,
    MAX(DurationMinutes) AS MaxDurationMinutes,
    
    -- Summary by Date Range (from 2023 onwards)
    COUNT(CASE WHEN EventDate >= '2023-01-01' THEN 1 END) AS EventsSince2023,
    SUM(CASE WHEN EventDate >= '2023-01-01' THEN DurationMinutes ELSE 0 END) AS DurationSince2023,
    
    COUNT(CASE WHEN EventDate >= DATEADD(DAY, -30, GETDATE()) THEN 1 END) AS EventsLast30Days,
    SUM(CASE WHEN EventDate >= DATEADD(DAY, -30, GETDATE()) THEN DurationMinutes ELSE 0 END) AS DurationLast30Days,
    
    -- Peak Hours Analysis
    (SELECT TOP 1 EventHour 
     FROM dbo.vw_ProductionEvents pe2 
     WHERE pe2.ProcessCell = pe.ProcessCell AND pe2.EventType = pe.EventType
     GROUP BY EventHour 
     ORDER BY COUNT(*) DESC) AS PeakHour

FROM dbo.vw_ProductionEvents pe
GROUP BY ProcessCell, EventType, EventCategory
GO

-- ===================================================================
-- Enhanced Analytics Views
-- ===================================================================

-- Enhanced Daily Production Summary with Downtime and Shift Change Adjustment
CREATE VIEW dbo.vw_DailyProductionSummary AS
SELECT 
    BatchDate,
    ProcessCell,
    COUNT(*) AS TotalBatches,
    COUNT(CASE WHEN HasShiftChangeImpact = 0 THEN 1 END) AS NormalBatches,
    COUNT(CASE WHEN HasShiftChangeImpact = 1 THEN 1 END) AS ShiftChangeBatches,
    SUM(COALESCE(TRY_CAST(TotalBags AS FLOAT), 0)) AS TotalBagsProduced,
    ROUND(AVG(CAST(TotalMinutes AS FLOAT)), 2) AS AvgCycleTimeMinutes,
    ROUND(AVG(BagsPerHour), 2) AS AvgBagsPerHour,
    ROUND(AVG(NetBagsPerHour), 2) AS AvgNetBagsPerHour,
    
    -- Adjusted Metrics (excluding shift change periods)
    ROUND(AVG(AdjustedBagsPerHour), 2) AS AvgAdjustedBagsPerHour,
    ROUND(AVG(AdjustedNetBagsPerHour), 2) AS AvgAdjustedNetBagsPerHour,
    
    SUM(COALESCE(TRY_CAST(TotBatchWeight AS FLOAT), 0)) AS TotalWeightProduced,
    COUNT(CASE WHEN BatchStatus = 'Complete' THEN 1 END) AS CompletedBatches,
    COUNT(CASE WHEN BatchStatus != 'Complete' THEN 1 END) AS IncompleteBatches,
    
    -- Downtime Summary
    ROUND(AVG(CAST(TotalDowntimeMinutes AS FLOAT)), 2) AS AvgDowntimeMinutes,
    ROUND(AVG(DowntimePercentage), 2) AS AvgDowntimePercentage,
    SUM(TotalBreakMinutes) AS TotalBreakMinutes,
    SUM(TotalCleanMinutes) AS TotalCleanMinutes,
    SUM(TotalMachineDownMinutes) AS TotalMachineDownMinutes,
    SUM(TotalMeetingMinutes) AS TotalMeetingMinutes,
    SUM(TotalShiftChangeMinutes) AS TotalShiftChangeMinutes,
    
    -- Shift Change Impact Analysis
    ROUND(CAST(COUNT(CASE WHEN HasShiftChangeImpact = 1 THEN 1 END) AS FLOAT) / COUNT(*) * 100, 2) AS ShiftChangeImpactPercentage
    
FROM dbo.vw_BatchDashboardAnalytics
WHERE BatchDate IS NOT NULL
GROUP BY BatchDate, ProcessCell
GO

-- Enhanced Product Performance Summary View with Shift Change Adjustment
CREATE VIEW dbo.vw_ProductPerformanceSummary AS
SELECT 
    ItemKey,
    ProductName,
    ProcessCell,
    COUNT(*) AS BatchCount,
    COUNT(CASE WHEN HasShiftChangeImpact = 0 THEN 1 END) AS NormalBatchCount,
    COUNT(CASE WHEN HasShiftChangeImpact = 1 THEN 1 END) AS ShiftChangeBatchCount,
    ROUND(AVG(CAST(TotalMinutes AS FLOAT)), 2) AS AvgTotalMinutes,
    ROUND(AVG(CAST(NetProductionMinutes AS FLOAT)), 2) AS AvgNetProductionMinutes,
    ROUND(MIN(CAST(TotalMinutes AS FLOAT)), 2) AS MinTotalMinutes,
    ROUND(MAX(CAST(TotalMinutes AS FLOAT)), 2) AS MaxTotalMinutes,
    ROUND(STDEV(CAST(TotalMinutes AS FLOAT)), 2) AS StdDevTotalMinutes,
    ROUND(AVG(CASE WHEN BlendMinutes > 0 THEN CAST(BlendMinutes AS FLOAT) END), 2) AS AvgBlendMinutes,
    ROUND(AVG(CASE WHEN PackMinutes > 0 THEN CAST(PackMinutes AS FLOAT) END), 2) AS AvgPackMinutes,
    ROUND(AVG(CASE WHEN TipMinutes > 0 THEN CAST(TipMinutes AS FLOAT) END), 2) AS AvgTipMinutes,
    
    -- Standard Efficiency Metrics
    ROUND(AVG(BagsPerHour), 2) AS AvgBagsPerHour,
    ROUND(AVG(NetBagsPerHour), 2) AS AvgNetBagsPerHour,
    
    -- Adjusted Efficiency Metrics (excluding shift change periods)
    ROUND(AVG(AdjustedBagsPerHour), 2) AS AvgAdjustedBagsPerHour,
    ROUND(AVG(AdjustedNetBagsPerHour), 2) AS AvgAdjustedNetBagsPerHour,
    
    -- Normal Period Only Metrics (for accurate benchmarking)
    ROUND(AVG(CASE WHEN HasShiftChangeImpact = 0 THEN BagsPerHour END), 2) AS AvgNormalPeriodBagsPerHour,
    ROUND(AVG(CASE WHEN HasShiftChangeImpact = 0 THEN NetBagsPerHour END), 2) AS AvgNormalPeriodNetBagsPerHour,
    
    SUM(COALESCE(TRY_CAST(TotalBags AS FLOAT), 0)) AS TotalBagsProduced,
    ROUND(AVG(DowntimePercentage), 2) AS AvgDowntimePercentage,
    
    -- Shift Change Impact Analysis
    ROUND(CAST(COUNT(CASE WHEN HasShiftChangeImpact = 1 THEN 1 END) AS FLOAT) / COUNT(*) * 100, 2) AS ShiftChangeImpactPercentage
    
FROM dbo.vw_BatchDashboardAnalytics
WHERE ProductName IS NOT NULL 
    AND TotalMinutes IS NOT NULL
    AND StartTime >= '2023-01-01'
GROUP BY ItemKey, ProductName, ProcessCell
HAVING COUNT(*) >= 3  -- Only products with at least 3 batches
GO

-- Enhanced Process Cell Efficiency View with Shift Change Adjustment
CREATE VIEW dbo.vw_ProcessCellEfficiency AS
SELECT 
    ProcessCell,
    COUNT(*) AS TotalBatches,
    COUNT(CASE WHEN HasShiftChangeImpact = 0 THEN 1 END) AS NormalBatches,
    COUNT(CASE WHEN HasShiftChangeImpact = 1 THEN 1 END) AS ShiftChangeBatches,
    ROUND(AVG(CAST(TotalMinutes AS FLOAT)), 2) AS AvgCycleTime,
    ROUND(AVG(CAST(NetProductionMinutes AS FLOAT)), 2) AS AvgNetProductionTime,
    
    -- Standard Efficiency Metrics
    ROUND(AVG(BagsPerHour), 2) AS AvgBagsPerHour,
    ROUND(AVG(NetBagsPerHour), 2) AS AvgNetBagsPerHour,
    
    -- Adjusted Efficiency Metrics (excluding shift change periods)
    ROUND(AVG(AdjustedBagsPerHour), 2) AS AvgAdjustedBagsPerHour,
    ROUND(AVG(AdjustedNetBagsPerHour), 2) AS AvgAdjustedNetBagsPerHour,
    
    -- Normal Period Only Metrics (most accurate for performance analysis)
    ROUND(AVG(CASE WHEN HasShiftChangeImpact = 0 THEN BagsPerHour END), 2) AS AvgNormalPeriodBagsPerHour,
    ROUND(AVG(CASE WHEN HasShiftChangeImpact = 0 THEN NetBagsPerHour END), 2) AS AvgNormalPeriodNetBagsPerHour,
    ROUND(AVG(CASE WHEN HasShiftChangeImpact = 0 THEN CAST(TotalMinutes AS FLOAT) END), 2) AS AvgNormalPeriodCycleTime,
    
    ROUND(AVG(WeightPerHour), 2) AS AvgWeightPerHour,
    SUM(COALESCE(TRY_CAST(TotalBags AS FLOAT), 0)) AS TotalBagsProduced,
    SUM(COALESCE(TRY_CAST(TotBatchWeight AS FLOAT), 0)) AS TotalWeightProduced,
    ROUND(CAST(COUNT(CASE WHEN BatchStatus = 'Complete' THEN 1 END) AS FLOAT) / COUNT(*) * 100, 2) AS CompletionRate,
    
    -- Downtime Analysis - Fixed to calculate per total batches
    ROUND(AVG(DowntimePercentage), 2) AS AvgDowntimePercentage,
    ROUND(SUM(CAST(TotalBreakMinutes AS FLOAT)) / COUNT(*), 2) AS AvgBreakMinutes,
    ROUND(SUM(CAST(TotalCleanMinutes AS FLOAT)) / COUNT(*), 2) AS AvgCleanMinutes,
    ROUND(SUM(CAST(TotalMachineDownMinutes AS FLOAT)) / COUNT(*), 2) AS AvgMachineDownMinutes,
    ROUND(SUM(CAST(TotalMeetingMinutes AS FLOAT)) / COUNT(*), 2) AS AvgMeetingMinutes,
    ROUND(SUM(CAST(TotalShiftChangeMinutes AS FLOAT)) / COUNT(*), 2) AS AvgShiftChangeMinutes,
    
    -- Shift Change Impact Analysis
    ROUND(CAST(COUNT(CASE WHEN HasShiftChangeImpact = 1 THEN 1 END) AS FLOAT) / COUNT(*) * 100, 2) AS ShiftChangeImpactPercentage,
    
    -- Performance Improvement Potential
    ROUND(CASE 
        WHEN AVG(BagsPerHour) > 0 AND AVG(CASE WHEN HasShiftChangeImpact = 0 THEN BagsPerHour END) > 0
        THEN ((AVG(CASE WHEN HasShiftChangeImpact = 0 THEN BagsPerHour END) - AVG(BagsPerHour)) / AVG(BagsPerHour)) * 100
        ELSE 0
    END, 2) AS PotentialImprovementPercent
    
FROM dbo.vw_BatchDashboardAnalytics
WHERE StartTime >= '2023-01-01'
GROUP BY ProcessCell
GO

-- ===================================================================
-- Clean Activities View (BatchNo 999999)
-- ===================================================================
CREATE VIEW dbo.vw_CleaningActivities AS
WITH CleaningData AS (
    -- Clean Activities from BatchNo 999999 - Aussie & Yankee Lines (TFC_PTiming)
    SELECT
        tp.BatchNo,
        tp.ProcessCell,
        'Cleaning' AS ActivityType,
        'Down Stairs' AS Location,
        tp.Cleanstartdown AS CleanStart,
        tp.Cleanfinishdown AS CleanEnd,
        CASE 
            WHEN tp.Cleanstartdown IS NOT NULL AND tp.Cleanfinishdown IS NOT NULL
            THEN DATEDIFF(MINUTE, tp.Cleanstartdown, tp.Cleanfinishdown)
        END AS DurationMinutes,
        'TFC_PTiming' AS SourceTable,
        1 AS CleanCycle,
        tp.ProcessCell AS LineType
    FROM TFCLIVE.dbo.TFC_PTiming tp
    WHERE tp.BatchNo = '999999' 
      AND tp.Cleanstartdown IS NOT NULL
      AND tp.Cleanstartdown >= '2023-01-01'

    UNION ALL

    SELECT
        tp.BatchNo,
        tp.ProcessCell,
        'Cleaning' AS ActivityType,
        'Up Stairs #2' AS Location,
        tp.cleanstartup2 AS CleanStart,
        tp.cleanfinishup2 AS CleanEnd,
        CASE 
            WHEN tp.cleanstartup2 IS NOT NULL AND tp.cleanfinishup2 IS NOT NULL
            THEN DATEDIFF(MINUTE, tp.cleanstartup2, tp.cleanfinishup2)
        END AS DurationMinutes,
        'TFC_PTiming' AS SourceTable,
        2 AS CleanCycle,
        tp.ProcessCell AS LineType
    FROM TFCLIVE.dbo.TFC_PTiming tp
    WHERE tp.BatchNo = '999999' 
      AND tp.cleanstartup2 IS NOT NULL
      AND tp.cleanstartup2 >= '2023-01-01'

    UNION ALL

    SELECT
        tp.BatchNo,
        tp.ProcessCell,
        'Cleaning' AS ActivityType,
        'Down Stairs #2' AS Location,
        tp.cleanstartdown2 AS CleanStart,
        tp.cleanfinishdown2 AS CleanEnd,
        CASE 
            WHEN tp.cleanstartdown2 IS NOT NULL AND tp.cleanfinishdown2 IS NOT NULL
            THEN DATEDIFF(MINUTE, tp.cleanstartdown2, tp.cleanfinishdown2)
        END AS DurationMinutes,
        'TFC_PTiming' AS SourceTable,
        2 AS CleanCycle,
        tp.ProcessCell AS LineType
    FROM TFCLIVE.dbo.TFC_PTiming tp
    WHERE tp.BatchNo = '999999' 
      AND tp.cleanstartdown2 IS NOT NULL
      AND tp.cleanstartdown2 >= '2023-01-01'

    UNION ALL

    SELECT
        tp.BatchNo,
        tp.ProcessCell,
        'Cleaning' AS ActivityType,
        'Up Stairs #3' AS Location,
        tp.cleanstartup3 AS CleanStart,
        tp.cleanfinishup3 AS CleanEnd,
        CASE 
            WHEN tp.cleanstartup3 IS NOT NULL AND tp.cleanfinishup3 IS NOT NULL
            THEN DATEDIFF(MINUTE, tp.cleanstartup3, tp.cleanfinishup3)
        END AS DurationMinutes,
        'TFC_PTiming' AS SourceTable,
        3 AS CleanCycle,
        tp.ProcessCell AS LineType
    FROM TFCLIVE.dbo.TFC_PTiming tp
    WHERE tp.BatchNo = '999999' 
      AND tp.cleanstartup3 IS NOT NULL
      AND tp.cleanstartup3 >= '2023-01-01'

    UNION ALL

    SELECT
        tp.BatchNo,
        tp.ProcessCell,
        'Cleaning' AS ActivityType,
        'Down Stairs #3' AS Location,
        tp.cleanstartdown3 AS CleanStart,
        tp.cleanfinishdown3 AS CleanEnd,
        CASE 
            WHEN tp.cleanstartdown3 IS NOT NULL AND tp.cleanfinishdown3 IS NOT NULL
            THEN DATEDIFF(MINUTE, tp.cleanstartdown3, tp.cleanfinishdown3)
        END AS DurationMinutes,
        'TFC_PTiming' AS SourceTable,
        3 AS CleanCycle,
        tp.ProcessCell AS LineType
    FROM TFCLIVE.dbo.TFC_PTiming tp
    WHERE tp.BatchNo = '999999' 
      AND tp.cleanstartdown3 IS NOT NULL
      AND tp.cleanstartdown3 >= '2023-01-01'

    UNION ALL

    -- Clean Activities from BatchNo 999999 - Seasoning Line (TFC_PTiming2) - เตรียมไว้สำหรับอนาคต
    -- Clean Cycle 1
    SELECT
        tp2.BatchNo,
        'Seasoning' AS ProcessCell,
        'Cleaning' AS ActivityType,
        'Clean #1' AS Location,
        tp2.clean1start AS CleanStart,
        tp2.clean1finish AS CleanEnd,
        CASE 
            WHEN tp2.clean1start IS NOT NULL AND tp2.clean1finish IS NOT NULL
            THEN DATEDIFF(MINUTE, tp2.clean1start, tp2.clean1finish)
        END AS DurationMinutes,
        'TFC_PTiming2' AS SourceTable,
        1 AS CleanCycle,
        'Seasoning' AS LineType
    FROM TFCLIVE.dbo.TFC_PTiming2 tp2
    WHERE tp2.BatchNo = '999999' 
      AND tp2.clean1start IS NOT NULL
      AND tp2.clean1start >= '2023-01-01'

    UNION ALL

    -- Clean Cycle 2
    SELECT
        tp2.BatchNo,
        'Seasoning' AS ProcessCell,
        'Cleaning' AS ActivityType,
        'Clean #2' AS Location,
        tp2.clean2start AS CleanStart,
        tp2.clean2finish AS CleanEnd,
        CASE 
            WHEN tp2.clean2start IS NOT NULL AND tp2.clean2finish IS NOT NULL
            THEN DATEDIFF(MINUTE, tp2.clean2start, tp2.clean2finish)
        END AS DurationMinutes,
        'TFC_PTiming2' AS SourceTable,
        2 AS CleanCycle,
        'Seasoning' AS LineType
    FROM TFCLIVE.dbo.TFC_PTiming2 tp2
    WHERE tp2.BatchNo = '999999' 
      AND tp2.clean2start IS NOT NULL
      AND tp2.clean2start >= '2023-01-01'

    UNION ALL

    -- Clean Cycle 3
    SELECT
        tp2.BatchNo,
        'Seasoning' AS ProcessCell,
        'Cleaning' AS ActivityType,
        'Clean #3' AS Location,
        tp2.clean3start AS CleanStart,
        tp2.clean3finish AS CleanEnd,
        CASE 
            WHEN tp2.clean3start IS NOT NULL AND tp2.clean3finish IS NOT NULL
            THEN DATEDIFF(MINUTE, tp2.clean3start, tp2.clean3finish)
        END AS DurationMinutes,
        'TFC_PTiming2' AS SourceTable,
        3 AS CleanCycle,
        'Seasoning' AS LineType
    FROM TFCLIVE.dbo.TFC_PTiming2 tp2
    WHERE tp2.BatchNo = '999999' 
      AND tp2.clean3start IS NOT NULL
      AND tp2.clean3start >= '2023-01-01'
)
SELECT 
    BatchNo,
    ProcessCell,
    ActivityType,
    Location,
    CleanCycle,
    CleanStart,
    CleanEnd,
    DurationMinutes,
    SourceTable,
    LineType,
    
    -- Date/Time Analytics
    CAST(CleanStart AS DATE) AS CleanDate,
    DATEPART(HOUR, CleanStart) AS CleanHour,
    DATEPART(WEEKDAY, CleanStart) AS DayOfWeek,
    DATEPART(WEEK, CleanStart) AS WeekOfYear,
    DATEPART(MONTH, CleanStart) AS MonthOfYear,
    DATEPART(QUARTER, CleanStart) AS Quarter,
    DATEPART(YEAR, CleanStart) AS Year,
    
    -- Shift Classification
    CASE 
        WHEN DATEPART(HOUR, CleanStart) >= 7 AND DATEPART(HOUR, CleanStart) < 19 
        THEN 'Day Shift'
        ELSE 'Night Shift'
    END AS ShiftType,
    
    -- Duration Categories
    CASE 
        WHEN DurationMinutes <= 30 THEN 'Short (≤30 min)'
        WHEN DurationMinutes <= 60 THEN 'Medium (31-60 min)'
        WHEN DurationMinutes <= 120 THEN 'Long (61-120 min)'
        ELSE 'Very Long (>120 min)'
    END AS DurationCategory,
    
    -- Efficiency Indicators
    CASE 
        WHEN DurationMinutes IS NOT NULL AND DurationMinutes > 0
        THEN ROUND(CAST(DurationMinutes AS FLOAT) / 60.0, 2)
    END AS Hours,
    
    -- Status
    CASE 
        WHEN CleanEnd IS NOT NULL THEN 'Completed'
        WHEN CleanStart IS NOT NULL THEN 'In Progress'
        ELSE 'Unknown'
    END AS CleanStatus

FROM CleaningData
WHERE CleanStart IS NOT NULL
GO

-- ===================================================================
-- Cleaning Analytics Summary View
-- ===================================================================
CREATE VIEW dbo.vw_CleaningAnalytics AS
SELECT 
    ProcessCell,
    Location,
    CleanCycle,
    ShiftType,
    LineType,
    COUNT(*) AS CleanCount,
    SUM(DurationMinutes) AS TotalDurationMinutes,
    ROUND(AVG(CAST(DurationMinutes AS FLOAT)), 2) AS AvgDurationMinutes,
    MIN(DurationMinutes) AS MinDurationMinutes,
    MAX(DurationMinutes) AS MaxDurationMinutes,
    ROUND(STDEV(CAST(DurationMinutes AS FLOAT)), 2) AS StdDevDurationMinutes,
    
    -- Summary by Date Range (from 2023 onwards)
    COUNT(CASE WHEN CleanDate >= '2023-01-01' THEN 1 END) AS CleansSince2023,
    SUM(CASE WHEN CleanDate >= '2023-01-01' THEN DurationMinutes ELSE 0 END) AS DurationSince2023,
    
    COUNT(CASE WHEN CleanDate >= DATEADD(DAY, -30, GETDATE()) THEN 1 END) AS CleansLast30Days,
    SUM(CASE WHEN CleanDate >= DATEADD(DAY, -30, GETDATE()) THEN DurationMinutes ELSE 0 END) AS DurationLast30Days,
    
    -- Duration Category Distribution
    COUNT(CASE WHEN DurationMinutes <= 30 THEN 1 END) AS ShortCleans,
    COUNT(CASE WHEN DurationMinutes > 30 AND DurationMinutes <= 60 THEN 1 END) AS MediumCleans,
    COUNT(CASE WHEN DurationMinutes > 60 AND DurationMinutes <= 120 THEN 1 END) AS LongCleans,
    COUNT(CASE WHEN DurationMinutes > 120 THEN 1 END) AS VeryLongCleans,
    
    -- Peak Hours Analysis
    (SELECT TOP 1 CleanHour 
     FROM dbo.vw_CleaningActivities ca2 
     WHERE ca2.ProcessCell = ca.ProcessCell AND ca2.Location = ca.Location
     GROUP BY CleanHour 
     ORDER BY COUNT(*) DESC) AS PeakHour,
    
    -- Completion Rate
    ROUND(CAST(COUNT(CASE WHEN CleanStatus = 'Completed' THEN 1 END) AS FLOAT) / COUNT(*) * 100, 2) AS CompletionRate

FROM dbo.vw_CleaningActivities ca
GROUP BY ProcessCell, Location, CleanCycle, ShiftType, LineType
GO

-- ===================================================================
-- Daily Cleaning Summary View
-- ===================================================================
CREATE VIEW dbo.vw_DailyCleaningSummary AS
SELECT 
    CleanDate,
    ProcessCell,
    ShiftType,
    LineType,
    COUNT(*) AS TotalCleans,
    SUM(DurationMinutes) AS TotalCleanMinutes,
    ROUND(AVG(CAST(DurationMinutes AS FLOAT)), 2) AS AvgCleanMinutes,
    COUNT(DISTINCT Location) AS LocationsCleaned,
    COUNT(CASE WHEN CleanStatus = 'Completed' THEN 1 END) AS CompletedCleans,
    COUNT(CASE WHEN CleanStatus != 'Completed' THEN 1 END) AS IncompleteCleans,
    
    -- Duration by Category
    COUNT(CASE WHEN DurationMinutes <= 30 THEN 1 END) AS ShortCleans,
    COUNT(CASE WHEN DurationMinutes > 30 AND DurationMinutes <= 60 THEN 1 END) AS MediumCleans,
    COUNT(CASE WHEN DurationMinutes > 60 THEN 1 END) AS LongCleans,
    
    -- Total hours spent cleaning
    ROUND(SUM(CAST(DurationMinutes AS FLOAT)) / 60.0, 2) AS TotalCleanHours
    
FROM dbo.vw_CleaningActivities
WHERE CleanDate IS NOT NULL
GROUP BY CleanDate, ProcessCell, ShiftType, LineType
GO