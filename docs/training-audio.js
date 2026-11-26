const cues = {
  strike: [105, .15, .7, 440], heavy: [58, .25, .8, 290], slash: [175, .16, .58, 1700],
  arrow: [280, .13, .43, 1900], fire: [124, .28, .66, 670], lightning: [242, .22, .75, 1300],
  magic: [321, .27, .12, 1400], heal: [440, .32, .05, 650], shield: [213, .27, .2, 720],
  victory: [388, .47, .04, 600], defeat: [155, .43, .09, 370], draw: [258, .38, .06, 440]
};
const families = {
  charge: "heavy", bite: "slash", water: "magic", wind: "magic", earth: "heavy", arcane: "magic",
  divine: "magic", alchemy: "magic", nature: "heal", regen: "heal", cleanse: "heal", buff: "heal", guard: "shield"
};

export function createBattleAudio(volume) {
  let context, master;
  let last = 0;
  const sources = new Set();
  const bufferCache = new Map();

  function unlock() {
    if (volume() <= 0 || !window.AudioContext) return;
    try {
      if (!context) {
        context = new AudioContext();
        master = context.createGain();
        master.connect(context.destination);
      }
      if (context.state === "suspended") context.resume().catch(() => {});
    } catch { /* El combate puede reproducirse sin un dispositivo de audio. */ }
  }

  function texture(name, frequency, duration, noiseLevel, cutoff) {
    if (bufferCache.has(name)) return bufferCache.get(name);
    const rate = context.sampleRate;
    const buffer = context.createBuffer(1, Math.ceil(rate * duration), rate);
    const samples = buffer.getChannelData(0);
    let seed = 321, noise = 0, phase = 0;
    const rising = name === "heal" || name === "victory";
    const smooth = 1 - Math.exp(-2 * Math.PI * cutoff / rate);
    for (let i = 0; i < samples.length; i++) {
      const t = i / rate;
      const stage = t / duration;
      seed = (Math.imul(seed,1664525) + 1013904223) >>> 0;
      noise += ((seed / 2147483648 - 1) - noise) * smooth;
      phase += 2 * Math.PI * frequency * (rising ? .96 + stage * .33 : .49 + .51 * Math.exp(-stage * 4)) / rate;
      const body = Math.sin(phase) * .77 + Math.sin(phase * (name === "shield" ? 2.11 : 1.51)) * .23;
      const envelope = Math.min(1, t / .012) * (1 - stage) ** 2.8;
      samples[i] = (body * (1 - noiseLevel) + noise * noiseLevel) * envelope * .32;
    }
    bufferCache.set(name, buffer);
    return buffer;
  }

  function play(visual) {
    if (!context || context.state !== "running" || volume() <= 0 || document.hidden) return;
    const time = context.currentTime;
    if (time - last < .085) return;
    last = time;
    master.gain.setTargetAtTime(volume() / 100,time,.017);
    const name = families[visual] ?? visual;
    const cue = cues[name];
    if (!cue) return;
    const note = context.createBufferSource();
    note.buffer = texture(name,...cue);
    note.connect(master);
    note.onended = () => {
      note.disconnect();
      sources.delete(note);
    };
    sources.add(note);
    note.start(time);
  }

  function stop() {
    for (const source of sources) source.stop();
    sources.clear();
    last = 0;
  }

  function suspend() {
    stop();
    if (context?.state === "running") context.suspend().catch(() => {});
  }
  return { unlock, play, stop, suspend };
}
