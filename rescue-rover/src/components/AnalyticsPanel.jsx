import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Filler, Legend
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, Legend)

const chartOptions = (label, color, dangerLine) => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 300 },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#111827',
      borderColor: color,
      borderWidth: 1,
      titleColor: color,
      bodyColor: '#9ca3af',
    },
    annotation: dangerLine ? {
      annotations: {
        line1: { type: 'line', yMin: dangerLine, yMax: dangerLine, borderColor: '#ff2d2d', borderWidth: 1, borderDash: [4, 4] }
      }
    } : undefined,
  },
  scales: {
    x: {
      ticks: { color: '#4b5563', font: { size: 9, family: 'JetBrains Mono' }, maxTicksLimit: 6 },
      grid: { color: 'rgba(255,255,255,0.04)' },
    },
    y: {
      ticks: { color: '#4b5563', font: { size: 9, family: 'JetBrains Mono' } },
      grid: { color: 'rgba(255,255,255,0.04)' },
    }
  }
})

function MiniChart({ labels, data, color, label, unit, dangerLine }) {
  const chartData = {
    labels,
    datasets: [{
      label,
      data,
      borderColor: color,
      backgroundColor: color + '18',
      borderWidth: 2,
      pointRadius: 0,
      fill: true,
      tension: 0.4,
    }]
  }
  return (
    <div className="bg-army-panel rounded-lg border border-army-border p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold tracking-widest text-gray-400">{label} TREND</span>
        <span className="text-xs font-mono" style={{ color }}>{data[data.length - 1]}{unit}</span>
      </div>
      <div className="h-28">
        <Line data={chartData} options={chartOptions(label, color, dangerLine)} />
      </div>
    </div>
  )
}

export default function AnalyticsPanel({ tempHistory, gasHistory, ultrasonicHistory, labels }) {
  return (
    <div className="flex flex-col gap-4">
      <MiniChart labels={labels} data={tempHistory}       color="#ff6b35" label="TEMPERATURE"      unit="°C"  dangerLine={40}  />
      <MiniChart labels={labels} data={gasHistory}        color="#a855f7" label="GAS LEVEL"        unit="ppm" dangerLine={300} />
      <MiniChart labels={labels} data={ultrasonicHistory} color="#0ea5e9" label="ULTRASONIC FRONT" unit="cm"  dangerLine={80}  />
    </div>
  )
}
