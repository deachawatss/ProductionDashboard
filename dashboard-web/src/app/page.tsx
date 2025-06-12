'use client'

import { useState, useEffect } from 'react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

interface BatchData {
  batchNo: string
  productName: string
  startTime: string
  finishTime?: string
  startBatch?: string
  startBlend?: string
  startPack?: string
  startTip?: string
  finishTip?: string
  finishBlend?: string
  finishPack?: string
  totalBags?: number
  partialBags?: number
  totalMinutes?: number
  bagsPerHour?: number
  batchStatus: string
  processCell: string
  downtimeMinutes?: number
  downtimePercentage?: number
  // Event tracking fields
  totalBreakMinutes?: number
  totalCleanMinutes?: number
  totalMachineDownMinutes?: number
  totalShiftChangeMinutes?: number
  totalDowntimeMinutes?: number
  // Event specific fields
  eventType?: string
  location?: string
  durationMinutes?: number
  activityType?: string
  cleanStatus?: string
  cleanCycle?: number
  // Anomaly detection fields
  isAbnormal?: boolean
  abnormalReason?: string
}

interface ProductBaseline {
  productName: string
  processCell: string
  avgTotalTime: number
  avgBlendTime: number
  avgTipTime: number
  avgPackTime: number
  stdDevTotalTime: number
  batchCount: number
  minTotalTime: number
  maxTotalTime: number
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Complete': return 'bg-green-100 text-green-800'
    case 'Packing': return 'bg-blue-100 text-blue-800'
    case 'Blending': return 'bg-yellow-100 text-yellow-800'
    case 'Blend Started': return 'bg-orange-100 text-orange-800'
    case 'Tipping': return 'bg-purple-100 text-purple-800'
    case 'Tip Started': return 'bg-purple-100 text-purple-800'
    case 'In Progress': return 'bg-orange-100 text-orange-800'
    // Event specific statuses
    case 'Break': return 'bg-blue-100 text-blue-800'
    case 'Machine Down': return 'bg-red-100 text-red-800'
    case 'Shift Change': return 'bg-purple-100 text-purple-800'
    case 'Cleaning': return 'bg-green-100 text-green-800'
    case 'Completed': return 'bg-green-100 text-green-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const EventTypeButtons = ({ 
  selectedLine, 
  setSelectedLine, 
  selectedEventType, 
  setSelectedEventType 
}: { 
  selectedLine: string, 
  setSelectedLine: (line: string) => void,
  selectedEventType: string,
  setSelectedEventType: (eventType: string) => void
}) => {
  const eventTypes = [
    { name: 'Main Process', color: 'bg-yellow-400', value: 'main' },
    { name: 'Machine Down', color: 'bg-red-400', value: 'machine_down' },
    { name: 'Break Time', color: 'bg-blue-400', value: 'break' },
    { name: 'Shift Change', color: 'bg-purple-400', value: 'shift_change' },
    { name: 'Clean', color: 'bg-green-400', value: 'clean' },
  ]

  const lines = ['Aussie', 'Yankee', 'Seasoning']

  return (
    <div className="flex items-center space-x-4 mb-4">
      {/* Line Selection - moved to the left */}
      <div className="flex items-center">
        <label className="text-sm font-medium text-dashboard-text mr-2">Line:</label>
        <select
          value={selectedLine}
          onChange={(e) => setSelectedLine(e.target.value)}
          className="px-3 py-2 border border-brown-300 rounded-md focus:outline-none focus:ring-2 focus:ring-dashboard-header bg-white text-sm"
        >
          {lines.map((line) => (
            <option key={line} value={line}>
              {line}
            </option>
          ))}
        </select>
      </div>
      
      {/* Event Type Buttons */}
      <div className="flex space-x-2">
        {eventTypes.map((event) => (
          <button
            key={event.name}
            onClick={() => setSelectedEventType(event.value)}
            className={`px-4 py-2 rounded text-sm font-medium ${
              selectedEventType === event.value ? event.color : 'bg-gray-300'
            } text-black border transition-colors duration-200 hover:opacity-80`}
          >
            {event.name}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [selectedLine, setSelectedLine] = useState('Aussie')
  const [selectedEventType, setSelectedEventType] = useState('main')
  const [batchData, setBatchData] = useState<BatchData[]>([])
  const [productBaselines, setProductBaselines] = useState<ProductBaseline[]>([])
  const [baselinesLoaded, setBaselinesLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch product baselines for anomaly detection
  const fetchProductBaselines = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard/product-baselines?days=90`)
      if (response.ok) {
        const baselines = await response.json()
        setProductBaselines(baselines || [])
        setBaselinesLoaded(true)
      }
    } catch (err) {
      console.error('Error fetching product baselines:', err)
      setBaselinesLoaded(true) // Still mark as loaded even if failed
    }
  }

  // Detect anomalies in batch data
  const detectAnomalies = (batch: BatchData): { isAbnormal: boolean, reason: string } => {
    // Only detect anomalies for main process and completed batches
    if (selectedEventType !== 'main' || !batch.totalMinutes || !batch.productName) {
      return { isAbnormal: false, reason: '' }
    }

    const anomalies: string[] = []

    // Check for obvious data recording errors first
    if (batch.startTime && batch.finishTime) {
      const start = new Date(batch.startTime).getTime()
      const finish = new Date(batch.finishTime).getTime()
      
      // Check if start and finish times are identical (obvious error)
      if (Math.abs(finish - start) < 60000) { // Less than 1 minute difference
        anomalies.push(`Suspicious timing: Start and finish times are nearly identical (${formatTime(batch.startTime)})`)
      }
      
      // Check if total time is extremely short (less than 5 minutes)
      if (batch.totalMinutes < 5) {
        anomalies.push(`Extremely short cycle time: ${batch.totalMinutes} minutes (likely data recording error)`)
      }
    }

    // Check for identical process step times (blend/pack times same as start time)
    if (batch.startTime && batch.startBlend && batch.startPack) {
      const startTime = formatTime(batch.startTime)
      const blendTime = formatTime(batch.startBlend) 
      const packTime = formatTime(batch.startPack)
      
      // Debug logging for batch 851121
      if (batch.batchNo === '851121') {
        console.log('Debug 851121:', {
          batchNo: batch.batchNo,
          startTime,
          blendTime,
          packTime,
          allSame: startTime === blendTime && blendTime === packTime
        })
      }
      
      // Check if all process steps have identical times
      if (startTime === blendTime && blendTime === packTime) {
        anomalies.push(`Invalid process timing: Start, Blend, and Pack times are all identical (${startTime}) - impossible in real production`)
      }
      // Check if blend and pack times are identical (but different from start)
      else if (blendTime === packTime && startTime !== blendTime) {
        anomalies.push(`Invalid process timing: Blend and Pack times are identical (${blendTime}) - blending and packing cannot start simultaneously`)
      }
    }

    // Get baseline from vw_ProductPerformanceSummary (no minimum batch requirement)
    const baseline = productBaselines.find((b: any) => 
      b.productName === batch.productName && b.processCell === batch.processCell
    )
    
    // If we have obvious errors, return immediately
    if (anomalies.length > 0) {
      return {
        isAbnormal: true,
        reason: `${batch.productName} (Batch ${batch.batchNo}) on ${batch.processCell} line has data recording issues:\n\n${anomalies.join('\n\n')}\n\nPlease verify the batch timing data.`
      }
    }
    
    // Continue with statistical analysis if baseline exists (use all available data)
    if (!baseline || !baseline.stdDevTotalTime || baseline.stdDevTotalTime <= 0) {
      return { isAbnormal: false, reason: '' }
    }

    const threshold = 2 // 2 standard deviations

    // Check Total Time using exact data from vw_ProductPerformanceSummary
    if (baseline.avgTotalTime && baseline.stdDevTotalTime) {
      const totalDeviation = Math.abs(batch.totalMinutes - baseline.avgTotalTime)
      if (totalDeviation > threshold * baseline.stdDevTotalTime) {
        const isSlower = batch.totalMinutes > baseline.avgTotalTime
        const percentageDiff = Math.round((totalDeviation / baseline.avgTotalTime) * 100)
        anomalies.push(`Total time: ${batch.totalMinutes} min (${percentageDiff}% ${isSlower ? 'slower' : 'faster'} than expected ${baseline.avgTotalTime.toFixed(1)} min ± ${baseline.stdDevTotalTime.toFixed(1)})`)
      }
    }

    // Check Blend Time using exact data from vw_ProductPerformanceSummary
    if (batch.startBlend && batch.finishBlend && baseline.avgBlendTime && baseline.avgBlendTime > 0) {
      const actualBlendTime = (new Date(batch.finishBlend).getTime() - new Date(batch.startBlend).getTime()) / (1000 * 60)
      if (actualBlendTime > 0) {
        // Use 25% of average as estimated standard deviation if not available
        const blendStdDev = baseline.avgBlendTime * 0.25
        const blendDeviation = Math.abs(actualBlendTime - baseline.avgBlendTime)
        if (blendDeviation > threshold * blendStdDev) {
          const isSlower = actualBlendTime > baseline.avgBlendTime
          const percentageDiff = Math.round((blendDeviation / baseline.avgBlendTime) * 100)
          anomalies.push(`Blend time: ${actualBlendTime.toFixed(1)} min (${percentageDiff}% ${isSlower ? 'slower' : 'faster'} than expected ${baseline.avgBlendTime.toFixed(1)} min)`)
        }
      }
    }

    // Check Pack Time using exact data from vw_ProductPerformanceSummary  
    if (batch.startPack && batch.finishTime && baseline.avgPackTime && baseline.avgPackTime > 0) {
      const actualPackTime = (new Date(batch.finishTime).getTime() - new Date(batch.startPack).getTime()) / (1000 * 60)
      if (actualPackTime > 0) {
        // Use 25% of average as estimated standard deviation if not available
        const packStdDev = baseline.avgPackTime * 0.25
        const packDeviation = Math.abs(actualPackTime - baseline.avgPackTime)
        if (packDeviation > threshold * packStdDev) {
          const isSlower = actualPackTime > baseline.avgPackTime
          const percentageDiff = Math.round((packDeviation / baseline.avgPackTime) * 100)
          anomalies.push(`Pack time: ${actualPackTime.toFixed(1)} min (${percentageDiff}% ${isSlower ? 'slower' : 'faster'} than expected ${baseline.avgPackTime.toFixed(1)} min)`)
        }
      }
    }

    if (anomalies.length > 0) {
      return {
        isAbnormal: true,
        reason: `${batch.productName} (Batch ${batch.batchNo}) on ${batch.processCell} line shows abnormal performance (based on ${baseline.batchCount} historical batches):\n\n${anomalies.join('\n\n')} \n\nThis may indicate equipment issues, quality problems, or operator training needs.`
      }
    }

    return { isAbnormal: false, reason: '' }
  }

  const fetchBatchData = async () => {
    try {
      setLoading(true)
      setError(null)

      let endpoint = ''
      let params = new URLSearchParams({
        processCell: selectedLine,
        days: '3'
      })

      // Choose endpoint based on event type
      switch (selectedEventType) {
        case 'main':
          endpoint = '/api/dashboard/batchtable'
          break
        case 'machine_down':
          endpoint = '/api/dashboard/events'
          params.append('eventType', 'Machine Down')
          break
        case 'break':
          endpoint = '/api/dashboard/events'
          params.append('eventType', 'Break')
          break
        case 'shift_change':
          endpoint = '/api/dashboard/events'
          params.append('eventType', 'Shift Change')
          break
        case 'clean':
          endpoint = '/api/dashboard/cleaning'
          break
        default:
          endpoint = '/api/dashboard/batchtable'
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}?${params}`)

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status}`)
      }

      const data = await response.json()
      
      // Add anomaly detection for main process data
      const enrichedData = data.map((batch: BatchData) => {
        if (selectedEventType === 'main') {
          const anomaly = detectAnomalies(batch)
          return {
            ...batch,
            isAbnormal: anomaly.isAbnormal,
            abnormalReason: anomaly.reason
          }
        }
        return batch
      })
      
      setBatchData(enrichedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      console.error('Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProductBaselines()
  }, [])

  useEffect(() => {
    if (baselinesLoaded) {
      fetchBatchData()
    }
  }, [selectedLine, selectedEventType, baselinesLoaded])

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '--:--'
    return new Date(dateStr).toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '--'
    return new Date(dateStr).toLocaleDateString('en-CA') // YYYY-MM-DD format
  }

  const getRowClassName = (batch: BatchData, index: number) => {
    // Priority: Anomaly detection first, then event type styling
    if (batch.isAbnormal && selectedEventType === 'main') {
      return 'bg-red-200 hover:bg-red-300 border-l-4 border-red-600 group relative'
    }

    // For event data
    if (selectedEventType !== 'main') {
      switch (batch.eventType || batch.activityType || batch.batchStatus) {
        case 'Break': return 'bg-blue-50 hover:bg-blue-100 border-l-4 border-blue-400'
        case 'Machine Down': return 'bg-red-50 hover:bg-red-100 border-l-4 border-red-400'
        case 'Shift Change': return 'bg-purple-50 hover:bg-purple-100 border-l-4 border-purple-400'
        case 'Cleaning': return 'bg-blue-50 hover:bg-blue-100 border-l-4 border-blue-400'
        default: return index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'
      }
    }

    // For main process data
    if (batch.batchNo === '999999') {
      return 'bg-blue-50 hover:bg-blue-100 border-l-4 border-blue-400'
    }

    switch (batch.batchStatus) {
      case 'Complete': return 'bg-pink-50 hover:bg-pink-100 border-l-4 border-pink-400'
      default: return 'bg-green-50 hover:bg-green-100 border-l-4 border-green-400'
    }
  }

  // Determine which columns to show based on process cell and event type
  const getColumnsConfig = () => {
    if (selectedEventType !== 'main') {
      // For event/cleaning data - show simplified columns
      return {
        showMainProcessColumns: false,
        showEventColumns: true,
        hasStartTip: false,
        hasFinishTip: false
      }
    }

    // For main process data
    switch (selectedLine) {
      case 'Aussie':
      case 'Yankee':
        return {
          showMainProcessColumns: true,
          showEventColumns: false,
          hasStartTip: false,
          hasFinishTip: false
        }
      case 'Seasoning':
        return {
          showMainProcessColumns: true,
          showEventColumns: false,
          hasStartTip: true,
          hasFinishTip: true
        }
      default:
        return {
          showMainProcessColumns: true,
          showEventColumns: false,
          hasStartTip: true,
          hasFinishTip: true
        }
    }
  }

  const columnConfig = getColumnsConfig()

  // Get appropriate page title based on selected event type
  const getPageTitle = () => {
    switch (selectedEventType) {
      case 'main': return 'Production Dashboard'
      case 'machine_down': return 'Machine Down Events'
      case 'break': return 'Break Time Events'
      case 'shift_change': return 'Shift Change Events'
      case 'clean': return 'Cleaning Activities'
      default: return 'Production Dashboard'
    }
  }

  // Get appropriate legend based on selected event type
  const renderLegend = () => {
    // Event-specific legends
    if (selectedEventType === 'machine_down') {
      return (
        <div className="mt-4 flex items-center space-x-4 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-50 border-l-4 border-red-400 mr-2"></div>
            <span>Machine Down Events</span>
          </div>
        </div>
      )
    }

    if (selectedEventType === 'break') {
      return (
        <div className="mt-4 flex items-center space-x-4 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-50 border-l-4 border-blue-400 mr-2"></div>
            <span>Break Time Events</span>
          </div>
        </div>
      )
    }

    if (selectedEventType === 'shift_change') {
      return (
        <div className="mt-4 flex items-center space-x-4 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-purple-50 border-l-4 border-purple-400 mr-2"></div>
            <span>Shift Change Events</span>
          </div>
        </div>
      )
    }

    if (selectedEventType === 'clean') {
      return (
        <div className="mt-4 flex items-center space-x-4 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-50 border-l-4 border-blue-400 mr-2"></div>
            <span>Cleaning Activities</span>
          </div>
        </div>
      )
    }

    // Main process legend
    return (
      <div className="mt-4 space-y-2">
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-200 border-l-4 border-red-600 mr-2"></div>
            <span className="text-red-600 font-medium">⚠️ Abnormal Cycle Time</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-pink-50 border-l-4 border-pink-400 mr-2"></div>
            <span>Complete Batches</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-50 border-l-4 border-green-400 mr-2"></div>
            <span>Incomplete Batches</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-50 border-l-4 border-blue-400 mr-2"></div>
            <span>Cleaning Activities (999999)</span>
          </div>
        </div>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-100 border mr-2"></div>
            <span className="text-green-800">Complete</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-100 border mr-2"></div>
            <span className="text-blue-800">Packing</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-yellow-100 border mr-2"></div>
            <span className="text-yellow-800">Blending</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-orange-100 border mr-2"></div>
            <span className="text-orange-800">In Progress</span>
          </div>
        </div>
        <div className="text-xs text-gray-600 mt-2">
          💡 Hover over rows with ⚠️ for detailed anomaly analysis based on historical data
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dashboard-text mb-4">{getPageTitle()}</h1>
        
        {/* Line Selection and Event Type Buttons in one row */}
        <EventTypeButtons 
          selectedLine={selectedLine} 
          setSelectedLine={setSelectedLine}
          selectedEventType={selectedEventType}
          setSelectedEventType={setSelectedEventType}
        />
      </div>

      {/* Batch Table */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-brown-200">
        {loading && (
          <div className="p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-dashboard-header"></div>
            <p className="mt-2 text-gray-600">Loading data...</p>
          </div>
        )}

        {error && (
          <div className="p-6 text-center text-red-600">
            <p>Error: {error}</p>
            <button
              onClick={fetchBatchData}
              className="mt-2 px-4 py-2 bg-dashboard-header text-white rounded hover:bg-brown-800 transition-colors duration-200"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-dashboard-header text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Batch No</th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">
                    {columnConfig.showEventColumns ? 'Event/Activity' : 'Product'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                  
                  {columnConfig.showEventColumns ? (
                    // Event columns
                    <>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Location</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Start Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">End Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Duration (Min)</th>
                      {selectedEventType === 'clean' && (
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Cycle</th>
                      )}
                    </>
                  ) : (
                    // Main process columns
                    <>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Start Time</th>
                      {columnConfig.hasStartTip && (
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Start Tip</th>
                      )}
                      {columnConfig.hasFinishTip && (
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Finish Tip</th>
                      )}
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Start Blend</th>
                      {selectedLine === 'Seasoning' && (
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Finish Blend</th>
                      )}
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Start Pack</th>
                      {selectedLine === 'Seasoning' && (
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Finish Pack</th>
                      )}
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Finish Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Total Bags</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Total Minutes</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-brown-200">
                {batchData.map((batch, index) => (
                  <tr key={`${batch.batchNo}-${index}`} className={getRowClassName(batch, index)}>
                    <td className="px-4 py-3 text-sm font-medium text-dashboard-text">
                      {batch.batchNo}
                    </td>
                    <td className="px-4 py-3 text-sm text-dashboard-text text-center relative">
                      <div className="flex items-center justify-center">
                        {batch.isAbnormal && selectedEventType === 'main' && (
                          <span className="text-red-500 mr-2" title="Abnormal cycle time detected">⚠️</span>
                        )}
                        {columnConfig.showEventColumns 
                          ? (batch.eventType || batch.activityType || 'N/A')
                          : (batch.productName || 'N/A')
                        }
                      </div>
                      
                      {/* Tooltip for abnormal data */}
                      {batch.isAbnormal && selectedEventType === 'main' && (
                        <div className="absolute left-0 top-full mt-2 bg-red-600 text-white text-xs rounded-lg p-3 shadow-lg z-10 w-[500px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                          <div className="font-bold mb-2">⚠️ Abnormal Performance Detected</div>
                          <div className="whitespace-pre-line leading-relaxed">
                            {batch.abnormalReason}
                          </div>
                          <div className="absolute -top-1 left-4 w-2 h-2 bg-red-600 rotate-45"></div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-dashboard-text">
                      {formatDate(batch.startTime)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        batch.eventType || batch.activityType || batch.cleanStatus || batch.batchStatus
                      )}`}>
                        {batch.eventType || batch.activityType || batch.cleanStatus || batch.batchStatus}
                      </span>
                    </td>
                    
                    {columnConfig.showEventColumns ? (
                      // Event data cells
                      <>
                        <td className="px-4 py-3 text-sm text-dashboard-text">
                          {batch.location || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-dashboard-text">
                          {formatTime(batch.startTime)}
                        </td>
                        <td className="px-4 py-3 text-sm text-dashboard-text">
                          {formatTime(batch.finishTime || '')}
                        </td>
                        <td className="px-4 py-3 text-sm text-dashboard-text">
                          {batch.durationMinutes || batch.totalMinutes || 0}
                        </td>
                        {selectedEventType === 'clean' && (
                          <td className="px-4 py-3 text-sm text-dashboard-text">
                            {batch.cleanCycle || 'N/A'}
                          </td>
                        )}
                      </>
                    ) : (
                      // Main process data cells
                      <>
                        <td className="px-4 py-3 text-sm text-dashboard-text">
                          {formatTime(batch.startTime)}
                        </td>
                        {columnConfig.hasStartTip && (
                          <td className="px-4 py-3 text-sm text-dashboard-text">
                            {formatTime(batch.startTip || '')}
                          </td>
                        )}
                        {columnConfig.hasFinishTip && (
                          <td className="px-4 py-3 text-sm text-dashboard-text">
                            {formatTime(batch.finishTip || '')}
                          </td>
                        )}
                        <td className="px-4 py-3 text-sm text-dashboard-text">
                          {formatTime(batch.startBlend || '')}
                        </td>
                        {selectedLine === 'Seasoning' && (
                          <td className="px-4 py-3 text-sm text-dashboard-text">
                            {formatTime(batch.finishBlend || '')}
                          </td>
                        )}
                        <td className="px-4 py-3 text-sm text-dashboard-text">
                          {formatTime(batch.startPack || '')}
                        </td>
                        {selectedLine === 'Seasoning' && (
                          <td className="px-4 py-3 text-sm text-dashboard-text">
                            {formatTime(batch.finishPack || '')}
                          </td>
                        )}
                        <td className="px-4 py-3 text-sm text-dashboard-text">
                          {formatTime(batch.finishTime || '')}
                        </td>
                        <td className="px-4 py-3 text-sm text-dashboard-text">
                          {batch.totalBags || 0}
                        </td>
                        <td className="px-4 py-3 text-sm text-dashboard-text">
                          <span className={batch.isAbnormal ? 'text-red-600 font-bold' : ''}>
                            {batch.totalMinutes || 0}
                          </span>
                        </td>
                      </>
                    )}
                    

                  </tr>
                ))}
              </tbody>
            </table>
            
            {batchData.length === 0 && (
              <div className="p-6 text-center text-gray-500">
                No data found for {selectedLine} in the last 3 days.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dynamic Legend */}
      {renderLegend()}
    </div>
  )
} 