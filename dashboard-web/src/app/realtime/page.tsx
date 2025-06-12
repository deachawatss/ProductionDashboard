'use client'

import { useState, useEffect } from 'react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5555'

interface RealtimeBatch {
  batchNo: string
  productName: string
  processCell: string
  batchStatus: string
  startTime: string
  startBlend?: string
  startPack?: string
  startTip?: string
}

export default function RealtimeMonitor() {
  const [realtimeData, setRealtimeData] = useState<RealtimeBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchRealtimeData = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/dashboard/batchtable?days=1`
      )
      if (response.ok) {
        const data = await response.json()
        
        // Transform data and filter for in-progress batches
        const inProgressBatches = data
          .filter((batch: any) => batch.batchStatus !== 'Complete' && batch.batchNo !== '999999')
          .map((batch: any) => ({
            batchNo: batch.batchNo,
            productName: batch.productName || 'Unknown Product',
            processCell: batch.processCell,
            batchStatus: batch.batchStatus,
            startTime: batch.startTime,
            startBlend: batch.startBlend,
            startPack: batch.startPack,
            startTip: batch.startTip
          }))
        
        setRealtimeData(inProgressBatches)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Error fetching realtime data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRealtimeData()
    const interval = setInterval(fetchRealtimeData, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [])

  // Get line color tag
  const getLineColor = (processCell: string) => {
    switch (processCell) {
      case 'Aussie': return 'bg-blue-500 text-white'
      case 'Yankee': return 'bg-green-500 text-white'
      case 'Seasoning': return 'bg-purple-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Packing': return 'bg-blue-100 text-blue-800'
      case 'Blending': return 'bg-yellow-100 text-yellow-800'
      case 'Tipping': return 'bg-orange-100 text-orange-800'
      case 'Tip Started': return 'bg-orange-100 text-orange-800'
      case 'Blend Started': return 'bg-yellow-100 text-yellow-800'
      case 'In Progress': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Determine what the batch is waiting for or currently doing
  const getWaitingStatus = (batch: RealtimeBatch) => {
    console.log('Checking waiting status for batch:', batch.batchNo, {
      processCell: batch.processCell,
      batchStatus: batch.batchStatus,
      startTime: batch.startTime,
      startBlend: batch.startBlend,
      startPack: batch.startPack,
      startTip: batch.startTip
    });

    // For Aussie & Yankee lines
    if (batch.processCell === 'Aussie' || batch.processCell === 'Yankee') {
      console.log('Processing Aussie/Yankee batch:', batch.batchNo);
      
      // Currently packing if status is Packing or startPack exists but not finished
      if (batch.batchStatus === 'Packing' || (batch.startPack && batch.batchStatus !== 'Complete')) {
        console.log('Should show กำลัง Packing for:', batch.batchNo);
        return { status: "กำลัง Packing", type: "active" }
      }
      if (batch.startBlend && !batch.startPack) {
        console.log('Should show Waiting for Pack for:', batch.batchNo);
        return { status: "Waiting for: Pack", type: "waiting" }
      }
      if (!batch.startBlend && batch.startTime) {
        console.log('Should show Waiting for Blend for:', batch.batchNo);
        return { status: "Waiting for: Blend", type: "waiting" }
      }
    }
    
    // For Seasoning line  
    if (batch.processCell === 'Seasoning') {
      console.log('Processing Seasoning batch:', batch.batchNo);
      
      // Currently packing if status is Packing or startPack exists but not finished
      if (batch.batchStatus === 'Packing' || (batch.startPack && batch.batchStatus !== 'Complete')) {
        console.log('Should show กำลัง Packing for:', batch.batchNo);
        return { status: "กำลัง Packing", type: "active" }
      }
      if (batch.startBlend && !batch.startPack) {
        console.log('Should show Waiting for Pack for:', batch.batchNo);
        return { status: "Waiting for: Pack", type: "waiting" }
      }
      if (batch.startTip && !batch.startBlend) {
        console.log('Should show Waiting for Blend for:', batch.batchNo);
        return { status: "Waiting for: Blend", type: "waiting" }
      }
      if (!batch.startTip && batch.startTime) {
        console.log('Should show Waiting for Tip for:', batch.batchNo);
        return { status: "Waiting for: Tip", type: "waiting" }
      }
    }
    
    console.log('No waiting status for:', batch.batchNo);
    return null
  }

  // Format time display
  const formatTime = (dateStr: string) => {
    if (!dateStr) return '--:--'
    try {
      return new Date(dateStr).toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    } catch {
      return '--:--'
    }
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Real-time Production Monitor</h1>
        <p className="text-gray-600 mt-2">
          Last updated: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading real-time data...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {realtimeData.map((batch) => (
            <div key={batch.batchNo} className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-gray-200">
              {/* Header with Batch Number and Line Tag */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-800">
                    Batch {batch.batchNo}
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getLineColor(batch.processCell)}`}>
                    {batch.processCell}
                  </span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(batch.batchStatus)}`}>
                  {batch.batchStatus}
                </span>
              </div>
              
              {/* Product Name */}
              <div className="mb-4">
                <div className="text-lg font-medium text-gray-900">{batch.productName}</div>
              </div>

              {/* Production Timing */}
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-600 font-medium">Started:</span>
                    <div className="text-gray-900">{formatTime(batch.startTime)}</div>
                  </div>
                  
                  {batch.processCell === 'Seasoning' && (
                    <div>
                      <span className="text-gray-600 font-medium">Start Tip:</span>
                      <div className="text-gray-900">{formatTime(batch.startTip || '')}</div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-600 font-medium">Start Blend:</span>
                    <div className="text-gray-900">{formatTime(batch.startBlend || '')}</div>
                  </div>
                  <div>
                    <span className="text-gray-600 font-medium">Start Pack:</span>
                    <div className="text-gray-900">{formatTime(batch.startPack || '')}</div>
                  </div>
                </div>
              </div>

              {/* Waiting Status */}
              {getWaitingStatus(batch) && (
                <div className={`mt-4 p-3 border rounded-md ${
                  getWaitingStatus(batch)?.type === 'active' 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-yellow-50 border-yellow-200'
                }`}>
                  <div className="flex items-center">
                    <div className={`mr-2 ${
                      getWaitingStatus(batch)?.type === 'active' 
                        ? 'text-blue-600' 
                        : 'text-yellow-600'
                    }`}>
                      {getWaitingStatus(batch)?.type === 'active' ? '🔄' : '⏳'}
                    </div>
                    <span className={`font-medium ${
                      getWaitingStatus(batch)?.type === 'active' 
                        ? 'text-blue-800' 
                        : 'text-yellow-800'
                    }`}>
                      {getWaitingStatus(batch)?.status}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && realtimeData.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-4">🎯</div>
          <h3 className="text-xl font-semibold mb-2">No Active Batches</h3>
          <p>All production lines are currently idle</p>
        </div>
      )}

      {/* Legend */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Line Color Guide</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500 text-white mr-2">Aussie</span>
            <span className="text-sm text-gray-600">Aussie Line</span>
          </div>
          <div className="flex items-center">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-500 text-white mr-2">Yankee</span>
            <span className="text-sm text-gray-600">Yankee Line</span>
          </div>
          <div className="flex items-center">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-500 text-white mr-2">Seasoning</span>
            <span className="text-sm text-gray-600">Seasoning Line</span>
          </div>
        </div>
      </div>
    </div>
  )
} 