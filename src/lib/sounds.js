// Lightweight Web-Audio synth for game SFX.
// No external audio files — every sound is generated in the browser
// using oscillators + envelopes. Works offline, no CORS issues.

let audioCtx = null
let muted = false

const STORAGE_KEY = 'love-swap-muted'

try {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored != null) muted = stored === '1'
} catch {
  /* ignore */
}

function ctx() {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext || window.webkitAudioContext
  if (!AC) return null
  if (!audioCtx) {
    try {
      audioCtx = new AC()
    } catch {
      return null
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

export function setMuted(v) {
  muted = Boolean(v)
  try {
    localStorage.setItem(STORAGE_KEY, muted ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export function isMuted() {
  return muted
}

// Prime audio on first user gesture (iOS / Safari autoplay unlock).
export function primeAudio() {
  const ac = ctx()
  if (ac && ac.state === 'suspended') ac.resume().catch(() => {})
}

function tone(opts) {
  if (muted) return
  const ac = ctx()
  if (!ac) return
  const {
    freq,
    duration = 0.2,
    type = 'sine',
    gain = 0.1,
    delay = 0,
    attack = 0.005,
    freqEnd = null,
    detune = 0,
  } = opts
  const start = ac.currentTime + delay
  const osc = ac.createOscillator()
  const g = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  if (freqEnd != null) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(1, freqEnd),
      start + duration,
    )
  }
  osc.detune.value = detune
  g.gain.setValueAtTime(0, start)
  g.gain.linearRampToValueAtTime(gain, start + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(g)
  g.connect(ac.destination)
  osc.start(start)
  osc.stop(start + duration + 0.05)
}

function noise(opts) {
  if (muted) return
  const ac = ctx()
  if (!ac) return
  const {
    duration = 0.2,
    gain = 0.05,
    delay = 0,
    filterFreq = 2000,
    filterQ = 1,
    decay = true,
  } = opts
  const bufSize = Math.max(1, Math.floor(ac.sampleRate * duration))
  const buf = ac.createBuffer(1, bufSize, ac.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < bufSize; i += 1) {
    const envelope = decay ? 1 - i / bufSize : 1
    data[i] = (Math.random() * 2 - 1) * envelope
  }
  const src = ac.createBufferSource()
  src.buffer = buf
  const g = ac.createGain()
  g.gain.value = gain
  const f = ac.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = filterFreq
  f.Q.value = filterQ
  src.connect(f)
  f.connect(g)
  g.connect(ac.destination)
  src.start(ac.currentTime + delay)
}

export const sfx = {
  click() {
    tone({ freq: 700, duration: 0.04, type: 'square', gain: 0.05 })
  },
  lock() {
    tone({ freq: 523.25, duration: 0.1, type: 'sine', gain: 0.1 })
    tone({ freq: 783.99, duration: 0.15, type: 'sine', gain: 0.08, delay: 0.06 })
  },
  diceRoll() {
    for (let i = 0; i < 5; i += 1) {
      noise({
        duration: 0.09,
        gain: 0.08,
        delay: i * 0.08,
        filterFreq: 2500 + Math.random() * 1000,
        filterQ: 1.5,
      })
    }
  },
  diceLand() {
    tone({ freq: 220, freqEnd: 90, duration: 0.18, type: 'square', gain: 0.1 })
    noise({ duration: 0.08, gain: 0.06, filterFreq: 400, filterQ: 0.8 })
  },
  match() {
    tone({ freq: 523.25, duration: 0.35, type: 'sine', gain: 0.12 })
    tone({ freq: 659.25, duration: 0.4, type: 'sine', gain: 0.1, delay: 0.08 })
    tone({ freq: 783.99, duration: 0.5, type: 'sine', gain: 0.1, delay: 0.16 })
    tone({ freq: 1046.5, duration: 0.6, type: 'triangle', gain: 0.08, delay: 0.24 })
  },
  close() {
    tone({ freq: 523.25, duration: 0.25, type: 'sine', gain: 0.1 })
    tone({ freq: 622.25, duration: 0.3, type: 'sine', gain: 0.08, delay: 0.1 })
  },
  miss() {
    tone({ freq: 400, freqEnd: 200, duration: 0.35, type: 'triangle', gain: 0.1 })
  },
  heart() {
    tone({ freq: 1046.5, duration: 0.2, type: 'sine', gain: 0.09 })
    tone({ freq: 1318.5, duration: 0.22, type: 'sine', gain: 0.08, delay: 0.08 })
    tone({ freq: 1568, duration: 0.25, type: 'sine', gain: 0.07, delay: 0.16 })
  },
  capture() {
    tone({ freq: 220, freqEnd: 440, duration: 0.12, type: 'square', gain: 0.1 })
    tone({ freq: 660, duration: 0.12, type: 'square', gain: 0.09, delay: 0.12 })
    tone({ freq: 880, duration: 0.14, type: 'square', gain: 0.08, delay: 0.22 })
  },
  win() {
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((f, i) => {
      tone({ freq: f, duration: 0.3, type: 'triangle', gain: 0.12, delay: i * 0.1 })
    })
    tone({ freq: 1046.5, duration: 0.7, type: 'triangle', gain: 0.1, delay: 0.5 })
    tone({ freq: 1318.5, duration: 0.7, type: 'sine', gain: 0.08, delay: 0.55 })
  },
  tick() {
    tone({ freq: 1200, duration: 0.03, type: 'square', gain: 0.04 })
  },
  whoosh() {
    noise({ duration: 0.3, gain: 0.04, filterFreq: 800, filterQ: 1 })
  },
}
