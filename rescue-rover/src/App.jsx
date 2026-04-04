import React, { useState, useEffect, useRef } from 'react'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import AlertBanner from './components/AlertBanner'
import SensorCard from './components/SensorCard'
import AIDetectionPanel from './components/AIDetectionPanel'
import RiskIndicator from './components/RiskIndicator'
import RecommendationPanel from './components/RecommendationPanel'
import LiveMap from './components/LiveMap'
import CameraFeed from './components/CameraFeed'
import AnalyticsPanel from './components/AnalyticsPanel'
import DataLogs from './components/DataLogs'
import MissionReport from './components/MissionReport'
import UltrasonicPanel from './components/UltrasonicPanel'
import RoverController from './components/RoverController'
import VisionPanel from './components/VisionPanel'
import { useAlertSound } from './hooks/useAlertSound'
import { useSensorData } from './hooks/useSensorData'

function getSensorStatus(value, warningThreshold, dangerThreshold, invert = false) {
  if (invert) {
    if (value < dangerThreshold) return 'DANGER'
    if (value < warningThreshold) return 'WARNING'
    return 'SAFE'
  }
  if (value >= dangerThreshold) return 'DANGER'
  if (value >= warningThreshold) return 'WARNING'
  return 'SAFE'
}

function useMissionTimer() {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const h = String(Math.floor(elapsed / 3600)).padStart(2, '0')
  const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '00')
  const s = String(elapsed % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-army-dark gap-4">
      <div className="text-army-accent text-4xl font-bold tracking-widest" style={{fontFamily:'Rajdhani,sans-serif'}}>OmniRover</div>
      <div className="text-gray-500 text-xs font-mono tracking-widest">WAITING FOR ESP32 ROVER...</div>
      <div className="text-gray-700 text-xs font-mono mt-1">Make sure ESP32 is powered and on same WiFi</div>
      <div className="flex gap-1 mt-2">
        {[0,1,2].map(i => (
          <div key={i} className="w-2 h-2 rounded-full bg-army-accent animate-bounce" style={{animationDelay:`${i*0.15}s`}}></div>
        ))}
      </div>
      <div className="mt-4 text-xs font-mono text-gray-700 border border-gray-800 rounded px-4 py-2 text-center">
        Server: <span className="text-army-accent">http://localhost:5000</span><br/>
        ESP32 connects to: <span className="text-army-accent">ws://10.222.71.222:5000/hardware</span>
      </div>
    </div>
  )
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const { current, history, tempHistory, gasHistory, ultrasonicHistory, labels, connected } = useSensorData()
  const missionTime = useMissionTimer()
  const [camDetections, setCamDetections] = useState({})
  const { triggerAlert } = useAlertSound()
  const videoRef = useRef(null)

  const mergedSensor = current ? { ...current, ...camDetections } : null

  // Sound alerts
  useEffect(() => {
    if (!mergedSensor) return
    if (mergedSensor.risk === 'DANGER') triggerAlert('danger')
    else if (mergedSensor.risk === 'WARNING') triggerAlert('warning')
    if (mergedSensor.humanDetected) triggerAlert('human')
    if (mergedSensor.smokeDetected || camDetections.smokeDetected) triggerAlert('fire')
    if ((mergedSensor.gas > 300) || camDetections.gasDetected) triggerAlert('gas')
    if (mergedSensor.debrisDetected) triggerAlert('debris')
  }, [
    mergedSensor?.risk, mergedSensor?.humanDetected, mergedSensor?.smokeDetected,
    camDetections?.smokeDetected, camDetections?.gasDetected, mergedSensor?.debrisDetected,
  ])

  if (!current || current.temperature === undefined) return <LoadingScreen />

  const tempStatus = getSensorStatus(current.temperature, 35, 40)
  const gasStatus  = getSensorStatus(current.gas, 200, 300)
  const distStatus = getSensorStatus(current.distance, 100, 50, true)

  return (
    <div className="flex flex-col h-screen bg-army-dark overflow-hidden">
      <Navbar risk={current.risk} missionTime={missionTime} connected={connected} />
      <AlertBanner alerts={current.alerts} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar active={activeTab} setActive={setActiveTab} />

        <main className="flex-1 overflow-y-auto p-4">

          {/* ── DASHBOARD ── */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <SensorCard label="TEMPERATURE" value={current.temperature} unit="°C" icon="🌡️" status={tempStatus} min={0} max={80} threshold={40} />
                <SensorCard label="GAS LEVEL"   value={current.gas}         unit="ppm" icon="☁️" status={gasStatus}  min={0} max={600} threshold={300} />
                <SensorCard label="DISTANCE"    value={current.distance}    unit="cm"  icon="📡" status={distStatus} min={0} max={300} threshold={50} />
              </div>
              <div className="row-span-2"><RiskIndicator risk={current.risk} /></div>
              <div className="lg:col-span-2"><AIDetectionPanel data={current} /></div>
              <div className="lg:col-span-3"><RecommendationPanel recommendation={current.recommendation} risk={current.risk} /></div>
              <div className="lg:col-span-3"><LiveMap risk={current.risk} sensorData={mergedSensor} /></div>
            </div>
          )}

          {/* ── CONTROL ── */}
          {activeTab === 'control' && (
            <RoverController sensorData={mergedSensor} />
          )}

          {/* ── MAP ── */}
          {activeTab === 'map' && (
            <LiveMap risk={current.risk} sensorData={mergedSensor} />
          )}

          {/* ── CAMERA ── */}
          {activeTab === 'camera' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="lg:col-span-2">
                <CameraFeed onDetection={setCamDetections} videoRef={videoRef} />
              </div>
              <UltrasonicPanel data={mergedSensor} />
              <AIDetectionPanel data={mergedSensor} />
              <div className="lg:col-span-2">
                <VisionPanel videoRef={videoRef} />
              </div>
            </div>
          )}

          {/* ── ANALYTICS ── */}
          {activeTab === 'analytics' && (
            <div className="max-w-2xl">
              <AnalyticsPanel tempHistory={tempHistory} gasHistory={gasHistory} ultrasonicHistory={ultrasonicHistory} labels={labels} />
            </div>
          )}

          {/* ── LOGS ── */}
          {activeTab === 'logs' && (
            <div className="flex flex-col gap-4">
              <MissionReport history={history} current={current} />
              <DataLogs history={history} />
            </div>
          )}

        </main>
      </div>
    </div>
  )
}
