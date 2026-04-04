import React, { useState, useRef } from 'react'

function formatTime(iso) {
  if (!iso) return 'N/A'
  return new Date(iso).toLocaleString('en-IN', { hour12: false })
}

function getRiskColor(risk) {
  if (risk === 'DANGER') return '#ff2d2d'
  if (risk === 'WARNING') return '#ffaa00'
  return '#00ff88'
}

export default function MissionReport({ history, current }) {
  const [showReport, setShowReport] = useState(false)
  const reportRef = useRef(null)

  const missionStart = history.length > 0 ? history[history.length - 1]?.timestamp : new Date().toISOString()
  const missionEnd = history.length > 0 ? history[0]?.timestamp : new Date().toISOString()

  // Compute summary stats
  const totalReadings = history.length
  const maxTemp = history.length ? Math.max(...history.map(h => h.temperature || 0)).toFixed(1) : 'N/A'
  const maxGas = history.length ? Math.max(...history.map(h => h.gas || 0)) : 'N/A'
  const minDist = history.length ? Math.min(...history.map(h => h.distance || 999)) : 'N/A'
  const humanDetections = history.filter(h => h.humanDetected).length
  const smokeDetections = history.filter(h => h.smokeDetected).length
  const debrisDetections = history.filter(h => h.debrisDetected).length
  const dangerEvents = history.filter(h => h.risk === 'DANGER').length
  const warningEvents = history.filter(h => h.risk === 'WARNING').length

  const downloadPDF = () => {
    const content = generateReportText()
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `OmniRover_Mission_Report_${new Date().toISOString().slice(0,10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const downloadCSV = () => {
    const headers = 'Timestamp,Temperature(C),Gas(ppm),Distance(cm),Human,Smoke,Debris,Risk,Recommendation\n'
    const rows = history.map(h =>
      `"${formatTime(h.timestamp)}",${h.temperature},${h.gas},${h.distance},${h.humanDetected?'YES':'NO'},${h.smokeDetected?'YES':'NO'},${h.debrisDetected?'YES':'NO'},${h.risk},"${(h.recommendation||'').replace(/"/g,"'")}"`
    ).join('\n')
    const blob = new Blob([headers + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `OmniRover_SensorData_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function generateReportText() {
    return `
================================================================================
           NDRF — DISASTER RESCUE ROVER MISSION REPORT
                           CLASSIFICATION: RESTRICTED
================================================================================

REPORT ID     : RPT-${Date.now()}
GENERATED     : ${new Date().toLocaleString('en-IN', { hour12: false })} IST
ROVER UNIT    : OmniRover
OPERATOR      : [OFFICER NAME]
UNIT          : [UNIT NAME / REGIMENT]
LOCATION      : Gwalior, Madhya Pradesh
COORDINATES   : ${current?.lat?.toFixed(5) || 'N/A'}°N, ${current?.lng?.toFixed(5) || 'N/A'}°E

--------------------------------------------------------------------------------
MISSION TIMELINE
--------------------------------------------------------------------------------
Mission Start : ${formatTime(missionStart)}
Mission End   : ${formatTime(missionEnd)}
Total Readings: ${totalReadings}

--------------------------------------------------------------------------------
SENSOR SUMMARY
--------------------------------------------------------------------------------
Max Temperature Recorded : ${maxTemp}°C  ${parseFloat(maxTemp) > 40 ? '[EXCEEDED SAFE LIMIT]' : '[WITHIN SAFE RANGE]'}
Max Gas Level Recorded   : ${maxGas} ppm  ${parseInt(maxGas) > 300 ? '[TOXIC - EXCEEDED LIMIT]' : '[WITHIN SAFE RANGE]'}
Min Distance to Obstacle : ${minDist} cm  ${parseInt(minDist) < 50 ? '[OBSTACLE ENCOUNTERED]' : '[CLEAR PATH]'}

--------------------------------------------------------------------------------
DETECTION EVENTS
--------------------------------------------------------------------------------
Human Survivors Detected : ${humanDetections} event(s)
Smoke/Fire Detected      : ${smokeDetections} event(s)
Debris Detected          : ${debrisDetections} event(s)

--------------------------------------------------------------------------------
RISK ASSESSMENT
--------------------------------------------------------------------------------
DANGER Level Events      : ${dangerEvents}
WARNING Level Events     : ${warningEvents}
Overall Mission Risk     : ${dangerEvents > 0 ? 'HIGH' : warningEvents > 0 ? 'MEDIUM' : 'LOW'}

--------------------------------------------------------------------------------
CURRENT STATUS (LAST READING)
--------------------------------------------------------------------------------
Temperature  : ${current?.temperature || 'N/A'}°C
Gas Level    : ${current?.gas || 'N/A'} ppm
Distance     : ${current?.distance || 'N/A'} cm
Risk Level   : ${current?.risk || 'N/A'}
Human        : ${current?.humanDetected ? 'DETECTED' : 'NOT DETECTED'}
Smoke/Fire   : ${current?.smokeDetected ? 'DETECTED' : 'NOT DETECTED'}
Debris       : ${current?.debrisDetected ? 'DETECTED' : 'NOT DETECTED'}

--------------------------------------------------------------------------------
AI TACTICAL RECOMMENDATION
--------------------------------------------------------------------------------
${current?.recommendation || 'No recommendation available'}

--------------------------------------------------------------------------------
OPERATIONAL NOTES FOR COMMANDING OFFICER
--------------------------------------------------------------------------------
1. All sensor data logged at 2-second intervals via OmniRover autonomous system
2. AI recommendations generated by Llama-3 LLM based on real-time sensor fusion
3. GPS coordinates updated continuously via onboard GPS module
4. Camera feed recorded throughout mission duration
5. This report should be forwarded to:
   - NDRF Command Headquarters
   - Brigade / Division Commander
   - NDRF Corps of Engineers (if structural damage)

--------------------------------------------------------------------------------
RECOMMENDATIONS TO GOVERNMENT / HIGHER COMMAND
--------------------------------------------------------------------------------
${dangerEvents > 0 ? `⚠ CRITICAL: ${dangerEvents} DANGER-level events recorded.
   Immediate deployment of HAZMAT/rescue teams recommended.
   Area should be cordoned off until gas/fire hazards are neutralized.` :
warningEvents > 0 ? `⚠ WARNING: ${warningEvents} WARNING-level events recorded.
   Rescue teams should proceed with standard protective equipment.
   Continuous monitoring recommended.` :
`✓ SAFE: No critical hazards detected during this mission.
   Area cleared for rescue operations.`}

${humanDetections > 0 ? `✓ SURVIVORS: ${humanDetections} human detection event(s) recorded.
   Immediate extraction teams should be deployed to rover coordinates.` : ''}

--------------------------------------------------------------------------------
SENSOR LOG (LAST 20 READINGS)
--------------------------------------------------------------------------------
TIMESTAMP                | TEMP  | GAS   | DIST  | HUMAN | SMOKE | RISK
-------------------------|-------|-------|-------|-------|-------|--------
${history.slice(0, 20).map(h =>
  `${formatTime(h.timestamp).padEnd(24)}| ${String(h.temperature+'°C').padEnd(6)}| ${String(h.gas+'ppm').padEnd(6)}| ${String(h.distance+'cm').padEnd(6)}| ${(h.humanDetected?'YES':'NO').padEnd(6)}| ${(h.smokeDetected?'YES':'NO').padEnd(6)}| ${h.risk}`
).join('\n')}

================================================================================
                    END OF MISSION REPORT — OmniRover
         NDRF Disaster Rescue Unit | Confidential
================================================================================
`
  }

  if (!showReport) {
    return (
      <div className="bg-army-panel rounded-lg border border-army-border p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs font-bold tracking-widest text-gray-400">MISSION REPORT</div>
            <div className="text-xs text-gray-600 font-mono mt-1">
              {totalReadings} readings · {dangerEvents} danger events · {humanDetections} survivors detected
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setShowReport(true)}
              className="text-xs px-3 py-1.5 rounded border border-army-accent/40 text-army-accent font-mono hover:bg-army-accent/10 transition-colors">
              👁 VIEW REPORT
            </button>
            <button onClick={downloadCSV}
              className="text-xs px-3 py-1.5 rounded border border-blue-500/40 text-blue-400 font-mono hover:bg-blue-500/10 transition-colors">
              ⬇ CSV DATA
            </button>
            <button onClick={downloadPDF}
              className="text-xs px-3 py-1.5 rounded border border-yellow-400/40 text-yellow-400 font-mono hover:bg-yellow-400/10 transition-colors">
              ⬇ FULL REPORT
            </button>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {[
            { label: 'MAX TEMP', value: `${maxTemp}°C`, color: parseFloat(maxTemp) > 40 ? '#ff2d2d' : '#00ff88' },
            { label: 'MAX GAS', value: `${maxGas}ppm`, color: parseInt(maxGas) > 300 ? '#ff2d2d' : '#00ff88' },
            { label: 'SURVIVORS', value: humanDetections, color: humanDetections > 0 ? '#00ff88' : '#6b7280' },
            { label: 'DANGER EVENTS', value: dangerEvents, color: dangerEvents > 0 ? '#ff2d2d' : '#6b7280' },
          ].map((s, i) => (
            <div key={i} className="bg-black/20 rounded border border-gray-800 p-3 text-center">
              <div className="text-xs text-gray-500 font-mono">{s.label}</div>
              <div className="text-xl font-bold font-mono mt-1" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-army-panel rounded-lg border border-army-border p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs font-bold tracking-widest text-gray-400">MISSION REPORT — OmniRover</span>
        <div className="flex gap-2 flex-wrap">
          <button onClick={downloadCSV}
            className="text-xs px-3 py-1 rounded border border-blue-500/40 text-blue-400 font-mono hover:bg-blue-500/10 transition-colors">
            ⬇ CSV
          </button>
          <button onClick={downloadPDF}
            className="text-xs px-3 py-1 rounded border border-yellow-400/40 text-yellow-400 font-mono hover:bg-yellow-400/10 transition-colors">
            ⬇ REPORT.TXT
          </button>
          <button onClick={() => setShowReport(false)}
            className="text-xs px-3 py-1 rounded border border-gray-700 text-gray-400 font-mono hover:bg-gray-800 transition-colors">
            ✕ CLOSE
          </button>
        </div>
      </div>

      {/* Report viewer */}
      <div ref={reportRef} className="bg-black rounded border border-gray-800 p-4 overflow-auto max-h-[600px]">
        {/* Title */}
        <div className="text-center mb-4 border-b border-gray-700 pb-4">
          <div className="text-army-accent font-mono font-bold text-sm tracking-widest">NDRF</div>
          <div className="text-white font-mono font-bold text-xs mt-1">DISASTER RESCUE ROVER — MISSION REPORT</div>
          <div className="text-gray-500 font-mono text-xs mt-1">CLASSIFICATION: RESTRICTED</div>
          <div className="text-gray-600 font-mono text-xs mt-1">Generated: {new Date().toLocaleString('en-IN', { hour12: false })} IST</div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-4 text-xs font-mono">
          {[
            ['ROVER UNIT', 'OmniRover'],
            ['LOCATION', 'Gwalior, MP'],
            ['COORDINATES', `${current?.lat?.toFixed(5) || 'N/A'}°N, ${current?.lng?.toFixed(5) || 'N/A'}°E`],
            ['MISSION START', formatTime(missionStart)],
            ['MISSION END', formatTime(missionEnd)],
            ['TOTAL READINGS', totalReadings],
          ].map(([k, v], i) => (
            <div key={i} className="flex gap-2">
              <span className="text-gray-500 w-32 flex-shrink-0">{k}:</span>
              <span className="text-gray-300">{v}</span>
            </div>
          ))}
        </div>

        {/* Risk summary */}
        <div className="border border-gray-800 rounded p-3 mb-4">
          <div className="text-xs font-bold tracking-widest text-gray-400 mb-2">RISK SUMMARY</div>
          <div className="flex gap-4 flex-wrap text-xs font-mono">
            <span className="text-red-400">● DANGER: {dangerEvents} events</span>
            <span className="text-yellow-400">● WARNING: {warningEvents} events</span>
            <span className="text-green-400">● SURVIVORS: {humanDetections} detected</span>
            <span className="text-orange-400">● FIRE/SMOKE: {smokeDetections} events</span>
          </div>
        </div>

        {/* Sensor peaks */}
        <div className="border border-gray-800 rounded p-3 mb-4">
          <div className="text-xs font-bold tracking-widest text-gray-400 mb-2">PEAK SENSOR VALUES</div>
          <div className="grid grid-cols-3 gap-3 text-xs font-mono">
            <div>
              <div className="text-gray-500">MAX TEMPERATURE</div>
              <div className="text-lg font-bold" style={{ color: parseFloat(maxTemp) > 40 ? '#ff2d2d' : '#00ff88' }}>{maxTemp}°C</div>
            </div>
            <div>
              <div className="text-gray-500">MAX GAS LEVEL</div>
              <div className="text-lg font-bold" style={{ color: parseInt(maxGas) > 300 ? '#ff2d2d' : '#00ff88' }}>{maxGas} ppm</div>
            </div>
            <div>
              <div className="text-gray-500">MIN DISTANCE</div>
              <div className="text-lg font-bold" style={{ color: parseInt(minDist) < 50 ? '#ff2d2d' : '#00ff88' }}>{minDist} cm</div>
            </div>
          </div>
        </div>

        {/* AI Recommendation */}
        <div className="border border-army-accent/20 rounded p-3 mb-4 bg-army-accent/5">
          <div className="text-xs font-bold tracking-widest text-army-accent mb-2">🤖 AI TACTICAL RECOMMENDATION</div>
          <div className="text-xs font-mono text-green-300 leading-relaxed">{current?.recommendation || 'No recommendation available'}</div>
        </div>

        {/* Govt recommendation */}
        <div className="border border-yellow-400/20 rounded p-3 mb-4 bg-yellow-400/5">
          <div className="text-xs font-bold tracking-widest text-yellow-400 mb-2">📋 RECOMMENDATION TO HIGHER COMMAND</div>
          <div className="text-xs font-mono text-yellow-300 leading-relaxed">
            {dangerEvents > 0
              ? `CRITICAL: ${dangerEvents} DANGER-level events recorded. Immediate deployment of HAZMAT/rescue teams required. Area should be cordoned off. Forward to NDRF Command Headquarters immediately.`
              : warningEvents > 0
              ? `WARNING: ${warningEvents} WARNING-level events recorded. Rescue teams should proceed with standard protective equipment. Continuous monitoring recommended.`
              : `SAFE: No critical hazards detected. Area cleared for rescue operations. Standard protocols apply.`}
            {humanDetections > 0 && ` SURVIVORS CONFIRMED: ${humanDetections} human detection event(s). Deploy extraction teams to rover GPS coordinates immediately.`}
          </div>
        </div>

        {/* Data log table */}
        <div className="border border-gray-800 rounded p-3">
          <div className="text-xs font-bold tracking-widest text-gray-400 mb-2">SENSOR LOG (LAST 20 READINGS)</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-gray-600 border-b border-gray-800">
                  <th className="text-left py-1 pr-3">TIME</th>
                  <th className="text-right pr-3">TEMP</th>
                  <th className="text-right pr-3">GAS</th>
                  <th className="text-right pr-3">DIST</th>
                  <th className="text-right pr-3">HUMAN</th>
                  <th className="text-right pr-3">SMOKE</th>
                  <th className="text-right">RISK</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 20).map((row, i) => (
                  <tr key={i} className="border-b border-gray-800/50">
                    <td className="py-1 pr-3 text-gray-500">{new Date(row.timestamp).toLocaleTimeString('en-IN', { hour12: false })}</td>
                    <td className={`text-right pr-3 ${row.temperature > 40 ? 'text-red-400' : 'text-gray-300'}`}>{row.temperature}°C</td>
                    <td className={`text-right pr-3 ${row.gas > 300 ? 'text-red-400' : row.gas > 200 ? 'text-yellow-400' : 'text-gray-300'}`}>{row.gas}ppm</td>
                    <td className={`text-right pr-3 ${row.distance < 50 ? 'text-red-400' : 'text-gray-300'}`}>{row.distance}cm</td>
                    <td className={`text-right pr-3 ${row.humanDetected ? 'text-green-400' : 'text-gray-600'}`}>{row.humanDetected ? 'YES' : 'NO'}</td>
                    <td className={`text-right pr-3 ${row.smokeDetected ? 'text-orange-400' : 'text-gray-600'}`}>{row.smokeDetected ? 'YES' : 'NO'}</td>
                    <td className="text-right font-bold" style={{ color: getRiskColor(row.risk) }}>{row.risk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-center mt-4 text-xs font-mono text-gray-700 border-t border-gray-800 pt-3">
          END OF REPORT — OmniRover · NDRF Disaster Rescue Unit · RESTRICTED
        </div>
      </div>
    </div>
  )
}


