import React, { useState, useRef, useCallback } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function VisionPanel({ videoRef }) {
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState([])
  const [autoMode, setAutoMode] = useState(false)
  const autoRef = useRef(null)

  const analyze = useCallback(async () => {
    if (!videoRef?.current || videoRef.current.readyState < 2) {
      setError('Camera not active — start camera first')
      return
    }
    setLoading(true)
    setError('')
    try {
      // Capture frame from video
      const canvas = document.createElement('canvas')
      canvas.width = 480
      canvas.height = 360
      canvas.getContext('2d').drawImage(videoRef.current, 0, 0, 480, 360)
      const b64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1]

      const res = await axios.post(`${API_URL}/api/vision`, { image: b64 }, { timeout: 12000 })
      const text = res.data.description
      setDescription(text)
      const time = new Date().toLocaleTimeString('en-IN', { hour12: false })
      setHistory(h => [{ text, time }, ...h].slice(0, 8))
    } catch (err) {
      if (err.response?.status === 429) setError('Rate limited — wait 5 seconds')
      else setError('Vision analysis failed — check server')
    } finally {
      setLoading(false)
    }
  }, [videoRef])

  const toggleAuto = () => {
    if (autoMode) {
      clearInterval(autoRef.current)
      setAutoMode(false)
    } else {
      setAutoMode(true)
      analyze()
      autoRef.current = setInterval(analyze, 8000)
    }
  }

  return (
    <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, padding: 16, fontFamily: 'monospace', display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 'bold', letterSpacing: 3, color: '#9ca3af' }}>VISION AI — SCENE ANALYSIS</div>
          <div style={{ fontSize: 9, color: '#4b5563', marginTop: 2 }}>Llama 4 Scout · Visual Intelligence</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={toggleAuto}
            style={{ fontSize: 10, padding: '6px 12px', borderRadius: 6, border: `1.5px solid ${autoMode ? '#ffaa00' : '#1f2937'}`, color: autoMode ? '#ffaa00' : '#6b7280', background: autoMode ? 'rgba(255,170,0,0.1)' : 'transparent', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold' }}>
            {autoMode ? '⏹ AUTO ON' : '⏺ AUTO'}
          </button>
          <button onClick={analyze} disabled={loading}
            style={{ fontSize: 10, padding: '6px 14px', borderRadius: 6, border: '1.5px solid #00ff8844', color: loading ? '#4b5563' : '#00ff88', background: loading ? 'transparent' : 'rgba(0,255,136,0.08)', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'monospace', fontWeight: 'bold' }}>
            {loading ? '⏳ ANALYZING...' : '🔍 ANALYZE'}
          </button>
        </div>
      </div>

      {/* Main output */}
      <div style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid ${description ? '#00ff8833' : '#1f2937'}`, borderRadius: 6, padding: 14, minHeight: 80 }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00ff88', animation: 'pulse 1s infinite' }} />
            <span style={{ fontSize: 11, color: '#6b7280' }}>Sending frame to Llama 4 Scout vision model...</span>
          </div>
        )}
        {!loading && error && (
          <div style={{ fontSize: 11, color: '#ff2d2d' }}>⚠ {error}</div>
        )}
        {!loading && !error && description && (
          <div style={{ fontSize: 12, color: '#e5e7eb', lineHeight: 1.7 }}>{description}</div>
        )}
        {!loading && !error && !description && (
          <div style={{ fontSize: 11, color: '#374151' }}>Click ANALYZE to send current camera frame to vision AI for scene description.</div>
        )}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 9, color: '#4b5563', letterSpacing: 2 }}>ANALYSIS HISTORY</div>
          <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {history.map((h, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid #1f2937', borderRadius: 4, padding: '6px 10px' }}>
                <div style={{ fontSize: 9, color: '#4b5563', marginBottom: 3 }}>{h.time}</div>
                <div style={{ fontSize: 10, color: '#9ca3af', lineHeight: 1.5 }}>{h.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  )
}
