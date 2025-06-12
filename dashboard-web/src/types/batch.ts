export interface BatchData {
  batchNo: string;
  productName: string;
  itemKey: string;
  startTime: string;
  finishTime?: string;
  startBatch?: string;
  startBlend?: string;
  startPack?: string;
  startTip?: string;
  finishTip?: string;
  totalBags?: number;
  partialBags?: number;
  bagSize?: number;
  hours?: number;
  batchStatus: string;
  processCell: string;
  totalMinutes?: number;
  bagsPerHour?: number;
  downtimePercentage?: number;
  totalBreakMinutes?: number;
  totalCleanMinutes?: number;
  totalMachineDownMinutes?: number;
  totalMeetingMinutes?: number;
  totalShiftChangeMinutes?: number;
}

export interface ProcessCellData {
  processCell: string;
  batches: BatchData[];
} 