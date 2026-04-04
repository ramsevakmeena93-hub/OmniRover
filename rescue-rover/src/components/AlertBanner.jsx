import React from 'react'

export default function AlertBanner({ alerts }) {
  if (!alerts || alerts.length === 0) return null

  const topAlert = alerts[0]
  const isDanger = topAlert.level === 'DANGER'

  return (
    <div className={`flex items-center gap-3 px-4 py-2 text-sm font-bold tracking-wider
      ${isDanger
        ? 'bg-red-500/20 border-b border-red-500/60 text-red-400 flash-alert'
        : 'bg-yellow-400/10 border-b border-yellow-400/40 text-yellow-400'
      }`}>
      <span className="text-lg">{isDanger ? '🚨' : '⚠️'}</span>
      <span className="flex-1">{topAlert.msg}</span>
      {alerts.length > 1 && (
        <span className="text-xs opacity-70">+{alerts.length - 1} MORE</span>
      )}
      <span className={`px-2 py-0.5 rounded text-xs border ${isDanger ? 'border-red-500/60 text-red-400' : 'border-yellow-400/40 text-yellow-400'}`}>
        {topAlert.level}
      </span>
    </div>
  )
}
