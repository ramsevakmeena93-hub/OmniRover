import React, { useEffect, useRef, useState } from "react"
import Map from "ol/Map"
import View from "ol/View"
import TileLayer from "ol/layer/Tile"
import VectorLayer from "ol/layer/Vector"
import VectorSource from "ol/source/Vector"
import XYZ from "ol/source/XYZ"
import Feature from "ol/Feature"
import Point from "ol/geom/Point"
import LineString from "ol/geom/LineString"
import { fromLonLat } from "ol/proj"
import { Style, Fill, Stroke, Text, RegularShape, Circle as OLCircle } from "ol/style"
import "ol/ol.css"

const STEP = 0.000025

const PIN_CFG = {
  human:  { color: "#ff2d2d", label: "H", name: "HUMAN"  },
  smoke:  { color: "#ff6b00", label: "F", name: "FIRE"   },
  gas:    { color: "#a855f7", label: "G", name: "GAS"    },
  debris: { color: "#f59e0b", label: "D", name: "DEBRIS" },
}

function roverStyle(risk) {
  const c = risk === "DANGER" ? "#ff2d2d" : risk === "WARNING" ? "#ffaa00" : "#00ff88"
  return [
    new Style({ image: new OLCircle({ radius: 12, fill: new Fill({ color: c + "22" }), stroke: new Stroke({ color: c, width: 1.5 }) }) }),
    new Style({
      image: new OLCircle({ radius: 5, fill: new Fill({ color: c }) }),
      text: new Text({ text: "ROVER", offsetY: -18, font: "bold 9px monospace", fill: new Fill({ color: c }), stroke: new Stroke({ color: "#000", width: 2 }) }),
    }),
  ]
}

function youStyle() {
  return new Style({
    image: new OLCircle({ radius: 7, fill: new Fill({ color: "#3b82f6" }), stroke: new Stroke({ color: "#fff", width: 2 }) }),
    text: new Text({ text: "YOU", offsetY: -16, font: "bold 9px monospace", fill: new Fill({ color: "#60a5fa" }), stroke: new Stroke({ color: "#000", width: 2 }) }),
  })
}

function pinStyle(type) {
  const cfg = PIN_CFG[type]
  return new Style({
    image: new RegularShape({ points: 3, radius: 8, angle: 0, fill: new Fill({ color: cfg.color }), stroke: new Stroke({ color: "#000", width: 1 }) }),
    text: new Text({ text: cfg.label, font: "bold 8px monospace", fill: new Fill({ color: "#fff" }), offsetY: 0.5 }),
  })
}

function trailStyle() {
  return new Style({ stroke: new Stroke({ color: "#00ff8855", width: 1.5, lineDash: [5, 4] }) })
}

