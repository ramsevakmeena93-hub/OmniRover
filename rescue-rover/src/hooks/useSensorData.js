/**
 * useSensorData — Real WebSocket hook
 * Connects to ws://localhost:5000
 * Falls back to /api/sensors polling if WebSocket fails
 */
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000'
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function getRiskLevel(data) {
  if (!data.hardwareConnected) return 'OFFLINE'
  if (data.gas > 300 || data.temperature > 40 || data.distance < 50) return 'DANGER'
  if (data.gas > 200 || data.temperature > 35 || data.distance < 100) return 'WARNING'
  return 'SAFE'
}

function getAlerts(data) {
  const alerts = []
  if (data.gas > 300) alerts.push({ id: 'gas', msg: 'TOXIC GAS DETECTED — EVACUATE IMMEDIATELY', level: 'DANGER' })
  if (data.temperature > 40) alerts.push({ id: 'temp', msg: 'EXTREME HEAT RISK — THERMAL HAZARD ACTIVE', level: 'DANGER' })
  if (data.distance < 50) alerts.push({ id: 'dist', msg: 'OBSTACLE ALERT — COLLISION IMMINENT', level: 'WARNING' })
  if (data.smokeDetected) alerts.push({ id: 'smoke', msg: 'SMOKE DETECTED — FIRE RISK ELEVATED', level: 'WARNING' })
  if (data.humanDetected) alerts.push({ id: 'human', msg: 'SURVIVOR DETECTED — DEPLOY RESCUE TEAM', level: 'WARNING' })
  return alerts
}

function getRecommendation(data, risk) {
  if (risk === 'DANGER') {
    if (data.gas > 300) return 'CRITICAL: Toxic gas levels exceed safe threshold. Deploy gas masks. Initiate immediate evacuation protocol. Do not send personnel without full HAZMAT gear.'
    if (data.temperature > 40) return 'CRITICAL: Thermal hazard detected. Risk of heat stroke for survivors. Deploy cooling units. Prioritize extraction within 10 minutes.'
    return 'CRITICAL: Multiple hazards detected. Halt rover advance. Request aerial support. Establish safe perimeter at 200m.'
  }
  if (risk === 'WARNING') {
    if (data.humanDetected) return 'SURVIVOR DETECTED: Human life sign confirmed. Proceed with caution. Deploy rescue team to rover coordinates. Estimated extraction window: 15 minutes.'
    return 'WARNING: Elevated risk detected. Proceed at reduced speed. Monitor sensor trends. Keep extraction team on standby.'
  }
  if (data.humanDetected) return 'SURVIVOR LOCATED: Zone is safe for approach. Deploy rescue personnel immediately. Rover holding position at survivor coordinates.'
  return 'ZONE CLEAR: No immediate threats. Continue systematic search pattern. All systems nominal.'
}

function enrich(raw) {
  const risk = getRiskLevel(raw)
  return {
    ...raw,
    risk,
    alerts: getAlerts(raw),
    // Use server-provided LLM recommendation if available, else fallback
    recommendation: raw.recommendation || getRecommendation(raw, risk),
  }
}

export function useSensorData() {
  const [current, setCurrent] = useState(null)
  const [history, setHistory] = useState([])
  const [tempHistory, setTempHistory] = useState([])
  const [gasHistory, setGasHistory] = useState([])
  const [ultrasonicHistory, setUltrasonicHistory] = useState([])
  const [labels, setLabels] = useState([])
  const [connected, setConnected] = useState(false)
  const wsRef = useRef(null)
  const pollRef = useRef(null)

  function applyData(raw) {
    const data = enrich(raw)
    setCurrent(data)
    setHistory(h => [data, ...h].slice(0, 100))
    setTempHistory(h => [...h, data.temperature].slice(-20))
    setGasHistory(h => [...h, data.gas].slice(-20))
    setUltrasonicHistory(h => [...h, data.ultrasonic1 ?? data.distance ?? 200].slice(-20))
    setLabels(l => [...l, new Date().toLocaleTimeString()].slice(-20))
  }

  useEffect(() => {
    let ws
    let reconnectTimer

    function connect() {
      ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        setConnected(true)
        console.log('[WS] Connected')
        // Stop polling if it was running
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      }

      ws.onmessage = (e) => {
        try { applyData(JSON.parse(e.data)) } catch {}
      }

      ws.onclose = () => {
        setConnected(false)
        console.warn('[WS] Disconnected — falling back to polling')
        startPolling()
        reconnectTimer = setTimeout(connect, 5000) // retry WS every 5s
      }

      ws.onerror = () => ws.close()
    }

    function startPolling() {
      if (pollRef.current) return
      pollRef.current = setInterval(async () => {
        try {
          const res = await axios.get(`${API_URL}/api/sensors`)
          applyData(res.data)
        } catch {}
      }, 2000)
    }

    connect()

    return () => {
      clearTimeout(reconnectTimer)
      if (pollRef.current) clearInterval(pollRef.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [])

  return { current, history, tempHistory, gasHistory, ultrasonicHistory, labels, connected }
}
