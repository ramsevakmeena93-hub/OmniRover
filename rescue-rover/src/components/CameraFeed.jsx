import React, { useRef, useEffect, useState, useCallback } from 'react'

const WS_URL = 'ws://localhost:5001/ws'
const FRAME_INTERVAL = 100

export default function CameraFeed({ onDetection, videoRef: externalVideoRef }) {
  const internalVideoRef = useRef(null)
  const videoRef = externalVideoRef || internalVideoRef
  const canvasRef   = useRef(null)
  const wsRef       = useRef(null)
  const streamRef   = useRef(null)
  const rafRef      = useRef(null)
  const frameTimer  = useRef(null)
  const imgRef      = useRef(null) // for IP webcam img element
  const boxesRef    = useRef([])
  const audioCtx    = useRef(null)

  const [mode,       setMode]       = useState('laptop')  // 'laptop' | 'ipwebcam'
  const [ipUrl,      setIpUrl]      = useState('192.168.1.')
  const [status,     setStatus]     = useState('idle')
  const [wsStatus,   setWsStatus]   = useState('offline')
  const [detections, setDetections] = useState([])
  const [risk,       setRisk]       = useState('SAFE')
  const [log,        setLog]        = useState([])
  const [fps,        setFps]        = useState(0)
  const fpsCount = useRef(0)
  const fpsTimer = useRef(Date.now())

  const playAlert = useCallback(() => {
    try {
      if (!audioCtx.current) audioCtx.current = new AudioContext()
      const ctx = audioCtx.current
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + 0.4)
    } catch {}
  }, [])

  // Draw loop — video + boxes at ~30fps
  const startDraw = useCallback(() => {
    const canvas = canvasRef.current
    const video  = videoRef.current
    if (!canvas || !video) return

    const draw = () => {
      if (video.readyState >= 2) {
        const W = video.videoWidth  || 640
        const H = video.videoHeight || 480
        canvas.width  = W
        canvas.height = H
        const ctx = canvas.getContext('2d')

        // Draw video frame normally (no mirror — matches YOLO coordinates)
        ctx.drawImage(video, 0, 0, W, H)

        // Bounding boxes — scale from capture size (480x360) to display size (W x H)
        const scaleX = W / 480
        const scaleY = H / 360
        boxesRef.current.forEach(d => {
          const x1 = d.bbox[0] * scaleX
          const y1 = d.bbox[1] * scaleY
          const x2 = d.bbox[2] * scaleX
          const y2 = d.bbox[3] * scaleY
          const bw = x2 - x1, bh = y2 - y1
          const color = d.color || '#00ff88'

          ctx.strokeStyle = color
          ctx.lineWidth = 2.5
          ctx.strokeRect(x1, y1, bw, bh)

          // Corner brackets
          const cs = 12
          ctx.lineWidth = 3
          ;[[x1,y1,1,1],[x2,y1,-1,1],[x1,y2,1,-1],[x2,y2,-1,-1]].forEach(([cx,cy,sx,sy]) => {
            ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+sx*cs,cy); ctx.stroke()
            ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx,cy+sy*cs); ctx.stroke()
          })

          // Label
          const label = `${d.class.toUpperCase()} ${(d.confidence*100).toFixed(0)}%`
          ctx.font = 'bold 13px monospace'
          const tw = ctx.measureText(label).width
          ctx.fillStyle = color + 'dd'
          ctx.fillRect(x1, y1 - 24, tw + 10, 22)
          ctx.fillStyle = '#fff'
          ctx.fillText(label, x1 + 5, y1 - 6)
        })

        // HUD crosshair
        const cx = W/2, cy = H/2
        ctx.strokeStyle = 'rgba(0,255,136,0.3)'
        ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(cx-18,cy); ctx.lineTo(cx+18,cy); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(cx,cy-18); ctx.lineTo(cx,cy+18); ctx.stroke()
        ctx.beginPath(); ctx.arc(cx,cy,22,0,Math.PI*2); ctx.stroke()

        // Timestamp
        ctx.fillStyle = 'rgba(0,255,136,0.6)'
        ctx.font = '9px monospace'
        ctx.fillText(new Date().toLocaleTimeString('en-IN',{hour12:false}), 6, H-6)
        ctx.fillText(`OmniRover | ${fps}fps`, W-90, H-6)

        fpsCount.current++
        const now = Date.now()
        if (now - fpsTimer.current >= 1000) {
          setFps(fpsCount.current)
          fpsCount.current = 0
          fpsTimer.current = now
        }
      }
      rafRef.current = requestAnimationFrame(draw)
    }
    rafRef.current = requestAnimationFrame(draw)
  }, [fps])

  // WebSocket connection
  const connectWS = useCallback(() => {
    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen  = () => { setWsStatus('online'); console.log('[WS] Connected to YOLO') }
    ws.onclose = () => { setWsStatus('offline'); setTimeout(connectWS, 3000) }
    ws.onerror = () => ws.close()

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        boxesRef.current = data.detections || []
        setDetections(data.detections || [])
        setRisk(data.risk || 'SAFE')

        if (onDetection) onDetection({
          humanDetected:  data.humanDetected,
          smokeDetected:  data.fireDetected,
          debrisDetected: data.debrisDetected,
          gas:            data.gasDetected ? 400 : 0,
        })

        if ((data.fireDetected || data.gasDetected) && data.count > 0) playAlert()

        if (data.count > 0) {
          const time = new Date().toLocaleTimeString('en-IN', { hour12: false })
          setLog(l => [{
            text: data.detections.map(d => `${d.class.toUpperCase()} ${(d.confidence*100).toFixed(0)}%`).join(', '),
            risk: data.risk,
            time,
          }, ...l].slice(0, 15))
        }
      } catch {}
    }
  }, [onDetection, playAlert])

  // Frame sender — captures from video or IP webcam img
  const startFrameSender = useCallback((sourceMode, phoneIp) => {
    const captureCanvas = document.createElement('canvas')
    captureCanvas.width = 480; captureCanvas.height = 360

    frameTimer.current = setInterval(() => {
      if (wsRef.current?.readyState !== 1) return
      const ctx = captureCanvas.getContext('2d')

      if (sourceMode === 'ipwebcam' && imgRef.current) {
        // Draw from IP webcam img element
        try {
          ctx.drawImage(imgRef.current, 0, 0, 480, 360)
        } catch { return }
      } else {
        // Draw from laptop camera video
        const video = videoRef.current
        if (!video || video.readyState < 2) return
        ctx.drawImage(video, 0, 0, 480, 360)
      }

      const b64 = captureCanvas.toDataURL('image/jpeg', 0.6).split(',')[1]
      wsRef.current.send(JSON.stringify({ type: 'frame', image: b64 }))
    }, FRAME_INTERVAL)
  }, [videoRef])

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width:640, height:480 }, audio:false })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      setStatus('active')
      connectWS()
      startDraw()
      startFrameSender('laptop')
    } catch (err) {
      console.error('[CAM]', err)
      setStatus('error')
    }
  }, [connectWS, startDraw, startFrameSender])

  // IP Webcam mode — phone camera via IP Webcam app
  const startIPWebcam = useCallback(() => {
    const baseUrl = `http://${ipUrl}:8080`
    // Create hidden img that refreshes from IP webcam MJPEG stream
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    imgRef.current = img

    // Test connection first
    const testImg = new window.Image()
    testImg.onload = () => {
      setStatus('active')
      connectWS()

      // Draw loop using IP webcam snapshot endpoint
      const canvas = canvasRef.current
      const drawLoop = () => {
        if (!canvas) return
        const W = 640, H = 480
        canvas.width = W; canvas.height = H
        const ctx = canvas.getContext('2d')

        const snap = new window.Image()
        snap.crossOrigin = 'anonymous'
        snap.onload = () => {
          ctx.drawImage(snap, 0, 0, W, H)
          imgRef.current = snap

          // Boxes
          boxesRef.current.forEach(d => {
            const x1=d.bbox[0], y1=d.bbox[1], x2=d.bbox[2], y2=d.bbox[3]
            const color = d.color || '#00ff88'
            ctx.strokeStyle = color; ctx.lineWidth = 2.5
            ctx.strokeRect(x1, y1, x2-x1, y2-y1)
            const label = `${d.class.toUpperCase()} ${(d.confidence*100).toFixed(0)}%`
            ctx.font = 'bold 13px monospace'
            const tw = ctx.measureText(label).width
            ctx.fillStyle = color+'dd'; ctx.fillRect(x1, y1-24, tw+10, 22)
            ctx.fillStyle = '#fff'; ctx.fillText(label, x1+5, y1-6)
          })

          // HUD
          ctx.fillStyle='rgba(0,255,136,0.6)'; ctx.font='9px monospace'
          ctx.fillText(new Date().toLocaleTimeString('en-IN',{hour12:false}), 6, H-6)
          ctx.fillText(`OmniRover | IP CAM`, W-110, H-6)

          fpsCount.current++
          const now = Date.now()
          if (now - fpsTimer.current >= 1000) { setFps(fpsCount.current); fpsCount.current=0; fpsTimer.current=now }
        }
        snap.src = `${baseUrl}/shot.jpg?t=${Date.now()}`
        rafRef.current = setTimeout(drawLoop, 100)
      }
      drawLoop()
      startFrameSender('ipwebcam')
    }
    testImg.onerror = () => {
      setStatus('error')
      alert(`Cannot connect to IP Webcam at ${baseUrl}\nMake sure:\n1. IP Webcam app is running on phone\n2. Phone and laptop on same WiFi\n3. IP address is correct`)
    }
    testImg.src = `${baseUrl}/shot.jpg?t=${Date.now()}`
  }, [ipUrl, connectWS, startFrameSender])

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    clearTimeout(rafRef.current)
    clearInterval(frameTimer.current)
    wsRef.current?.close()
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    imgRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    boxesRef.current = []
    setStatus('idle')
    setDetections([])
    setRisk('SAFE')
    setWsStatus('offline')
  }, [])

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current)
    clearInterval(frameTimer.current)
    wsRef.current?.close()
    streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  const riskColor = risk === 'CRITICAL' ? '#ff2d2d' : risk === 'WARNING' ? '#ffaa00' : '#00ff88'
  const riskBg    = risk === 'CRITICAL' ? 'rgba(255,45,45,0.15)' : risk === 'WARNING' ? 'rgba(255,170,0,0.1)' : 'rgba(0,255,136,0.05)'

  return (
    <div className="bg-army-panel rounded-lg border border-army-border p-4 flex flex-col gap-3">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold tracking-widest text-gray-400">CAMERA — AI DETECTION</span>
          <span className={`text-xs font-mono px-2 py-0.5 rounded border ${wsStatus === 'online' ? 'text-army-accent border-army-accent/40' : 'text-gray-600 border-gray-700'}`}>
            {wsStatus === 'online' ? '● YOLO CONNECTED' : '○ YOLO OFFLINE'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Risk badge */}
          <span className={`text-xs font-bold font-mono px-3 py-1 rounded border ${risk === 'CRITICAL' ? 'text-red-400 border-red-500/50 flash-alert' : risk === 'WARNING' ? 'text-yellow-400 border-yellow-400/50' : 'text-green-400 border-green-400/30'}`}
            style={{ background: riskBg }}>
            ● {risk}
          </span>
          {status === 'active'
            ? <button onClick={stopCamera} className="text-xs px-3 py-1 rounded border border-red-500/40 text-red-400 font-mono hover:bg-red-500/10 transition-colors">■ STOP</button>
            : <button onClick={mode === 'ipwebcam' ? startIPWebcam : startCamera} className="text-xs px-3 py-1 rounded border border-army-accent/40 text-army-accent font-mono hover:bg-army-accent/10 transition-colors">▶ START</button>
          }
        </div>
      </div>

      <div className="flex gap-3 flex-col lg:flex-row">
        {/* Camera canvas */}
        <div className="flex-1 relative rounded overflow-hidden border border-army-border bg-black" style={{ minHeight: '300px' }}>
          <video ref={videoRef} style={{ display:'none' }} muted playsInline />
          <canvas ref={canvasRef} className="w-full h-full object-contain" style={{ display: status === 'active' ? 'block' : 'none' }} />

          {status === 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-army-dark">
              <div className="text-5xl">📷</div>
              <div className="text-xs font-mono text-gray-500 tracking-widest">CAMERA OFFLINE</div>

              {/* Mode selector */}
              <div className="flex gap-2">
                <button onClick={() => setMode('laptop')}
                  className="text-xs px-4 py-2 rounded border font-mono transition-colors"
                  style={{ borderColor: mode==='laptop'?'#00ff88':'#374151', color: mode==='laptop'?'#00ff88':'#6b7280', background: mode==='laptop'?'rgba(0,255,136,0.1)':'transparent' }}>
                  💻 LAPTOP CAM
                </button>
                <button onClick={() => setMode('ipwebcam')}
                  className="text-xs px-4 py-2 rounded border font-mono transition-colors"
                  style={{ borderColor: mode==='ipwebcam'?'#00ff88':'#374151', color: mode==='ipwebcam'?'#00ff88':'#6b7280', background: mode==='ipwebcam'?'rgba(0,255,136,0.1)':'transparent' }}>
                  📱 PHONE CAM
                </button>
              </div>

              {/* IP input for phone mode */}
              {mode === 'ipwebcam' && (
                <div className="flex flex-col items-center gap-2 w-full px-8">
                  <div className="text-xs font-mono text-gray-500">Enter phone IP (from IP Webcam app)</div>
                  <div className="flex gap-2 items-center">
                    <span className="text-xs font-mono text-gray-600">http://</span>
                    <input
                      value={ipUrl}
                      onChange={e => setIpUrl(e.target.value)}
                      placeholder="192.168.1.5"
                      className="text-xs font-mono bg-transparent border border-gray-700 rounded px-2 py-1 text-army-accent w-36 text-center"
                    />
                    <span className="text-xs font-mono text-gray-600">:8080</span>
                  </div>
                  <div className="text-xs font-mono text-gray-700 text-center">
                    Install "IP Webcam" app → Start server → copy IP shown
                  </div>
                </div>
              )}

              <button
                onClick={mode === 'ipwebcam' ? startIPWebcam : startCamera}
                className="text-sm px-6 py-2 rounded border border-army-accent/50 text-army-accent font-mono hover:bg-army-accent/10 transition-colors">
                ▶ ACTIVATE {mode === 'ipwebcam' ? 'PHONE' : 'LAPTOP'} CAMERA
              </button>

              {wsStatus === 'offline' && (
                <div className="text-xs font-mono text-yellow-500 text-center px-4">
                  Start YOLO: <span className="text-army-accent">cd server/yolo && python app.py</span>
                </div>
              )}
            </div>
          )}

          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-army-dark">
              <div className="text-4xl">⚠️</div>
              <div className="text-xs font-mono text-red-400">CAMERA ACCESS DENIED</div>
              <div className="text-xs font-mono text-gray-600 text-center px-6">Allow camera in browser → lock icon → Camera → Allow → refresh</div>
            </div>
          )}

          {/* Detection count */}
          {status === 'active' && detections.length > 0 && (
            <div className="absolute top-2 left-2 rounded px-2 py-1 border border-red-500/60 bg-black/80 flash-alert">
              <span className="text-xs font-mono text-red-400 font-bold">⚠ {detections.length} OBJECT{detections.length > 1 ? 'S' : ''} DETECTED</span>
            </div>
          )}
        </div>

        {/* Detection log */}
        <div className="w-full lg:w-48 flex flex-col gap-2 flex-shrink-0">
          <div className="text-xs font-mono text-gray-600 tracking-widest">DETECTION LOG</div>
          <div className="flex-1 overflow-y-auto flex flex-col gap-2" style={{ maxHeight: '300px' }}>
            {log.length === 0 && (
              <div className="text-xs font-mono text-gray-700 leading-relaxed">
                No detections.<br/>Start camera to<br/>begin scanning.
              </div>
            )}
            {log.map((entry, i) => (
              <div key={i} className="rounded border p-2 text-xs font-mono"
                style={{ borderColor: entry.risk === 'CRITICAL' ? '#ff2d2d44' : entry.risk === 'WARNING' ? '#ffaa0044' : '#00ff8822', background: 'rgba(255,255,255,0.02)' }}>
                <div className="font-bold" style={{ color: entry.risk === 'CRITICAL' ? '#ff2d2d' : entry.risk === 'WARNING' ? '#ffaa00' : '#00ff88' }}>
                  ● {entry.risk}
                </div>
                <div className="text-gray-400 mt-0.5 leading-relaxed">{entry.text}</div>
                <div className="text-gray-600 mt-0.5">{entry.time}</div>
              </div>
            ))}
          </div>

          {/* Detection tags */}
          {detections.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1 border-t border-gray-800">
              {detections.map((d, i) => (
                <span key={i} className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ color: d.color, background: d.color + '22', border: `1px solid ${d.color}44` }}>
                  {d.class} {(d.confidence*100).toFixed(0)}%
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