export default function LiveMap({ risk, sensorData }) {
  const mapDiv = useRef(null)
  const mapObj = useRef(null)
  const vsMarker = useRef(new VectorSource())
  const vsTrail  = useRef(new VectorSource())
  const vsPin    = useRef(new VectorSource())
  const roverFeat = useRef(null)
  const youFeat   = useRef(null)
  const trailFeat = useRef(null)
  const trailPts  = useRef([])
  const pinKeys   = useRef(new Set())
  const roverRef  = useRef(null)
  const dirRef    = useRef({ dlat: 1, dlng: 0.6 })
  const tickRef   = useRef(0)
  const timerRef  = useRef(null)
  const sensorRef = useRef(sensorData)

  const [userPos,  setUserPos]  = useState(null)
  const [roverPos, setRoverPos] = useState(null)
  const [geoStatus, setGeoStatus] = useState("requesting")
  const [accuracy,  setAccuracy]  = useState(null)
  const [log,   setLog]   = useState([])
  const [total, setTotal] = useState(0)

  // Always keep sensorRef fresh
  useEffect(() => { sensorRef.current = sensorData }, [sensorData])

  // Real GPS
  useEffect(() => {
    if (!navigator.geolocation) { setGeoStatus("denied"); return }
    const id = navigator.geolocation.watchPosition(pos => {
      const p = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      setUserPos(p)
      setAccuracy(Math.round(pos.coords.accuracy))
      setGeoStatus("granted")
      if (!roverRef.current) {
        const r = { lat: p.lat + 0.0005, lng: p.lng + 0.0004 }
        roverRef.current = r
        setRoverPos({ ...r })
      }
    }, () => setGeoStatus("denied"),
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 })
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  // Init map once
  useEffect(() => {
    if (mapObj.current || !mapDiv.current) return
    mapObj.current = new Map({
      target: mapDiv.current,
      layers: [
        new TileLayer({ source: new XYZ({ url: "https://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", attributions: "© OSM © CARTO" }) }),
        new VectorLayer({ source: vsTrail.current }),
        new VectorLayer({ source: vsPin.current }),
        new VectorLayer({ source: vsMarker.current }),
      ],
      view: new View({ center: fromLonLat([78.1828, 26.2183]), zoom: 17 }),
      controls: [],
    })
  }, [])

  // Pan to user on first GPS fix
  useEffect(() => {
    if (!userPos || !mapObj.current) return
    mapObj.current.getView().animate({ center: fromLonLat([userPos.lng, userPos.lat]), zoom: 18, duration: 700 })
  }, [!!userPos])

  // Update YOU marker
  useEffect(() => {
    if (!userPos) return
    const coord = fromLonLat([userPos.lng, userPos.lat])
    if (!youFeat.current) {
      youFeat.current = new Feature(new Point(coord))
      youFeat.current.setStyle(youStyle())
      vsMarker.current.addFeature(youFeat.current)
    } else {
      youFeat.current.getGeometry().setCoordinates(coord)
    }
  }, [userPos])

  // Rover patrol loop — starts once GPS arrives
  useEffect(() => {
    if (!roverPos || timerRef.current) return
    timerRef.current = setInterval(() => {
      tickRef.current++
      // Change direction every 15 steps for natural patrol sweep
      if (tickRef.current % 15 === 0) {
        const a = Math.random() * Math.PI * 2
        dirRef.current = { dlat: Math.cos(a), dlng: Math.sin(a) }
      }
      const prev = roverRef.current
      const next = { lat: prev.lat + dirRef.current.dlat * STEP, lng: prev.lng + dirRef.current.dlng * STEP }
      roverRef.current = next
      setRoverPos({ ...next })

      const coord = fromLonLat([next.lng, next.lat])

      // Rover marker
      if (!roverFeat.current) {
        roverFeat.current = new Feature(new Point(coord))
        roverFeat.current.setStyle(roverStyle(risk))
        vsMarker.current.addFeature(roverFeat.current)
      } else {
        roverFeat.current.getGeometry().setCoordinates(coord)
        roverFeat.current.setStyle(roverStyle(risk))
      }

      // Trail
      trailPts.current.push(coord)
      if (trailPts.current.length > 200) trailPts.current.shift()
      if (!trailFeat.current && trailPts.current.length > 1) {
        trailFeat.current = new Feature(new LineString([...trailPts.current]))
        trailFeat.current.setStyle(trailStyle())
        vsTrail.current.addFeature(trailFeat.current)
      } else if (trailFeat.current) {
        trailFeat.current.getGeometry().setCoordinates([...trailPts.current])
      }

      // ── DETECTION MARKERS — only from real sensor data ──
      const sd = sensorRef.current
      const drops = []
      if (sd?.humanDetected)          drops.push("human")
      if (sd?.smokeDetected)          drops.push("smoke")
      if ((sd?.gas ?? 0) > 300)       drops.push("gas")
      if (sd?.debrisDetected)         drops.push("debris")

      drops.forEach(type => {
        const key = `${type}_${next.lat.toFixed(4)}_${next.lng.toFixed(4)}`
        if (pinKeys.current.has(key)) return
        pinKeys.current.add(key)
        const f = new Feature(new Point(coord))
        f.setStyle(pinStyle(type))
        vsPin.current.addFeature(f)
        const t = new Date().toLocaleTimeString("en-IN", { hour12: false })
        setLog(l => [{ type, lat: next.lat.toFixed(5), lng: next.lng.toFixed(5), time: t }, ...l].slice(0, 12))
        setTotal(n => n + 1)
      })
    }, 1000)
    return () => { clearInterval(timerRef.current); timerRef.current = null }
  }, [!!roverPos])

  // Update rover color on risk change
  useEffect(() => { if (roverFeat.current) roverFeat.current.setStyle(roverStyle(risk)) }, [risk])

  const zoom = (d) => { const v = mapObj.current?.getView(); if (v) v.animate({ zoom: v.getZoom() + d, duration: 250 }) }
  const recenter = () => { if (roverRef.current && mapObj.current) mapObj.current.getView().animate({ center: fromLonLat([roverRef.current.lng, roverRef.current.lat]), zoom: 18, duration: 400 }) }
  const clearAll = () => { vsPin.current.clear(); pinKeys.current.clear(); setLog([]); setTotal(0) }

  const sc = geoStatus === "granted" ? "#00ff88" : geoStatus === "requesting" ? "#ffaa00" : "#ff2d2d"
  const st = geoStatus === "granted" ? `GPS ±${accuracy}m` : geoStatus === "requesting" ? "ACQUIRING..." : "GPS DENIED"

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:"10px", background:"#111827", borderRadius:"8px", border:"1px solid #1f2937", padding:"16px", boxSizing:"border-box" }}>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:"6px" }}>
        <span style={{ fontSize:"11px", fontWeight:"bold", letterSpacing:"3px", color:"#9ca3af", fontFamily:"monospace" }}>TACTICAL MAP — OmniRover</span>
        <div style={{ display:"flex", gap:"10px", fontSize:"10px", fontFamily:"monospace", flexWrap:"wrap", alignItems:"center" }}>
          <span style={{ color:"#60a5fa" }}>● YOU</span>
          <span style={{ color:"#00ff88" }}>● ROVER</span>
          {Object.entries(PIN_CFG).map(([k,v]) => <span key={k} style={{ color: v.color }}>▲ {v.name}</span>)}
          <span style={{ color: sc }}>● {st}</span>
        </div>
      </div>

      {geoStatus === "denied" && (
        <div style={{ fontSize:"11px", fontFamily:"monospace", color:"#f87171", background:"rgba(255,45,45,0.1)", border:"1px solid rgba(255,45,45,0.3)", borderRadius:"4px", padding:"8px 12px" }}>
          ⚠ Click lock icon in address bar → Location → Allow → refresh
        </div>
      )}

      <div style={{ display:"flex", gap:"10px" }}>

        {/* Map */}
        <div style={{ flex:1, position:"relative", borderRadius:"6px", overflow:"hidden", border:"1px solid #374151", height:"420px" }}>
          <div ref={mapDiv} style={{ width:"100%", height:"100%" }} />
          {/* Controls */}
          <div style={{ position:"absolute", bottom:"10px", right:"10px", display:"flex", flexDirection:"column", gap:"4px" }}>
            <button onClick={() => zoom(1)}  style={btnStyle("#00ff88")}>+</button>
            <button onClick={() => zoom(-1)} style={btnStyle("#00ff88")}>−</button>
            <button onClick={recenter}       style={btnStyle("#3b82f6")} title="Center on rover">⊕</button>
          </div>
          {/* Loading overlay */}
          {!userPos && (
            <div style={{ position:"absolute", inset:0, background:"#0a0e1a", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"12px" }}>
              <div style={{ width:"32px", height:"32px", border:"3px solid #1f2937", borderTop:"3px solid #00ff88", borderRadius:"50%", animation:"spin 1s linear infinite" }} />
              <span style={{ color:"#6b7280", fontSize:"11px", fontFamily:"monospace", letterSpacing:"2px" }}>
                {geoStatus === "denied" ? "GPS ACCESS DENIED" : "ACQUIRING GPS..."}
              </span>
            </div>
          )}
        </div>

        {/* Detection log */}
        <div style={{ width:"155px", display:"flex", flexDirection:"column", gap:"6px", flexShrink:0 }}>
          <div style={{ fontSize:"10px", fontFamily:"monospace", color:"#6b7280", letterSpacing:"2px" }}>DETECTION LOG</div>
          <div style={{ flex:1, overflowY:"auto", maxHeight:"340px", display:"flex", flexDirection:"column", gap:"3px" }}>
            {log.length === 0 && (
              <div style={{ fontSize:"10px", fontFamily:"monospace", color:"#374151", lineHeight:"1.8" }}>
                No detections.<br/>Connect hardware<br/>to see live data.
              </div>
            )}
            {log.map((d, i) => (
              <div key={i} style={{ background:"rgba(255,255,255,0.02)", border:`1px solid ${PIN_CFG[d.type]?.color}44`, borderRadius:"4px", padding:"4px 6px" }}>
                <div style={{ fontSize:"10px", fontFamily:"monospace", color: PIN_CFG[d.type]?.color, fontWeight:"bold" }}>▲ {PIN_CFG[d.type]?.name}</div>
                <div style={{ fontSize:"9px", fontFamily:"monospace", color:"#6b7280", marginTop:"1px" }}>{d.lat}</div>
                <div style={{ fontSize:"9px", fontFamily:"monospace", color:"#6b7280" }}>{d.lng}</div>
                <div style={{ fontSize:"9px", fontFamily:"monospace", color:"#4b5563", marginTop:"1px" }}>{d.time}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize:"10px", fontFamily:"monospace", color:"#6b7280", borderTop:"1px solid #1f2937", paddingTop:"5px" }}>
            TOTAL: <span style={{ color:"#ffaa00" }}>{total}</span>
          </div>
          <button onClick={clearAll} style={{ fontSize:"9px", fontFamily:"monospace", color:"#6b7280", background:"transparent", border:"1px solid #374151", borderRadius:"4px", padding:"4px", cursor:"pointer" }}>CLEAR LOG</button>
          {roverPos && (
            <div style={{ fontSize:"9px", fontFamily:"monospace", color:"#374151", borderTop:"1px solid #1f2937", paddingTop:"5px" }}>
              <div style={{ color:"#00ff88", marginBottom:"2px" }}>ROVER POS</div>
              <div>{roverPos.lat.toFixed(5)}</div>
              <div>{roverPos.lng.toFixed(5)}</div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function btnStyle(color) {
  return { width:"26px", height:"26px", background:"rgba(10,14,26,0.92)", border:`1px solid ${color}55`, color, fontSize:"15px", cursor:"pointer", borderRadius:"4px", fontFamily:"monospace", lineHeight:"1", display:"flex", alignItems:"center", justifyContent:"center" }
}

