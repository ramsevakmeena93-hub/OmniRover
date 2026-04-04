/**
 * Military-grade alert sound system
 * Real siren / alarm sounds using Web Audio API
 */
import { useRef, useCallback } from 'react'

export function useAlertSound() {
  const ctxRef = useRef(null)
  const lastAlertRef = useRef({})
  const activeSirenRef = useRef(null)

  function getCtx() {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume()
    }
    return ctxRef.current
  }

  // Wailing siren — rises and falls like a real emergency siren
  function playSiren(duration = 3, volume = 0.5) {
    try {
      const ctx = getCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const distortion = ctx.createWaveShaper()

      // Slight distortion for realism
      const curve = new Float32Array(256)
      for (let i = 0; i < 256; i++) {
        const x = (i * 2) / 256 - 1
        curve[i] = (Math.PI + 200) * x / (Math.PI + 200 * Math.abs(x))
      }
      distortion.curve = curve

      osc.connect(distortion)
      distortion.connect(gain)
      gain.connect(ctx.destination)

      osc.type = 'sawtooth'
      gain.gain.setValueAtTime(volume, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)

      // Wailing frequency sweep — up and down like a real siren
      const cycles = Math.floor(duration / 0.8)
      for (let i = 0; i < cycles; i++) {
        const t = ctx.currentTime + i * 0.8
        osc.frequency.setValueAtTime(600, t)
        osc.frequency.linearRampToValueAtTime(1200, t + 0.4)
        osc.frequency.linearRampToValueAtTime(600, t + 0.8)
      }

      osc.start(ctx.currentTime)
      osc.stop(ctx.currentTime + duration)
      return osc
    } catch (e) { console.warn('Audio error:', e) }
  }

  // Danger alarm — fast pulsing like a fire alarm
  function playDangerAlarm(duration = 2.5, volume = 0.55) {
    try {
      const ctx = getCtx()
      const pulseCount = Math.floor(duration / 0.25)

      for (let i = 0; i < pulseCount; i++) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.type = 'square'
        osc.frequency.value = i % 2 === 0 ? 960 : 800

        const t = ctx.currentTime + i * 0.25
        gain.gain.setValueAtTime(0, t)
        gain.gain.linearRampToValueAtTime(volume, t + 0.02)
        gain.gain.setValueAtTime(volume, t + 0.18)
        gain.gain.linearRampToValueAtTime(0, t + 0.23)

        osc.start(t)
        osc.stop(t + 0.25)
      }
    } catch (e) { console.warn('Audio error:', e) }
  }

  // Whoop whoop — like a police/military alert
  function playWhoop(volume = 0.45) {
    try {
      const ctx = getCtx()
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sawtooth'

        const t = ctx.currentTime + i * 0.5
        osc.frequency.setValueAtTime(400, t)
        osc.frequency.exponentialRampToValueAtTime(900, t + 0.3)
        osc.frequency.exponentialRampToValueAtTime(400, t + 0.45)

        gain.gain.setValueAtTime(volume, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.48)

        osc.start(t)
        osc.stop(t + 0.5)
      }
    } catch (e) { console.warn('Audio error:', e) }
  }

  // Gas leak hiss + alarm
  function playGasAlarm(volume = 0.4) {
    try {
      const ctx = getCtx()

      // Hiss noise
      const bufferSize = ctx.sampleRate * 1.5
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1

      const noise = ctx.createBufferSource()
      noise.buffer = buffer
      const noiseFilter = ctx.createBiquadFilter()
      noiseFilter.type = 'bandpass'
      noiseFilter.frequency.value = 2000
      noiseFilter.Q.value = 0.5
      const noiseGain = ctx.createGain()
      noiseGain.gain.setValueAtTime(volume * 0.3, ctx.currentTime)
      noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5)
      noise.connect(noiseFilter)
      noiseFilter.connect(noiseGain)
      noiseGain.connect(ctx.destination)
      noise.start()
      noise.stop(ctx.currentTime + 1.5)

      // Warning beeps on top
      for (let i = 0; i < 4; i++) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.value = 660
        const t = ctx.currentTime + i * 0.35
        gain.gain.setValueAtTime(volume, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25)
        osc.start(t)
        osc.stop(t + 0.3)
      }
    } catch (e) { console.warn('Audio error:', e) }
  }

  // Survivor found — ascending hopeful tone
  function playHumanFound(volume = 0.4) {
    try {
      const ctx = getCtx()
      const notes = [523, 659, 784, 1047] // C E G C
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.value = freq
        const t = ctx.currentTime + i * 0.18
        gain.gain.setValueAtTime(volume, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
        osc.start(t)
        osc.stop(t + 0.4)
      })
    } catch (e) { console.warn('Audio error:', e) }
  }

  const triggerAlert = useCallback((type) => {
    const now = Date.now()
    const cooldown = type === 'danger' ? 6000 : 5000
    if (lastAlertRef.current[type] && now - lastAlertRef.current[type] < cooldown) return
    lastAlertRef.current[type] = now

    switch (type) {
      case 'danger':
        playDangerAlarm(3, 0.55)   // Fast fire-alarm style
        break
      case 'fire':
        playSiren(2.5, 0.5)        // Wailing siren
        break
      case 'gas':
        playGasAlarm(0.45)         // Hiss + beeps
        break
      case 'human':
        playHumanFound(0.45)       // Ascending survivor tone
        break
      case 'debris':
        playWhoop(0.35)            // Whoop whoop
        break
      case 'warning':
        playWhoop(0.3)
        break
      default:
        break
    }
  }, [])

  return { triggerAlert }
}
