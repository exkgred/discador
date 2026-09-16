const DTMF: Record<string, [number, number]> = {
  '1': [697, 1209],
  '2': [697, 1336],
  '3': [697, 1477],
  '4': [770, 1209],
  '5': [770, 1336],
  '6': [770, 1477],
  '7': [852, 1209],
  '8': [852, 1336],
  '9': [852, 1477],
  '*': [941, 1209],
  '0': [941, 1336],
  '#': [941, 1477],
}

let ctx: AudioContext | null = null
let master: GainNode | null = null
let muted = false
const timers = new Set<number>()
const stoppers = new Set<() => void>()

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext()
    master = ctx.createGain()
    master.gain.value = muted ? 0 : 0.28
    master.connect(ctx.destination)
  }
  return ctx
}

function output(): GainNode {
  getCtx()
  return master as GainNode
}

function later(ms: number, fn: () => void): void {
  const id = window.setTimeout(() => {
    timers.delete(id)
    fn()
  }, ms)
  timers.add(id)
}

function track(stop: () => void): void {
  stoppers.add(stop)
}

function tone(
  frequency: number,
  start: number,
  duration: number,
  gainValue: number,
  type: OscillatorType = 'sine',
): void {
  const audio = getCtx()
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.type = type
  osc.frequency.value = frequency
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(gainValue, start + 0.012)
  gain.gain.setValueAtTime(gainValue, start + Math.max(0.02, duration - 0.03))
  gain.gain.linearRampToValueAtTime(0, start + duration)
  osc.connect(gain)
  gain.connect(output())
  osc.start(start)
  osc.stop(start + duration + 0.02)
  track(() => {
    try {
      osc.stop()
      osc.disconnect()
      gain.disconnect()
    } catch {
      /* already stopped */
    }
  })
}

function pair(f1: number, f2: number, start: number, duration: number, gainValue: number): void {
  tone(f1, start, duration, gainValue)
  tone(f2, start, duration, gainValue)
}

function click(start: number): void {
  const audio = getCtx()
  const length = Math.floor(audio.sampleRate * 0.04)
  const buffer = audio.createBuffer(1, length, audio.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / length)
  }
  const src = audio.createBufferSource()
  const filter = audio.createBiquadFilter()
  const gain = audio.createGain()
  src.buffer = buffer
  filter.type = 'highpass'
  filter.frequency.value = 800
  gain.gain.setValueAtTime(0.35, start)
  gain.gain.exponentialRampToValueAtTime(0.001, start + 0.04)
  src.connect(filter)
  filter.connect(gain)
  gain.connect(output())
  src.start(start)
  src.stop(start + 0.05)
}

export async function unlockCallAudio(): Promise<void> {
  const audio = getCtx()
  if (audio.state === 'suspended') {
    await audio.resume()
  }
}

export function setCallAudioMuted(next: boolean): void {
  muted = next
  if (master) {
    master.gain.value = next ? 0 : 0.28
  }
}

export function isCallAudioMuted(): boolean {
  return muted
}

export function stopCallAudio(): void {
  for (const id of timers) window.clearTimeout(id)
  timers.clear()
  for (const stop of stoppers) stop()
  stoppers.clear()
}

export function playOutboundCall(phone: string): void {
  stopCallAudio()
  const audio = getCtx()
  let t = audio.currentTime + 0.02
  click(t)
  t += 0.09
  const digits = phone.replace(/\D/g, '').slice(-4)
  for (const digit of digits) {
    const freqs = DTMF[digit]
    if (freqs) pair(freqs[0], freqs[1], t, 0.085, 0.16)
    t += 0.15
  }
  const waitMs = Math.max(80, (t - audio.currentTime) * 1000)
  later(waitMs, startRingback)
}

export function startRingback(): void {
  function burst(): void {
    const audio = getCtx()
    const start = audio.currentTime
    pair(440, 480, start, 1.05, 0.2)
    later(1450, burst)
  }
  burst()
}

export function startInCallAudio(): void {
  stopCallAudio()
  const audio = getCtx()
  const start = audio.currentTime
  click(start)
  tone(425, start + 0.04, 0.18, 0.08)

  const length = audio.sampleRate * 2
  const buffer = audio.createBuffer(1, length, audio.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * 0.22
  }
  const src = audio.createBufferSource()
  const filter = audio.createBiquadFilter()
  const gain = audio.createGain()
  const lfo = audio.createOscillator()
  const lfoGain = audio.createGain()
  src.buffer = buffer
  src.loop = true
  filter.type = 'bandpass'
  filter.frequency.value = 1400
  filter.Q.value = 0.7
  gain.gain.value = 0.045
  lfo.type = 'sine'
  lfo.frequency.value = 3.2
  lfoGain.gain.value = 180
  lfo.connect(lfoGain)
  lfoGain.connect(filter.frequency)
  src.connect(filter)
  filter.connect(gain)
  gain.connect(output())
  src.start()
  lfo.start()
  track(() => {
    try {
      src.stop()
      lfo.stop()
      src.disconnect()
      lfo.disconnect()
    } catch {
      /* already stopped */
    }
  })
}

export function playHangup(): void {
  stopCallAudio()
  const audio = getCtx()
  const start = audio.currentTime
  click(start)
  pair(480, 620, start + 0.05, 0.35, 0.16)
  pair(480, 620, start + 0.5, 0.35, 0.16)
}
