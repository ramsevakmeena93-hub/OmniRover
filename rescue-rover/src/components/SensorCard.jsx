import React from 'react'

export default function SensorCard({ label, value, unit, icon, status, min, max, threshold }) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))

  const barColor =
    status === 'DANGER' ? 'bg-red-500' :
    status === 'WARNING' ? 'bg-yellow-400' :
    'bg-army-accent'

  const glowClass =
    status === 'DANGER' ? 'border-glow-red border-red-500/40' :
    status === 'WARNING' ? 'border-glow-yellow border-yellow-400/40' :
    'border-glow-green border-army-accent/20'

  const valueColor =
    status === 'DANGER' ? 'text-red-400 text-glow-red' :
    status === 'WARNING' ? 'text-yellow-400' :
    'text-army-accent text-glow-green'

  return (
    <div className={`bg-army-panel rounded-lg border p-4 flex flex-col gap-3 transition-all duration-500 ${glowClass}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="text-xs font-bold tracking-widest text-gray-400">{label}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded font-bold tracking-wider
          ${status === 'DANGER' ? 'bg-red-500/20 text-red-400' :
            status === 'WARNING' ? 'bg-yellow-400/20 text-yellow-400' :
            'bg-green-400/10 text-green-400'}`}>
          {status}
        </span>
      </div>

      <div className="flex items-end gap-2">
        <span className={`text-4xl font-bold font-mono leading-none ${valueColor}`}>{value}</span>
        <span className="text-gray-500 text-sm mb-1">{unit}</span>
      </div>

      <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-gray-600 font-mono">
        <span>{min}{unit}</span>
        <span className="text-gray-500">threshold: {threshold}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}
