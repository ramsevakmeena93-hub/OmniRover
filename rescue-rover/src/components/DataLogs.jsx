import React from 'react'

export default function DataLogs({ history }) {
  return (
    <div className="bg-army-panel rounded-lg border border-army-border p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold tracking-widest text-gray-400">HISTORICAL DATA LOGS</span>
        <span className="text-xs font-mono text-gray-500">{history.length} RECORDS</span>
      </div>
      <div className="overflow-auto max-h-64">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="text-gray-600 border-b border-gray-800">
              <th className="text-left py-1 pr-3">TIME</th>
              <th className="text-right pr-3">TEMP</th>
              <th className="text-right pr-3">GAS</th>
              <th className="text-right pr-3">DIST</th>
              <th className="text-right pr-3">HUMAN</th>
              <th className="text-right">RISK</th>
            </tr>
          </thead>
          <tbody>
            {history.map((row, i) => {
              const riskColor = row.risk === 'DANGER' ? 'text-red-400' : row.risk === 'WARNING' ? 'text-yellow-400' : 'text-green-400'
              return (
                <tr key={i} className="border-b border-gray-800/50 hover:bg-white/2 transition-colors">
                  <td className="py-1 pr-3 text-gray-500">{new Date(row.timestamp).toLocaleTimeString('en-IN', { hour12: false })}</td>
                  <td className={`text-right pr-3 ${row.temperature > 40 ? 'text-red-400' : 'text-gray-300'}`}>{row.temperature}°C</td>
                  <td className={`text-right pr-3 ${row.gas > 300 ? 'text-red-400' : row.gas > 200 ? 'text-yellow-400' : 'text-gray-300'}`}>{row.gas}ppm</td>
                  <td className={`text-right pr-3 ${row.distance < 50 ? 'text-red-400' : 'text-gray-300'}`}>{row.distance}cm</td>
                  <td className={`text-right pr-3 ${row.humanDetected ? 'text-red-400' : 'text-gray-600'}`}>{row.humanDetected ? 'YES' : 'NO'}</td>
                  <td className={`text-right font-bold ${riskColor}`}>{row.risk}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
