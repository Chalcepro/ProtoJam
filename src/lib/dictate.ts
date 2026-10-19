// Speak instead of typing (the Chat tab's microphone). The microphone is
// recorded here at 16 kHz mono - what Whisper wants - and the dev server
// turns it into text with whisper.cpp on this computer: no cloud, no key.

export type Recording = { stop: () => Promise<Blob>; cancel: () => void; level: () => number };

// A 16-bit PCM WAV of the samples.
const wav = (chunks: Float32Array[], rate: number): Blob => {
  const n = chunks.reduce((a, c) => a + c.length, 0);
  const buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const str = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, n * 2, true);
  let o = 44;
  for (const c of chunks) for (let i = 0; i < c.length; i++, o += 2) v.setInt16(o, Math.max(-1, Math.min(1, c[i])) * 0x7fff, true);
  return new Blob([buf], { type: 'audio/wav' });
};

export const startRecording = async (): Promise<Recording> => {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
  const ctx = new AudioContext({ sampleRate: 16000 });        // the browser resamples the mic
  const src = ctx.createMediaStreamSource(stream);
  // ScriptProcessor is old but needs no worklet file; 4096 samples = a quarter second
  const tap = ctx.createScriptProcessor(4096, 1, 1);
  const chunks: Float32Array[] = [];
  let level = 0;
  tap.onaudioprocess = (e) => {
    const d = new Float32Array(e.inputBuffer.getChannelData(0));
    chunks.push(d);
    let s = 0;
    for (let i = 0; i < d.length; i += 16) s = Math.max(s, Math.abs(d[i]));
    level = s;
  };
  src.connect(tap); tap.connect(ctx.destination);
  const end = () => { tap.disconnect(); src.disconnect(); stream.getTracks().forEach(t => t.stop()); void ctx.close(); };
  return {
    stop: async () => { end(); return wav(chunks, ctx.sampleRate); },
    cancel: end,
    level: () => level
  };
};

export const transcribe = async (audio: Blob): Promise<string> => {
  const r = await fetch('/__pj/transcribe', { method: 'POST', headers: { 'Content-Type': 'audio/wav', 'X-PJ-Agent': '1' }, body: audio });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || `Transcribing failed (${r.status}).`);
  return String(d.text || '');
};
