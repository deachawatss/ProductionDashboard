'use client'

import { useEffect, useState } from 'react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000'

interface ProcessCellEfficiency {
  processCell: string
  totalBatches: number
  normalBatches: number
  shiftChangeBatches: number
  avgCycleTime: number
  avgNetProductionTime: number
  avgBagsPerHour: number
  avgNetBagsPerHour: number
  avgNormalPeriodBagsPerHour: number
  avgNormalPeriodNetBagsPerHour: number
  avgNormalPeriodCycleTime: number
  avgWeightPerHour: number
  totalBagsProduced: number
  totalWeightProduced: number
  completionRate: number
  avgDowntimePercentage: number
  avgBreakMinutes: number
  avgCleanMinutes: number
  avgMachineDownMinutes: number
  avgMeetingMinutes: number
  avgShiftChangeMinutes: number
  shiftChangeImpactPercentage: number
  potentialImprovementPercent: number
}

interface ProductPerformance {
  itemKey: string
  productName: string
  processCell: string
  batchCount: number
  avgTotalMinutes: number
  avgBlendMinutes?: number
  avgPackMinutes?: number
  avgTipMinutes?: number
  avgBagsPerHour: number
  avgNetBagsPerHour: number
  totalBagsProduced: number
  avgDowntimePercentage: number
  stdDevTotalMinutes?: number
}

interface EventAnalytics {
  processCell: string
  eventType: string
  eventCategory: string
  eventCount: number
  totalDurationMinutes: number
  avgDurationMinutes: number
  minDurationMinutes: number
  maxDurationMinutes: number
  eventsSince2023: number
  durationSince2023: number
  eventsLast30Days: number
  durationLast30Days: number
  peakHour: number
}

interface BatchData {
  batchNo: string
  productName: string
  processCell: string
  totalMinutes: number
  blendMinutes: number
  tipMinutes: number
  packMinutes: number
  bagsPerHour: number
  batchDate: string
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
}

interface AnalyticsData {
  processCellEfficiency: ProcessCellEfficiency[]
  productPerformance: ProductPerformance[]
  eventAnalytics: EventAnalytics[]
}

