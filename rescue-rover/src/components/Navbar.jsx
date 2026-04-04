import React, { useState, useEffect } from 'react'

export default function Navbar({ risk, missionTime, connected }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const riskColor = risk === 'DANGER' ? 'text-red-500' : risk === 'WARNING' ? 'text-yellow-400' : 'text-green-400'
  const riskBg = risk === 'DANGER' ? 'bg-red-500/10 border-red-500/40' : risk === 'WARNING' ? 'bg-yellow-400/10 border-yellow-400/40' : 'bg-green-400/10 border-green-400/40'

  return (
    <header className="h-14 bg-army-panel border-b border-army-border flex items-center justify-between px-4 z-50 flex-shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-army-accent/20 border border-army-accent/40 flex items-center justify-center">
          <span className="text-army-accent text-xs font-mono font-bold">R1</span>
        </div>
        <div>
          <div className="text-sm font-bold tracking-widest text-white" style={{fontFamily:'Rajdhani,sans-serif'}}>OmniRover MISSION CONTROL</div>
          <div className="text-xs text-gray-500 font-mono">NDRF — DISASTER RESCUE UNIT</div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className={`px-3 py-1 rounded border text-xs font-bold tracking-widest ${riskBg} ${riskColor} ${risk === 'DANGER' ? 'flash-alert' : ''}`}>
          ● {risk}
        </div>
        <div className="text-xs font-mono text-gray-400 hidden sm:block">
          MISSION: <span className="text-army-accent">{missionTime}</span>
        </div>
        <div className="text-xs font-mono text-gray-400 hidden md:block">
          {time.toLocaleTimeString('en-IN', { hour12: false })} IST
        </div>
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-army-accent animate-pulse' : 'bg-red-500'}`}></div>
        <span className={`text-xs font-mono hidden sm:block ${connected ? 'text-army-accent' : 'text-red-400'}`}>
          {connected ? 'WS LIVE' : 'POLLING'}
        </span>
      </div>
    </header>
  )
}


