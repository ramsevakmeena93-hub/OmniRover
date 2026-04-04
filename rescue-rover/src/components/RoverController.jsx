import React, { useState, useEffect, useRef, useCallback } from "react"

const PATROL = [
  { cmd:"FORWARD", ms:2500, icon:"▲" },
  { cmd:"RIGHT",   ms:700,  icon:"↻" },
  { cmd:"FORWARD", ms:2500, icon:"▲" },
  { cmd:"LEFT",    ms:700,  icon:"↺" },
  { cmd:"FORWARD", ms:2000, icon:"▲" },
  { cmd:"LEFT",    ms:700,  icon:"↺" },
  { cmd:"FORWARD", ms:2500, icon:"▲" },
  { cmd:"RIGHT",   ms:700,  icon:"↻" },
]

const C = { accent:"#00ff88", danger:"#ff2d2d", warn:"#ffaa00", blue:"#0ea5e9", panel:"#111827", border:"#1f2937" }

export default function RoverController({ sensorData }) {
  const [mode, setMode] = useState("MANUAL")
  const [cmd, setCmd] = useState("STOP")
  const [speed, setSpeed] = useState(100) // Changed default speed to 100
  const [camAngle, setCamAngle] = useState(90)
  const [lights, setLights] = useState(false)
  const [horn, setHorn] = useState(false)
  const [log, setLog] = useState([])
  const [step, setStep] = useState(0)
  const timerRef = useRef(null)
  
  const sensorRef = useRef(sensorData)
  useEffect(() => { sensorRef.current = sensorData }, [sensorData])
  const autoState = useRef({ phase: "DRIVING", distLeft: 0, distRight: 0, label: "OBSTACLE AVOIDANCE ACTIVE" })
  const [autoStatus, setAutoStatus] = useState("OBSTACLE AVOIDANCE ACTIVE")

  const send = useCallback((c, src="btn") => {
    setCmd(c)
    const t = new Date().toLocaleTimeString("en-IN", { hour12: false })
    setLog(l => [{ c, speed, src, t }, ...l].slice(0, 25))

    const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000'
    fetch(`${API_URL}/api/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cmd: c, speed, angle: camAngle })
    }).catch(err => console.error("Control API Error:", err))
  }, [speed, camAngle])

  useEffect(() => {
    const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5000'
    fetch(`${API_URL}/api/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cmd: mode === "MANUAL" ? cmd : "NONE", speed, angle: camAngle })
    }).catch(err => console.error("Control API Error:", err))
  }, [camAngle])

  useEffect(() => {
    if (mode !== "MANUAL") return
    const map = { ArrowUp:"FORWARD", ArrowDown:"BACKWARD", ArrowLeft:"LEFT", ArrowRight:"RIGHT", " ":"STOP", q:"ROTATE_L", e:"ROTATE_R" }
    const dn = ev => { if (map[ev.key]) { ev.preventDefault(); send(map[ev.key], "key") } }
    const up = ev => { if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","q","e"].includes(ev.key)) send("STOP","key") }
    window.addEventListener("keydown", dn); window.addEventListener("keyup", up)
    return () => { window.removeEventListener("keydown", dn); window.removeEventListener("keyup", up) }
  }, [mode, send])

  useEffect(() => {
    if (mode !== "AUTO") {
      clearTimeout(timerRef.current)
      autoState.current.phase = "DRIVING"
      return
    }
    
    const run = () => {
      const data = sensorRef.current
      const frontDist = data?.ultrasonic1 ?? data?.distance ?? 999
      let nextDelay = 150
      
      switch (autoState.current.phase) {
        case "DRIVING":
          if (frontDist < 40) {
            send("STOP", "auto")
            autoState.current.phase = "LOOK_LEFT"
            autoState.current.label = "OBSTACLE! SCANNING LEFT..."
            nextDelay = 200 // Faster stop
          } else {
            send("FORWARD", "auto")
            autoState.current.label = "DRIVING FORWARD"
            if (camAngle !== 90) setCamAngle(90) // Only center if not already
            nextDelay = 150 // Rapid forward loop
          }
          break
          
        case "LOOK_LEFT":
          setCamAngle(180) // Look left
          autoState.current.phase = "READ_LEFT"
          nextDelay = 400 // Wait for fast servo & sensor sync
          break

        case "READ_LEFT":
          autoState.current.distLeft = frontDist
          setCamAngle(0) // Look right
          autoState.current.phase = "READ_RIGHT"
          autoState.current.label = "SCANNING RIGHT..."
          nextDelay = 400
          break

        case "READ_RIGHT":
          autoState.current.distRight = frontDist
          setCamAngle(90) // Center
          autoState.current.phase = "DECIDE"
          autoState.current.label = "DECIDING ROUTE..."
          nextDelay = 250
          break

        case "DECIDE":
          const { distLeft, distRight } = autoState.current
          if (distLeft < 30 && distRight < 30) {
            send("BACKWARD", "auto")
            autoState.current.phase = "BACKING_UP"
            autoState.current.label = "BLOCKED! REVERSING..."
            nextDelay = 500
          } else if (distLeft > distRight) {
            send("LEFT", "auto")
            autoState.current.phase = "TURNING"
            autoState.current.label = "TURNING LEFT..."
            nextDelay = 350
          } else {
            send("RIGHT", "auto")
            autoState.current.phase = "TURNING"
            autoState.current.label = "TURNING RIGHT..."
            nextDelay = 350
          }
          break

        case "BACKING_UP":
          send("RIGHT", "auto")
          autoState.current.phase = "TURNING"
          autoState.current.label = "REPOSITIONING..."
          nextDelay = 400
          break

        case "TURNING":
          send("STOP", "auto")
          autoState.current.phase = "DRIVING"
          autoState.current.label = "OBSTACLE CLEARED"
          nextDelay = 150
          break
      }
      
      setAutoStatus(autoState.current.label)
      timerRef.current = setTimeout(run, nextDelay)
    }
    
    run()
    return () => clearTimeout(timerRef.current)
  }, [mode, send, camAngle])

  const press = c => () => { if (mode === "MANUAL") send(c) }
  const release = () => { if (mode === "MANUAL") send("STOP") }
  const estop = () => { clearTimeout(timerRef.current); setMode("STANDBY"); send("STOP") }

  const btnS = (c) => ({
    width:80, height:80, borderRadius:12,
    border:`2px solid ${cmd===c?C.accent:C.border}`,
    color: cmd===c?C.accent:"#4b5563",
    background: cmd===c?"rgba(0,255,136,0.12)":"rgba(0,0,0,0.3)",
    fontSize:28, fontWeight:"bold", cursor:"pointer",
    transition:"all 0.1s", display:"flex", alignItems:"center",
    justifyContent:"center", flexDirection:"column",
    boxShadow: cmd===c?`0 0 18px rgba(0,255,136,0.5)`:"none",
    userSelect:"none", fontFamily:"monospace",
  })

  const modeColor = mode==="AUTO"?C.warn : mode==="MANUAL"?C.accent : C.danger

  return (
    <div style={{ background:C.panel, border:`1px solid ${C.border}`, borderRadius:10, padding:20, display:"flex", flexDirection:"column", gap:16, fontFamily:"monospace" }}>

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:"bold", letterSpacing:4, color:"#9ca3af" }}>NDRF · OMNI ROVER GROUND CONTROL STATION</div>
          <div style={{ fontSize:10, color:"#4b5563", marginTop:2 }}>Tactical Autonomous Rescue Unit · GCS v2.1</div>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {[["🕹 MANUAL","MANUAL",C.accent],["🤖 AUTO EXPLORE","AUTO",C.warn],["⚠ E-STOP","STANDBY",C.danger]].map(([label,m,col])=>(
            <button key={m} onClick={m==="STANDBY"?estop:()=>{setMode(m);if(m==="MANUAL")send("STOP")}}
              style={{ fontSize:11, padding:"7px 16px", borderRadius:6, border:`1.5px solid ${mode===m?col:C.border}`, color:mode===m?col:"#6b7280", background:mode===m?col+"18":"transparent", cursor:"pointer", fontWeight:"bold", letterSpacing:1, fontFamily:"monospace", boxShadow:mode===m?`0 0 12px ${col}44`:"none" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ borderRadius:6, border:`1px solid ${modeColor}44`, background:modeColor+"0a", padding:"9px 16px", textAlign:"center", fontSize:11, fontWeight:"bold", letterSpacing:2, color:modeColor }}>
        {mode==="AUTO" ? `🤖 AUTO EXPLORE · ${autoStatus}`
         : mode==="MANUAL" ? `🕹 MANUAL CONTROL · SPEED ${speed}% · CAMERA ${camAngle}° · LIGHTS ${lights?"ON":"OFF"}`
         : "⚠ STANDBY — EMERGENCY STOP ENGAGED · ALL MOTORS HALTED"}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"auto 1fr auto", gap:20 }}>

        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8 }}>
          <div style={{ fontSize:10, color:"#4b5563", letterSpacing:3, marginBottom:4 }}>MOVEMENT</div>
          <button style={btnS("FORWARD")} onMouseDown={press("FORWARD")} onMouseUp={release} onTouchStart={press("FORWARD")} onTouchEnd={release} disabled={mode!=="MANUAL"}>
            ▲<span style={{fontSize:9,color:"#4b5563",marginTop:2}}>↑ FWD</span>
          </button>
          <div style={{ display:"flex", gap:8 }}>
            <button style={btnS("LEFT")} onMouseDown={press("LEFT")} onMouseUp={release} onTouchStart={press("LEFT")} onTouchEnd={release} disabled={mode!=="MANUAL"}>
              ◄<span style={{fontSize:9,color:"#4b5563",marginTop:2}}>← LEFT</span>
            </button>
            <button onClick={estop} style={{ width:80, height:80, borderRadius:12, border:`2px solid ${C.danger}`, color:C.danger, background:"rgba(255,45,45,0.15)", fontSize:22, fontWeight:"bold", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", boxShadow:`0 0 18px rgba(255,45,45,0.4)`, fontFamily:"monospace" }}>
              ■<span style={{fontSize:9,marginTop:2}}>E-STOP</span>
            </button>
            <button style={btnS("RIGHT")} onMouseDown={press("RIGHT")} onMouseUp={release} onTouchStart={press("RIGHT")} onTouchEnd={release} disabled={mode!=="MANUAL"}>
              ►<span style={{fontSize:9,color:"#4b5563",marginTop:2}}>RIGHT →</span>
            </button>
          </div>
          <button style={btnS("BACKWARD")} onMouseDown={press("BACKWARD")} onMouseUp={release} onTouchStart={press("BACKWARD")} onTouchEnd={release} disabled={mode!=="MANUAL"}>
            ▼<span style={{fontSize:9,color:"#4b5563",marginTop:2}}>↓ REV</span>
          </button>
          <div style={{ display:"flex", gap:8, marginTop:4 }}>
            {[["↺ Q","ROTATE_L"],["ROTATE_R ↻","ROTATE_R"]].map(([lbl,c])=>(
              <button key={c} onMouseDown={press(c)} onMouseUp={release} disabled={mode!=="MANUAL"}
                style={{ padding:"7px 12px", borderRadius:6, border:`1.5px solid ${cmd===c?C.warn:C.border}`, color:cmd===c?C.warn:"#6b7280", background:cmd===c?C.warn+"18":"transparent", fontSize:10, fontWeight:"bold", cursor:"pointer", fontFamily:"monospace" }}>
                {lbl}
              </button>
            ))}
          </div>
          <div style={{ marginTop:8, position:"relative", width:120, height:120 }}>
            <div style={{ position:"absolute", inset:30, borderRadius:8, border:`2px solid ${C.accent}44`, background:C.accent+"08", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ fontSize:11, color:C.accent, fontWeight:"bold" }}>R1</span>
            </div>
            {[
              { val:sensorData?.ultrasonic1??sensorData?.distance, pos:{top:2,left:"50%",transform:"translateX(-50%)"} },
              { val:sensorData?.ultrasonic2, pos:{top:"50%",left:2,transform:"translateY(-50%)"} },
              { val:sensorData?.ultrasonic3, pos:{top:"50%",right:2,transform:"translateY(-50%)"} },
            ].map((u,i)=>{
              const v = u.val??999; const col = v<80?C.danger:C.accent
              return <div key={i} style={{ position:"absolute", ...u.pos, fontSize:9, fontWeight:"bold", color:col, fontFamily:"monospace" }}>{v==="999"||v===999?"--":v}cm</div>
            })}
          </div>
          <div style={{ fontSize:9, color:"#374151", textAlign:"center" }}>↑FRONT ←LEFT RIGHT→</div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div style={{ fontSize:10, color:"#4b5563", letterSpacing:3 }}>SYSTEMS CONTROL</div>
          <div style={{ background:"rgba(0,0,0,0.3)", borderRadius:8, border:`1px solid ${C.border}`, padding:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, marginBottom:8 }}>
              <span style={{ color:"#6b7280" }}>DRIVE SPEED</span>
              <span style={{ color:speed>70?C.danger:speed>40?C.warn:C.accent, fontWeight:"bold" }}>{speed}%</span>
            </div>
            <input type="range" min="10" max="100" step="10" value={speed} onChange={e=>setSpeed(+e.target.value)} style={{ width:"100%", accentColor:C.accent }} />
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:9, color:"#374151", marginTop:4 }}>
              <span>SLOW</span><span>MEDIUM</span><span>FAST</span>
            </div>
          </div>
          <div style={{ background:"rgba(0,0,0,0.3)", borderRadius:8, border:`1px solid ${C.border}`, padding:12 }}>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, marginBottom:8 }}>
              <span style={{ color:"#6b7280" }}>CAMERA PAN SERVO</span>
              <span style={{ color:C.blue, fontWeight:"bold" }}>{camAngle}°</span>
            </div>
            <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
              <button disabled={mode!=="MANUAL"} onClick={() => setCamAngle(a => Math.min(180, a + 15))} style={{ padding:"6px", borderRadius:6, border:`1.5px solid ${C.border}`, background: "transparent", color: "#6b7280", flex: 1, fontSize: 10, fontWeight: "bold", fontFamily: "monospace", cursor: mode==="MANUAL"?"pointer":"not-allowed" }}>◄ LEFT</button>
              <button disabled={mode!=="MANUAL"} onClick={() => setCamAngle(90)} style={{ padding:"6px", borderRadius:6, border:`1.5px solid ${C.border}`, background: "transparent", color: "#6b7280", flex: 1, fontSize: 10, fontWeight: "bold", fontFamily: "monospace", cursor: mode==="MANUAL"?"pointer":"not-allowed" }}>CENTER</button>
              <button disabled={mode!=="MANUAL"} onClick={() => setCamAngle(a => Math.max(0, a - 15))} style={{ padding:"6px", borderRadius:6, border:`1.5px solid ${C.border}`, background: "transparent", color: "#6b7280", flex: 1, fontSize: 10, fontWeight: "bold", fontFamily: "monospace", cursor: mode==="MANUAL"?"pointer":"not-allowed" }}>RIGHT ►</button>
            </div>
            <input type="range" min="0" max="180" step="5" value={camAngle} onChange={e=>setCamAngle(+e.target.value)} disabled={mode!=="MANUAL"} style={{ width:"100%", accentColor:C.blue }} />
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <button onClick={()=>setLights(l=>!l)} style={{ padding:"10px 8px", borderRadius:8, border:`1.5px solid ${lights?C.warn:C.border}`, color:lights?C.warn:"#6b7280", background:lights?C.warn+"18":"transparent", fontSize:11, fontWeight:"bold", cursor:"pointer", fontFamily:"monospace", boxShadow:lights?`0 0 8px ${C.warn}44`:"none" }}>
              💡 {lights?"LIGHTS ON":"LIGHTS OFF"}
            </button>
            <button onMouseDown={()=>setHorn(true)} onMouseUp={()=>setHorn(false)} style={{ padding:"10px 8px", borderRadius:8, border:`1.5px solid ${horn?C.danger:C.border}`, color:horn?C.danger:"#6b7280", background:horn?C.danger+"18":"transparent", fontSize:11, fontWeight:"bold", cursor:"pointer", fontFamily:"monospace", boxShadow:horn?`0 0 8px ${C.danger}44`:"none" }}>
              📢 {horn?"HORN ACTIVE":"HORN"}
            </button>
          </div>
          {mode==="AUTO" && (
            <div style={{ background:"rgba(0,0,0,0.3)", borderRadius:8, border:`1px solid ${C.warn}33`, padding:12 }}>
              <div style={{ fontSize:10, color:C.warn, marginBottom:8, letterSpacing:2 }}>AUTONOMOUS LOGIC STATE</div>
              <div style={{ display:"flex", justifyContent:"center", fontWeight:"bold", color:C.warn, background:"rgba(255, 170, 0, 0.15)", padding:"12px", borderRadius:"6px" }}>
                {autoStatus}
              </div>
            </div>
          )}
          <div style={{ background:"rgba(0,0,0,0.2)", borderRadius:6, border:`1px solid ${C.border}`, padding:10, fontSize:9, color:"#374151" }}>
            <div style={{ color:"#4b5563", marginBottom:4, letterSpacing:2 }}>KEYBOARD SHORTCUTS</div>
            {[["↑↓←→","Move"],["Q / E","Rotate L/R"],["SPACE","Stop"]].map(([k,v])=>(
              <div key={k} style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                <span style={{ color:"#6b7280" }}>{k}</span><span>{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:12, minWidth:190 }}>
          <div style={{ fontSize:10, color:"#4b5563", letterSpacing:3 }}>LIVE TELEMETRY</div>
          <div style={{ background:"rgba(0,0,0,0.3)", borderRadius:8, border:`1px solid ${C.border}`, padding:12, display:"flex", flexDirection:"column", gap:8 }}>
            {[
              ["TEMP",  sensorData?.temperature, "°C",  40,  "#ff6b35", false],
              ["GAS",   sensorData?.gas,          "ppm", 300, "#a855f7", false],
              ["FRONT", sensorData?.ultrasonic1??sensorData?.distance, "cm", 80, C.blue, true],
              ["LEFT",  sensorData?.ultrasonic2,  "cm",  80,  C.blue, true],
              ["RIGHT", sensorData?.ultrasonic3,  "cm",  80,  C.blue, true],
            ].map(([lbl,val,unit,thresh,col,inv])=>{
              const v = val??0
              const danger = inv ? v<thresh : v>thresh
              const pct = Math.min(100, inv ? ((400-v)/400)*100 : (v/thresh)*100)
              return (
                <div key={lbl}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, marginBottom:3 }}>
                    <span style={{ color:"#6b7280" }}>{lbl}</span>
                    <span style={{ color:danger?C.danger:col, fontWeight:"bold" }}>{val??"-"}{unit}</span>
                  </div>
                  <div style={{ height:4, background:"#1f2937", borderRadius:2, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${pct}%`, background:danger?C.danger:col, borderRadius:2, transition:"width 0.5s" }} />
                  </div>
                </div>
              )
            })}
            <div style={{ display:"flex", gap:6, marginTop:4 }}>
              {[["HUMAN",sensorData?.humanDetected,"#00ff88"],["FIRE",sensorData?.smokeDetected,"#ff2d2d"]].map(([lbl,active,col])=>(
                <div key={lbl} style={{ flex:1, textAlign:"center", padding:"4px 0", borderRadius:4, border:`1px solid ${active?col:C.border}`, fontSize:9, fontWeight:"bold", color:active?col:"#374151", background:active?col+"18":"transparent" }}>
                  {active?"●":" "} {lbl}
                </div>
              ))}
            </div>
          </div>
          <div style={{ fontSize:10, color:"#4b5563", letterSpacing:3 }}>COMMAND LOG</div>
          <div style={{ flex:1, overflowY:"auto", maxHeight:200, background:"rgba(0,0,0,0.3)", borderRadius:8, border:`1px solid ${C.border}`, padding:8, display:"flex", flexDirection:"column", gap:4 }}>
            {log.length===0 && <div style={{ fontSize:10, color:"#374151", padding:4 }}>Awaiting commands...</div>}
            {log.map((l,i)=>(
              <div key={i} style={{ display:"flex", gap:6, fontSize:10, borderBottom:`1px solid ${C.border}44`, paddingBottom:3 }}>
                <span style={{ color:"#374151" }}>{l.t}</span>
                <span style={{ fontWeight:"bold", color:l.c==="STOP"?C.danger:l.src==="auto"?C.warn:C.accent, background:(l.c==="STOP"?C.danger:l.src==="auto"?C.warn:C.accent)+"22", padding:"0 4px", borderRadius:3 }}>{l.c}</span>
                <span style={{ color:"#4b5563", marginLeft:"auto", fontSize:9 }}>[{l.src}]</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:10, display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:8, fontSize:10 }}>
        <div style={{ display:"flex", gap:16 }}>
          <span style={{ color:"#374151" }}>HW: <span style={{ color:"#4b5563" }}>ws://ROVER_IP:8080</span></span>
          <span style={{ color:"#374151" }}>SPD: <span style={{ color:C.accent }}>{speed}%</span></span>
          <span style={{ color:"#374151" }}>CAM: <span style={{ color:C.blue }}>{camAngle}°</span></span>
          <span style={{ color:"#374151" }}>LIGHTS: <span style={{ color:lights?C.warn:"#4b5563" }}>{lights?"ON":"OFF"}</span></span>
        </div>
        <div style={{ color:"#374151" }}>NDRF · OmniRover GCS · <span style={{ color:modeColor }}>{mode}</span></div>
      </div>
    </div>
  )
}
