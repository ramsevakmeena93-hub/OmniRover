/**
 * useSensorData — DEMO MODE (no hardware required)
 * Generates realistic simulated sensor data locally.
 * No WebSocket or HTTP connections are made.
 */
import { useState, useEffect, useRef } from 'react'

// ── helpers ──────────────────────────────────────────────────────────────────

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)) }

function jitter(current, step, min, max) {
  return clamp(current + (Math.random() - 0.5) * 2 * step, min, max)
}

function getRiskLevel(data) {
  if (data.gas > 300 || data.temperature > 40 || data.distance < 50) return 'DANGER'
  if (data.gas > 200 || data.temperature > 35 || data.distance < 100) return 'WARNING'
  return 'SAFE'
}

function getAlerts(data) {
  const alerts = []
  if (data.gas > 300)        alerts.push({ id: 'gas',   msg: 'TOXIC GAS DETECTED — EVACUATE IMMEDIATELY',      level: 'DANGER'  })
  if (data.temperature > 40) alerts.push({ id: 'temp',  msg: 'EXTREME HEAT RISK — THERMAL HAZARD ACTIVE',       level: 'DANGER'  })
  if (data.distance < 50)    alerts.push({ id: 'dist',  msg: 'OBSTACLE ALERT — COLLISION IMMINENT',             level: 'WARNING' })
  if (data.smokeDetected)    alerts.push({ id: 'smoke', msg: 'SMOKE DETECTED — FIRE RISK ELEVATED',             level: 'WARNING' })
  if (data.humanDetected)    alerts.push({ id: 'human', msg: 'SURVIVOR DETECTED — DEPLOY RESCUE TEAM',          level: 'WARNING' })
  return alerts
}

function getRecommendation(data, risk) {
  if (risk === 'DANGER') {
    if (data.gas > 300)        return 'CRITICAL: Toxic gas levels exceed safe threshold. Deploy gas masks. Initiate immediate evacuation protocol. Do not send personnel without full HAZMAT gear.'
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

// ── initial state ─────────────────────────────────────────────────────────────

const INITIAL = {
  temperature:     28,
  gas:             95,
  distance:        180,
  ultrasonic1:     180,
  ultrasonic2:     220,
  ultrasonic3:     200,
  humidity:        55,
  pressure:        1013,
  smokeDetected:   false,
  humanDetected:   false,
  debrisDetected:  false,
  hardwareConnected: true,
  lat:             28.6139,
  lng:             77.2090,
}

// ── hook ──────────────────────────────────────────────────────────────────────

export function useSensorData() {
  const [current,            setCurrent]            = useState(null)
  const [history,            setHistory]            = useState([])
  const [tempHistory,        setTempHistory]        = useState([])
  const [gasHistory,         setGasHistory]         = useState([])
  const [ultrasonicHistory,  setUltrasonicHistory]  = useState([])
  const [labels,             setLabels]             = useState([])

  // live sensor state carried between ticks
  const state = useRef({ ...INITIAL })
  // countdown until next "event" (spike or detection toggle)
  const eventCountdown = useRef(Math.floor(Math.random() * 15) + 8)

  useEffect(() => {
    const tick = () => {
      const s = state.current

      // Random walk for continuous sensors
      s.temperature   = jitter(s.temperature,   0.4,  15,  55)
      s.gas           = jitter(s.gas,            8,    40, 420)
      s.distance      = jitter(s.distance,       6,    20, 350)
      s.ultrasonic1   = jitter(s.ultrasonic1,    6,    20, 350)
      s.ultrasonic2   = jitter(s.ultrasonic2,    5,    30, 400)
      s.ultrasonic3   = jitter(s.ultrasonic3,    5,    30, 400)
      s.humidity      = jitter(s.humidity,       0.5,  20,  90)
      s.pressure      = jitter(s.pressure,       0.3, 990, 1030)

      // Occasional event: toggle detections or spike a sensor
      eventCountdown.current--
      if (eventCountdown.current <= 0) {
        eventCountdown.current = Math.floor(Math.random() * 20) + 8
        const roll = Math.random()
        if      (roll < 0.25) s.humanDetected  = !s.humanDetected
        else if (roll < 0.45) s.smokeDetected  = !s.smokeDetected
        else if (roll < 0.55) s.debrisDetected = !s.debrisDetected
        else if (roll < 0.65) s.gas           = clamp(s.gas + 120, 40, 420)
        else if (roll < 0.75) s.temperature   = clamp(s.temperature + 8, 15, 55)
        else if (roll < 0.85) s.distance      = clamp(s.distance - 60, 20, 350)
      }

      // GPS drift (tiny random walk)
      s.lat += (Math.random() - 0.5) * 0.0002
      s.lng += (Math.random() - 0.5) * 0.0002

      const risk           = getRiskLevel(s)
      const alerts         = getAlerts(s)
      const recommendation = getRecommendation(s, risk)

      const data = {
        ...s,
        risk,
        alerts,
        recommendation,
        hardwareConnected: true,
      }

      setCurrent(data)
      setHistory(h         => [data, ...h].slice(0, 100))
      setTempHistory(h     => [...h, Math.round(data.temperature * 10) / 10].slice(-20))
      setGasHistory(h      => [...h, Math.round(data.gas)].slice(-20))
      setUltrasonicHistory(h => [...h, Math.round(data.ultrasonic1)].slice(-20))
      setLabels(l          => [...l, new Date().toLocaleTimeString()].slice(-20))
    }

    // First tick immediately so UI doesn't show loading screen
    tick()
    const id = setInterval(tick, 1500)
    return () => clearInterval(id)
  }, [])

  return {
    current,
    history,
    tempHistory,
    gasHistory,
    ultrasonicHistory,
    labels,
    connected: true,   // always show as connected in demo mode
  }
}
