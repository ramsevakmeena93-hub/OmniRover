import React from 'react'

export default function RiskIndicator({ risk }) {
  const config = {
    SAFE: { color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/40', glow: 'glow-green', icon: '✓', desc: 'All systems nominal. Zone is clear for operations.' },
    WARNING: { color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/40', glow: 'glow-yellow', icon: '⚠', desc: 'Elevated risk detected. Proceed with caution.' },
    DANGER: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/50', glow: 'glow-red', icon: '✕', desc: 'CRITICAL THREAT. Immediate action required.' },
  }
  const c = config[risk] || config.SAFE

  return (
    <div className={`rounded-lg border p-4 flex flex-col items-center justify-center gap-2 ${c.bg} ${c.border} ${c.glow} ${risk === 'DANGER' ? 'flash-alert' : ''}`}>
      <div className="text-xs font-bold tracking-widest text-gray-400">RISK LEVEL</div>
      <div className={`text-5xl font-bold tracking-widest ${c.color}`} style={{fontFamily:'Rajdhani,sans-serif'}}>
        {risk}
      </div>
      <div className={`text-3xl ${c.color}`}>{c.icon}</div>
      <div className="text-xs text-center text-gray-500 mt-1">{c.desc}</div>
    </div>
  )
}
