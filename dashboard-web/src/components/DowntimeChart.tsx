'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface DowntimeData {
  eventType: string
  totalMinutes: number
  eventCount: number
  avgDuration: number
}

interface DowntimeChartProps {
  data: DowntimeData[]
  title?: string
}

export default function DowntimeChart({ data, title = "Downtime Analysis" }: DowntimeChartProps) {
  const maxMinutes = Math.max(...data.map(d => d.totalMinutes))
  
  const getColorByType = (eventType: string) => {
    switch (eventType.toLowerCase()) {
      case 'break':
        return 'bg-blue-500'
      case 'clean':
        return 'bg-green-500'
      case 'machine down':
        return 'bg-red-500'
      case 'meeting':
        return 'bg-yellow-500'
      case 'shift change':
        return 'bg-purple-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item, index) => (
            <div key={index} className="flex items-center space-x-4">
              <div className="w-20 text-sm font-medium">{item.eventType}</div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                    <div
                      className={`h-6 rounded-full ${getColorByType(item.eventType)} flex items-center justify-center text-white text-xs font-medium`}
                      style={{ width: `${(item.totalMinutes / maxMinutes) * 100}%` }}
                    >
                      {item.totalMinutes > 0 && `${item.totalMinutes}m`}
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 w-20 text-right">
                    {item.eventCount} events
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Avg: {item.avgDuration.toFixed(1)} minutes per event
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {data.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No downtime data available
          </div>
        )}
        
        <div className="mt-6 pt-4 border-t">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Total Events: </span>
              {data.reduce((sum, item) => sum + item.eventCount, 0)}
            </div>
            <div>
              <span className="font-medium">Total Downtime: </span>
              {data.reduce((sum, item) => sum + item.totalMinutes, 0)} minutes
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
} 