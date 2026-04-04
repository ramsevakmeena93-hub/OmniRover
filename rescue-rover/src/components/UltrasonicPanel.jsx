import React from 'react'

function UltrasonicBar({ label, value, direction, noData }) {
  const max = 400
  const pct = Math.min(100, (value / max) * 100)
  const status = noData ? 'N/A' : value < 50 ? 'CRITICAL' : value < 80 ? 'WARNING' : value < 150 ? 'CAUTION' : 'CLEAR'
  const color = noData ? '#374151' : value < 50 ? '#ff2d2d' : value < 80 ? '#ffaa00' : value < 150 ? '#ffd700' : '#00ff88'

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs font-mono">
        <span className="text-gray-500">{direction} {label}</span>
        <span style={{ color }} className="font-bold">{noData ? '-- cm' : `${value} cm`}</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
        {!noData && <div className="h-full rounded-full transition-all duration-500"
          style={{ width:`${100-pct}%`, background:color, marginLeft:`${pct}%` }} />}
      </div>
      <div className="text-xs font-mono text-right" style={{ color }}>{status}</div>
    </div>
  )
}

export default function UltrasonicPanel({ data }) {
  const u1 = data?.ultrasonic1 ?? data?.distance ?? null
  const u2 = data?.ultrasonic2 ?? null
  const u3 = data?.ultrasonic3 ?? null
  const hasData = u1 !== null
  const humanNearby = data?.humanNearby || (u1 !== null && u1 < 80)
  const minDist = Math.min(u1 ?? 400, u2 ?? 400, u3 ?? 400)

  return (
    <div className="bg-army-panel rounded-lg border border-army-border p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold tracking-widest text-gray-400">ULTRASONIC SENSORS</span>
        <span className={`text-xs font-mono px-2 py-0.5 rounded border font-bold ${
          humanNearby
            ? 'text-red-400 border-red-500/40 bg-red-500/10 flash-alert'
            : 'text-gray-600 border-gray-700'
        }`}>
          {humanNearby ? '⚠ OBJECT/HUMAN NEARBY' : '● CLEAR'}
        </span>
      </div>

      {/* Visual rover diagram */}
      <div className="relative flex items-center justify-center py-2">
        <div className="relative w-32 h-32">
          {/* Rover body */}
          <div className="absolute inset-8 bg-army-accent/10 border-2 border-army-accent/40 rounded flex items-center justify-center">
            <span className="text-army-accent text-xs font-mono font-bold">R1</span>
          </div>

          {/* Front sensor */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 text-center">
            <div className="text-xs font-mono font-bold" style={{ color: u1 !== null && u1 < 80 ? '#ff2d2d' : '#00ff88' }}>
              {u1 !== null ? `${u1}cm` : '--'}
            </div>
            <div className="w-0.5 h-6 mx-auto" style={{ background: u1 !== null && u1 < 80 ? '#ff2d2d' : '#00ff8844' }}></div>
          </div>

          {/* Left sensor */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-1">
            <div className="text-xs font-mono font-bold" style={{ color: u2 !== null && u2 < 80 ? '#ff2d2d' : '#4b5563' }}>
              {u2 !== null ? u2 : '--'}
            </div>
            <div className="h-0.5 w-6" style={{ background: u2 !== null && u2 < 80 ? '#ff2d2d' : '#1f2937' }}></div>
          </div>

          {/* Right sensor */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 flex-row-reverse">
            <div className="text-xs font-mono font-bold" style={{ color: u3 !== null && u3 < 80 ? '#ff2d2d' : '#4b5563' }}>
              {u3 !== null ? u3 : '--'}
            </div>
            <div className="h-0.5 w-6" style={{ background: u3 !== null && u3 < 80 ? '#ff2d2d' : '#1f2937' }}></div>
          </div>
        </div>
      </div>

      {/* Bars */}
      <div className="flex flex-col gap-2">
        <UltrasonicBar label="FRONT" value={u1 ?? 400} direction="↑" noData={u1 === null} />
        <UltrasonicBar label="LEFT"  value={u2 ?? 400} direction="←" noData={u2 === null} />
        <UltrasonicBar label="RIGHT" value={u3 ?? 400} direction="→" noData={u3 === null} />
      </div>

      {/* Human detection fusion */}
      <div className={`rounded border p-2 text-xs font-mono ${
        humanNearby
          ? 'border-red-500/40 bg-red-500/10 text-red-400'
          : 'border-gray-800 text-gray-600'
      }`}>
        <div className="font-bold mb-1">PROXIMITY DETECTION</div>
        <div>Nearest object: <span className="font-bold">{minDist} cm</span></div>
        <div className="mt-1">
          {humanNearby
            ? `⚠ Object within ${minDist}cm — possible human/obstacle`
            : 'No objects within detection range (80cm)'}
        </div>
        {humanNearby && data?.humanDetected && (
          <div className="mt-1 text-green-400 font-bold">
            ✓ CONFIRMED: Camera + Ultrasonic both detect human presence
          </div>
        )}
      </div>
    </div>
  )
}