interface ExtendedProductPerformance extends ProductPerformance {
  isAbnormal?: boolean
  abnormalReason?: string
}

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedView, setSelectedView] = useState<'efficiency' | 'products' | 'events'>('efficiency')
  const [productSearch, setProductSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [productBaselines, setProductBaselines] = useState<ProductBaseline[]>([])
  const [recentBatches, setRecentBatches] = useState<BatchData[]>([])
  const itemsPerPage = 15

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch main analytics data and product baselines in parallel
        const [analyticsResponse, baselinesResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/dashboard/analytics`),
          fetch(`${API_BASE_URL}/api/dashboard/product-baselines?days=90`)
        ])

        if (!analyticsResponse.ok) {
          throw new Error(`Failed to fetch analytics: ${analyticsResponse.status}`)
        }

        const analyticsData = await analyticsResponse.json()
        setData(analyticsData)

        // Get product baselines for anomaly detection
        if (baselinesResponse.ok) {
          const baselinesData = await baselinesResponse.json()
          setProductBaselines(baselinesData || [])
        }
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
        console.error('Error fetching analytics:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  const calculateProductBaselines = (batches: any[]) => {
    const baselines: ProductBaseline[] = []
    
    // Group by product and process cell
    const grouped = batches.reduce((acc: any, batch: any) => {
      const key = `${batch.productName}_${batch.processCell}`
      if (!acc[key]) {
        acc[key] = []
      }
      acc[key].push(batch)
      return acc
    }, {})

    // Calculate averages and standard deviations for each group
    Object.entries(grouped).forEach(([key, batchGroup]: [string, any]) => {
      if (batchGroup.length >= 3) { // Need at least 3 batches for meaningful statistics
        const [productName, processCell] = key.split('_')
        
        const totalTimes = batchGroup.map((b: any) => b.totalMinutes).filter((t: any) => t && t > 0)
        const blendTimes = batchGroup.map((b: any) => b.finishBlend && b.startBlend ? 
          (new Date(b.finishBlend).getTime() - new Date(b.startBlend).getTime()) / (1000 * 60) : null)
          .filter((t: any) => t && t > 0)
        const tipTimes = batchGroup.map((b: any) => b.finishTip && b.startTip ? 
          (new Date(b.finishTip).getTime() - new Date(b.startTip).getTime()) / (1000 * 60) : null)
          .filter((t: any) => t && t > 0)
        const packTimes = batchGroup.map((b: any) => b.finishPack && b.startPack ? 
          (new Date(b.finishPack).getTime() - new Date(b.startPack).getTime()) / (1000 * 60) : null)
          .filter((t: any) => t && t > 0)
        
        if (totalTimes.length >= 3) {
          const avgTotalTime = totalTimes.reduce((a: number, b: number) => a + b, 0) / totalTimes.length
          const variance = totalTimes.reduce((a: number, b: number) => a + Math.pow(b - avgTotalTime, 2), 0) / totalTimes.length
          const stdDevTotalTime = Math.sqrt(variance)
          
          baselines.push({
            productName,
            processCell,
            avgTotalTime,
            avgBlendTime: blendTimes.length > 0 ? blendTimes.reduce((a: number, b: number) => a + b, 0) / blendTimes.length : 0,
            avgTipTime: tipTimes.length > 0 ? tipTimes.reduce((a: number, b: number) => a + b, 0) / tipTimes.length : 0,
            avgPackTime: packTimes.length > 0 ? packTimes.reduce((a: number, b: number) => a + b, 0) / packTimes.length : 0,
            stdDevTotalTime,
            batchCount: batchGroup.length
          })
        }
      }
    })
    
    setProductBaselines(baselines)
  }

  const detectAnomalies = (product: ProductPerformance): { isAbnormal: boolean, reason: string } => {
    const baseline = productBaselines.find((b: any) => 
      b.productName === product.productName && b.processCell === product.processCell
    )
    
    if (!baseline || baseline.batchCount < 5) {
      return { isAbnormal: false, reason: '' }
    }

    const threshold = 2 // 2 standard deviations
    const deviation = Math.abs(product.avgTotalMinutes - baseline.avgTotalTime)
    
    if (deviation > threshold * baseline.stdDevTotalTime) {
      const isSlower = product.avgTotalMinutes > baseline.avgTotalTime
      const percentageDiff = Math.round((deviation / baseline.avgTotalTime) * 100)
      
      return {
        isAbnormal: true,
        reason: `${product.productName} on ${product.processCell} line has an average cycle time of ${product.avgTotalMinutes.toFixed(1)} minutes, which is ${percentageDiff}% ${isSlower ? 'slower' : 'faster'} than the expected ${baseline.avgTotalTime.toFixed(1)} minutes (based on ${baseline.batchCount} recent batches). This may indicate ${isSlower ? 'equipment issues, quality problems, or operator training needs' : 'data recording issues or unusual operating conditions'}.`
      }
    }

    return { isAbnormal: false, reason: '' }
  }

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [productSearch])

  const formatNumber = (num: number | null) => {
    if (num === null || num === undefined) return 'N/A'
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(num)
  }

  const formatPercentage = (num: number | null) => {
    if (num === null || num === undefined) return 'N/A'
    return `${num.toFixed(2)}%`
  }

  const getEfficiencyColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 font-semibold'
    if (percentage >= 60) return 'text-yellow-600 font-semibold'
    return 'text-red-600 font-semibold'
  }

  const getDowntimeColor = (percentage: number) => {
    if (percentage <= 5) return 'text-green-600 font-semibold'
    if (percentage <= 15) return 'text-yellow-600 font-semibold'
    return 'text-red-600 font-semibold'
  }

  // Sort process cells: Aussie, Yankee, Seasoning
  const getSortedProcessCells = (cells: ProcessCellEfficiency[]) => {
    const order = ['Aussie', 'Yankee', 'Seasoning']
    return cells.sort((a, b) => {
      const indexA = order.indexOf(a.processCell)
      const indexB = order.indexOf(b.processCell)
      
      // If both are in the order array, sort by their position
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB
      }
      
      // If only one is in the order array, prioritize it
      if (indexA !== -1) return -1
      if (indexB !== -1) return 1
      
      // If neither is in the order array, sort alphabetically
      return a.processCell.localeCompare(b.processCell)
    })
  }

  // Filter and paginate products with anomaly detection
  const getFilteredAndPaginatedProducts = () => {
    if (!data?.productPerformance) return { products: [], totalPages: 0, totalFiltered: 0 }
    
    let filtered = data.productPerformance.map(product => {
      const anomaly = detectAnomalies(product)
      return {
        ...product,
        isAbnormal: anomaly.isAbnormal,
        abnormalReason: anomaly.reason
      } as ExtendedProductPerformance
    })
    
    if (productSearch.trim()) {
      const searchTerm = productSearch.toLowerCase()
      filtered = filtered.filter(product => 
        product.productName.toLowerCase().includes(searchTerm) ||
        product.itemKey.toLowerCase().includes(searchTerm)
      )
    }
    
    const totalFiltered = filtered.length
    const totalPages = Math.ceil(totalFiltered / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const products = filtered.slice(startIndex, endIndex)
    
    return { products, totalPages, totalFiltered }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-dashboard-header mx-auto mb-4"></div>
          <p className="text-dashboard-text">Loading analytics data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-red-600">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Error Loading Analytics</h2>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center text-gray-600">
          <div className="text-4xl mb-4">��</div>
          <h2 className="text-xl font-semibold mb-2">No Analytics Data</h2>
          <p className="text-sm">No data available to display</p>
        </div>
      </div>
    )
  }

  const { products, totalPages, totalFiltered } = getFilteredAndPaginatedProducts()

  return (
    <div className="p-6 bg-brown-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-dashboard-text mb-2">Production Analytics</h1>
        <p className="text-dashboard-subtext">Comprehensive analysis of product production performance and efficiency</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow p-2 inline-flex space-x-1">
          <button
            onClick={() => setSelectedView('efficiency')}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors duration-200 ${
              selectedView === 'efficiency'
                ? 'bg-dashboard-header text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Production Line Efficiency
          </button>
          <button
            onClick={() => setSelectedView('products')}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors duration-200 ${
              selectedView === 'products'
                ? 'bg-dashboard-header text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Product Performance
          </button>
          <button
            onClick={() => setSelectedView('events')}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors duration-200 ${
              selectedView === 'events'
                ? 'bg-dashboard-header text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Event Analytics
          </button>
        </div>
      </div>

      {/* Process Cell Efficiency View */}
      {selectedView === 'efficiency' && (
        <div className="space-y-6">
          {/* Enhanced Production Line Efficiency Table */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-brown-200">
            <div className="bg-dashboard-header text-white px-6 py-4">
              <h2 className="text-lg font-semibold">Production Line Efficiency Overview</h2>
              <p className="text-sm opacity-90">Comprehensive performance metrics for all production lines</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-brown-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-dashboard-text uppercase tracking-wider">Production Line</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-dashboard-text uppercase tracking-wider">Total Batches</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-dashboard-text uppercase tracking-wider">Production Rate<br/><span className="text-xs normal-case">Bags/hr</span></th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-dashboard-text uppercase tracking-wider">Net Production Rate<br/><span className="text-xs normal-case">Bags/hr</span></th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-dashboard-text uppercase tracking-wider">Avg Cycle Time<br/><span className="text-xs normal-case">minutes</span></th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-dashboard-text uppercase tracking-wider">Completion Rate</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-dashboard-text uppercase tracking-wider">Downtime<br/><span className="text-xs normal-case">(includes cleaning)</span></th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-dashboard-text uppercase tracking-wider">Total Bags Produced</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brown-200">
                  {getSortedProcessCells(data.processCellEfficiency).map((cell, index) => (
                    <tr key={cell.processCell} className={index % 2 === 0 ? 'bg-white' : 'bg-brown-25'}>
                      <td className="px-4 py-3 text-sm font-medium text-dashboard-text">
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">🏭</span>
                          <div>
                            <div className="font-semibold">{cell.processCell} Line</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-dashboard-text font-semibold">{formatNumber(cell.totalBatches)}</td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className={getEfficiencyColor(cell.avgBagsPerHour)}>
                          {formatNumber(cell.avgBagsPerHour)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className={getEfficiencyColor(cell.avgNetBagsPerHour)}>
                          {formatNumber(cell.avgNetBagsPerHour)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-blue-600 font-semibold">{formatNumber(cell.avgCycleTime)}</td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className={getEfficiencyColor(cell.completionRate)}>
                          {formatPercentage(cell.completionRate)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className={getDowntimeColor(cell.avgDowntimePercentage)}>
                          {formatPercentage(cell.avgDowntimePercentage)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-dashboard-text font-semibold">{formatNumber(cell.totalBagsProduced)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>


        </div>
      )}

      {/* Product Performance View */}
      {selectedView === 'products' && (
        <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-brown-200">
          <div className="bg-dashboard-header text-white px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Product Performance Analysis</h2>
                <p className="text-sm opacity-90">Production performance by product type (minimum 3 batches)</p>
              </div>
              <div className="w-64">
                <input
                  type="text"
                  placeholder="Search by product name or code..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-white/20 rounded-md bg-white/10 text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 focus:bg-white/20"
                />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-brown-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dashboard-text uppercase tracking-wider">ItemKey</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dashboard-text uppercase tracking-wider">Product</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-dashboard-text uppercase tracking-wider">Production Line</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-dashboard-text uppercase tracking-wider">Batch Count</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-dashboard-text uppercase tracking-wider">Total Time (min)</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-dashboard-text uppercase tracking-wider">Blend Time (min)</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-dashboard-text uppercase tracking-wider">Pack Time (min)</th>

                  <th className="px-4 py-3 text-center text-xs font-medium text-dashboard-text uppercase tracking-wider">Bags/Hour</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-dashboard-text uppercase tracking-wider">Total Bags</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-dashboard-text uppercase tracking-wider">Downtime %<br/><span className="text-xs normal-case">(includes cleaning)</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brown-200">
                {products.map((product, index) => (
                  <tr 
                    key={`product-${product.itemKey}-${product.processCell}-${index}`} 
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-brown-25'} ${product.isAbnormal ? 'bg-red-50 border-l-4 border-red-500' : ''} group relative`}
                    title={product.isAbnormal ? product.abnormalReason : ''}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-600">{product.itemKey}</td>
                    <td className="px-4 py-3 text-sm font-medium text-dashboard-text">
                      <div className="flex items-center">
                        {product.isAbnormal && <span className="text-red-500 mr-2" title="Abnormal data detected">⚠️</span>}
                        {product.productName}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-dashboard-text">{product.processCell}</td>
                    <td className="px-4 py-3 text-sm text-center text-dashboard-text">{formatNumber(product.batchCount)}</td>
                    <td className="px-4 py-3 text-sm text-center text-dashboard-text">
                      <span className={product.isAbnormal ? 'text-red-600 font-bold' : ''}>
                        {formatNumber(product.avgTotalMinutes)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-dashboard-text">
                      {product.avgBlendMinutes ? formatNumber(product.avgBlendMinutes) : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-dashboard-text">
                      {product.avgPackMinutes ? formatNumber(product.avgPackMinutes) : 'N/A'}
                    </td>

                    <td className="px-4 py-3 text-sm text-center">
                      <span className={getEfficiencyColor(product.avgBagsPerHour)}>
                        {formatNumber(product.avgBagsPerHour)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-dashboard-text">{formatNumber(product.totalBagsProduced)}</td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className={getDowntimeColor(product.avgDowntimePercentage)}>
                        {formatPercentage(product.avgDowntimePercentage)}
                      </span>
                    </td>
                    
                    {/* Tooltip for abnormal data */}
                    {product.isAbnormal && (
                      <div className="absolute left-0 top-full mt-2 bg-red-600 text-white text-xs rounded-lg p-3 shadow-lg z-10 w-96 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                        <div className="font-bold mb-1">⚠️ Abnormal Performance Detected</div>
                        <div>{product.abnormalReason}</div>
                        <div className="absolute -top-1 left-4 w-2 h-2 bg-red-600 rotate-45"></div>
                      </div>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination and Search Info */}
            <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {productSearch.trim() ? (
                  <>Showing {totalFiltered} of {data.productPerformance.length} products</>
                ) : (
                  <>Showing {products.length} of {data.productPerformance.length} products</>
                )}
                {totalPages > 1 && (
                  <> • Page {currentPage} of {totalPages}</>
                )}
              </div>
              
              {totalPages > 1 && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  {/* Page numbers */}
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-1 text-sm border rounded-md ${
                            currentPage === pageNum
                              ? 'bg-dashboard-header text-white border-dashboard-header'
                              : 'bg-white hover:bg-gray-50 border-gray-300'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Event Analytics View */}
      {selectedView === 'events' && (
        <div className="space-y-6">
          {/* Debug info for event analytics */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-yellow-800">Event Analytics Data Status</h3>
            <p className="text-xs text-yellow-700 mt-1">
              Found {data.eventAnalytics?.length || 0} event analytics records
              {data.eventAnalytics?.length === 0 && " - This could mean no events in the last 30 days or API issue"}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-brown-200">
            <div className="bg-dashboard-header text-white px-6 py-4">
              <h2 className="text-lg font-semibold">Event Analytics</h2>
              <p className="text-sm opacity-90">Production events analysis by type and frequency (Last 30 days)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-brown-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-dashboard-text uppercase tracking-wider">Process Cell</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-dashboard-text uppercase tracking-wider">Event Type</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-dashboard-text uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-dashboard-text uppercase tracking-wider">Total Events</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-dashboard-text uppercase tracking-wider">Last 30 Days</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-dashboard-text uppercase tracking-wider">Total Duration (hrs)</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-dashboard-text uppercase tracking-wider">Avg Duration (min)</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-dashboard-text uppercase tracking-wider">Peak Hour</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brown-200">
                  {data.eventAnalytics && data.eventAnalytics.length > 0 ? data.eventAnalytics.map((event, index) => (
                    <tr key={`${event.processCell}-${event.eventType}`} className={index % 2 === 0 ? 'bg-white' : 'bg-brown-25'}>
                      <td className="px-4 py-3 text-sm font-medium text-dashboard-text">{event.processCell}</td>
                      <td className="px-4 py-3 text-sm text-center text-dashboard-text">{event.eventType}</td>
                      <td className="px-4 py-3 text-sm text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          event.eventCategory === 'Machine Down' ? 'bg-red-100 text-red-800' :
                          event.eventCategory === 'Planned Downtime' ? 'bg-blue-100 text-blue-800' :
                          event.eventCategory === 'Cleaning' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {event.eventCategory}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-dashboard-text">{formatNumber(event.eventsSince2023)}</td>
                      <td className="px-4 py-3 text-sm text-center text-dashboard-text">{formatNumber(event.eventsLast30Days)}</td>
                      <td className="px-4 py-3 text-sm text-center text-dashboard-text">
                        {formatNumber((event.durationSince2023 || event.totalDurationMinutes) / 60)}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-dashboard-text">{formatNumber(event.avgDurationMinutes)}</td>
                      <td className="px-4 py-3 text-sm text-center text-dashboard-text">
                        {event.peakHour ? `${event.peakHour}:00` : 'N/A'}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center">
                          <div className="text-4xl mb-4">📊</div>
                          <h3 className="text-lg font-medium text-gray-600 mb-2">No Event Data Available</h3>
                          <p className="text-sm text-gray-500 max-w-md">
                            No production events found in the last 30 days. This could mean:
                          </p>
                          <ul className="text-xs text-gray-400 mt-2 space-y-1">
                            <li>• No downtime events recorded recently</li>
                            <li>• Data still being processed</li>
                            <li>• Check database connection</li>
                          </ul>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Event Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {['Machine Down', 'Planned Downtime', 'Cleaning', 'Other'].map((category) => {
              const categoryEvents = data.eventAnalytics?.filter(e => e.eventCategory === category) || []
              const totalEvents = categoryEvents.reduce((sum, e) => sum + (e.eventsLast30Days || 0), 0)
              const totalDuration = categoryEvents.reduce((sum, e) => sum + (e.durationLast30Days || 0), 0)
              
              return (
                <div key={category} className="bg-white rounded-lg shadow border border-brown-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700">{category}</h3>
                    <div className={`w-3 h-3 rounded ${
                      category === 'Machine Down' ? 'bg-red-500' :
                      category === 'Planned Downtime' ? 'bg-blue-500' :
                      category === 'Cleaning' ? 'bg-green-500' :
                      'bg-gray-500'
                    }`}></div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xl font-semibold text-dashboard-text">{totalEvents}</div>
                    <div className="text-xs text-gray-600">events (30 days)</div>
                    <div className="text-sm text-gray-600">{formatNumber(totalDuration / 60)} hours</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
} 