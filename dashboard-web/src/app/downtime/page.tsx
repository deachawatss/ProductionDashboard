'use client'

import { useState, useEffect } from 'react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5555'

interface DowntimeData {
  eventType: string
  totalMinutes: number
  eventCount: number
  avgDuration: number
  percentage: number
}

interface DowntimeByDay {
  date: string
  breakMinutes: number
  cleanMinutes: number
  machineDownMinutes: number

  shiftChangeMinutes: number
  totalMinutes: number
}

export default function DowntimeAnalysis() {
  const [downtimeData, setDowntimeData] = useState<DowntimeData[]>([])
  const [dailyData, setDailyData] = useState<DowntimeByDay[]>([])
  const [selectedLine, setSelectedLine] = useState('Aussie')
  const [loading, setLoading] = useState(true)

  const lines = ['Aussie', 'Yankee', 'Seasoning']

  const fetchDowntimeData = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        processCell: selectedLine,
        days: '7'
      })

      const response = await fetch(`${API_BASE_URL}/api/dashboard/downtime?${params}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch downtime data: ${response.status}`)
      }

      const data = await response.json()
      
      // Set the data directly from API response
      setDowntimeData(data.downtimeBreakdown || [])
      setDailyData(data.dailyBreakdown || [])

    } catch (error) {
      console.error('Error fetching downtime data:', error)
      // Set empty arrays on error instead of mock data
      setDowntimeData([])
      setDailyData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDowntimeData()
  }, [selectedLine])

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'Break Time': return 'bg-blue-500'
      case 'Cleaning': return 'bg-green-500'
      case 'Machine Down': return 'bg-red-500'

      case 'Shift Change': return 'bg-purple-500'
      default: return 'bg-gray-500'
    }
  }

  const totalDowntime = downtimeData.reduce((sum, item) => sum + item.totalMinutes, 0)

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Downtime Analysis</h1>
        <p className="text-gray-600 mt-2">Detailed breakdown of production downtime events</p>
      </div>

      {/* Line Selection */}
      <div className="mb-6">
        <select
          value={selectedLine}
          onChange={(e) => setSelectedLine(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {lines.map((line) => (
            <option key={line} value={line}>
              {line} Line
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading downtime analysis...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800">Total Downtime</h3>
              <div className="text-3xl font-bold text-red-600 mt-2">
                {Math.floor(totalDowntime / 60)}h {totalDowntime % 60}m
              </div>
              <p className="text-gray-500 text-sm mt-1">Last 7 days</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800">Avg per Day</h3>
              <div className="text-3xl font-bold text-orange-600 mt-2">
                {Math.floor((totalDowntime / 7) / 60)}h {Math.floor((totalDowntime / 7) % 60)}m
              </div>
              <p className="text-gray-500 text-sm mt-1">Daily average</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800">Most Common</h3>
              <div className="text-3xl font-bold text-blue-600 mt-2">
                {downtimeData.length > 0 ? 
                  downtimeData.reduce((max, item) => item.totalMinutes > max.totalMinutes ? item : max).eventType 
                  : 'N/A'
                }
              </div>
              <p className="text-gray-500 text-sm mt-1">Event type</p>
            </div>
          </div>

          {/* Downtime Breakdown */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Downtime Breakdown</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {downtimeData.map((item) => (
                  <div key={item.eventType} className="flex items-center">
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">{item.eventType}</span>
                        <span className="text-sm text-gray-500">
                          {Math.floor(item.totalMinutes / 60)}h {item.totalMinutes % 60}m ({item.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`${getEventColor(item.eventType)} h-3 rounded-full transition-all duration-300`}
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>{item.eventCount} events</span>
                        <span>Avg: {item.avgDuration.toFixed(1)} min</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Daily Breakdown Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Daily Breakdown (Last 7 Days)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Break</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clean</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Machine Down</th>

                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shift Change</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dailyData.map((day) => (
                    <tr key={day.date}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {new Date(day.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{day.breakMinutes}m</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{day.cleanMinutes}m</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{day.machineDownMinutes}m</td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{day.shiftChangeMinutes}m</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{day.totalMinutes}m</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 