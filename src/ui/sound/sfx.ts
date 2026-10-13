// 8-bit sound effects synthesised with the Web Audio API: no audio files to download.

interface Note {
  freq: number
  /** Seconds after the sound starts. */
  at: number
  duration: number
  type?: OscillatorType
  volume?: number
  /** Glide to this frequency over the note. */
  slideTo?: number
}

let context: AudioContext | null = null

function audio(): AudioContext | null {
  if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') return null
  context ??= new window.AudioContext()
  if (context.state === 'suspended') void context.resume()
  return context
}

function play(notes: readonly Note[]) {
  const ctx = audio()
  if (!ctx) return
  const start = ctx.currentTime + 0.01
  for (const note of notes) {
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    const from = start + note.at
    const to = from + note.duration
    const volume = note.volume ?? 0.1
    oscillator.type = note.type ?? 'square'
    oscillator.frequency.setValueAtTime(note.freq, from)
    if (note.slideTo) oscillator.frequency.exponentialRampToValueAtTime(note.slideTo, to)
    gain.gain.setValueAtTime(0, from)
    gain.gain.linearRampToValueAtTime(volume, from + 0.005)
    gain.gain.setValueAtTime(volume, Math.max(from + 0.005, to - 0.02))
    gain.gain.linearRampToValueAtTime(0, to)
    oscillator.connect(gain).connect(ctx.destination)
    oscillator.start(from)
    oscillator.stop(to + 0.02)
  }
}

/** Evenly spaced notes. */
function run(freqs: readonly number[], step: number, extra: Partial<Note> = {}): Note[] {
  return freqs.map((freq, i) => ({ freq, at: i * step, duration: step * 0.9, ...extra }))
}

const later = (notes: Note[], seconds: number) => notes.map((n) => ({ ...n, at: n.at + seconds }))

export const SOUNDS = {
  /** Ten seconds left: one low two-note warning. */
  warning: () =>
    play([
      { freq: 523, at: 0, duration: 0.12, type: 'triangle', volume: 0.12 },
      { freq: 392, at: 0.14, duration: 0.2, type: 'triangle', volume: 0.12 },
      { freq: 70, at: 0, duration: 0.16, type: 'sine', volume: 0.3, slideTo: 45 },
    ]),
  /** Each of the last three seconds: a short tick. */
  tick: () => play([{ freq: 1250, at: 0, duration: 0.05, volume: 0.09 }]),
  start: () => play(run([523, 784], 0.07)),
  reveal: () => play(run([392, 523, 659, 784, 1047], 0.055)),
  correct: () => play(run([659, 880, 1319], 0.08)),
  // Two soft falling notes: clearly "not quite", without a harsh buzz.
  wrong: () =>
    play([
      { freq: 440, at: 0, duration: 0.14, type: 'triangle', volume: 0.13 },
      { freq: 349, at: 0.16, duration: 0.3, type: 'triangle', volume: 0.12, slideTo: 330 },
    ]),
  announce: () => play(run([392, 392, 523, 659], 0.09)),
  doubleTrouble: () => {
    const fanfare = run([523, 659, 784, 1047], 0.07)
    play([...fanfare, ...later(fanfare, 0.35), { freq: 1319, at: 0.7, duration: 0.3 }])
  },
  buzz: () => play([{ freq: 196, at: 0, duration: 0.25, volume: 0.09 }]),
  victory: () => play(run([523, 659, 784, 1047, 784, 1047, 1319], 0.12)),
} as const

export type SoundName = keyof typeof SOUNDS
