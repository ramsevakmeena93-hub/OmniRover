import React from 'react'

function DetectionItem({ label, detected, icon }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded border transition-all duration-500
      ${detected
        ? 'bg-red-500/10 border-red-500/40 text-red-400'
        : 'bg-gray-800/40 border-gray-700/40 text-gray-600'
      }`}>
      <span className="text-2xl">{icon}</span>
      <div className="flex-1">
        <div className={`text-sm font-bold tracking-wider ${detected ? 'text-red-400' : 'text-gray-600'}`}>{label}</div>
        <div className={`text-xs font-mono ${detected ? 'text-red-500' : 'text-gray-700'}`}>
          {detected ? '● DETECTED' : '○ NOT DETECTED'}
        </div>
      </div>
      {detected && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse-fast"></div>}
    </div>
  )
}

export default function AIDetectionPanel({ data }) {
  return (
    <div className="bg-army-panel rounded-lg border border-army-border p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold tracking-widest text-gray-400">AI DETECTION</span>
        <span className="text-xs font-mono text-army-accent">● ACTIVE</span>
      </div>
      <DetectionItem label="HUMAN DETECTED" detected={data.humanDetected} icon="🧍" />
      <DetectionItem label="SMOKE DETECTED" detected={data.smokeDetected} icon="💨" />
      <DetectionItem label="DEBRIS DETECTED" detected={data.debrisDetected} icon="🪨" />
    </div>
  )
}
