// 3RD WORLD REVOLUTION: the score. Everything here is synthesized live with Web Audio (no recordings), so the page can
// play it like an instrument: the story arranges it, and the scroll remixes it. Forward opens it up; backward rewinds it.
//   Dm9 | Ebmaj7#11 | Gm9 | A7b9 | Dm9 | Bbmaj7 | Gm11 | A7b9   72 bpm, swung sixteenths
(function () {
const BPM = 72, SIX = 60 / BPM / 4, SWING = .3;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const CHORDS = [
  { bass: 38, v: [53, 57, 60, 64], tones: [62, 65, 69, 72, 76] },   // Dm9
  { bass: 39, v: [55, 58, 62, 69], tones: [63, 67, 70, 74, 81] },   // Ebmaj7#11
  { bass: 43, v: [53, 57, 58, 62], tones: [62, 65, 67, 70, 74] },   // Gm9
  { bass: 45, v: [55, 61, 65, 70], tones: [61, 64, 67, 70, 73] },   // A7b9
  { bass: 38, v: [53, 57, 60, 64], tones: [62, 65, 69, 72, 77] },   // Dm9
  { bass: 34, v: [57, 62, 65, 69], tones: [62, 65, 69, 70, 74] },   // Bbmaj7
  { bass: 43, v: [53, 58, 60, 65], tones: [60, 62, 65, 67, 72] },   // Gm11
  { bass: 45, v: [55, 58, 61, 65], tones: [61, 64, 65, 69, 70] },   // A7b9 (sus, dark)
];
// when the sea comes in the harmony lifts into the theme: a ballad that rises, breaks and falls back to D minor
//   Bbmaj7 | C | Am7 | Dm | Gm7 | C/E | F | A7
const THEME = [
  { bass: 34, v: [57, 62, 65, 69], tones: [58, 62, 65, 69, 74], lh: [34, 41, 46, 50, 53] },
  { bass: 36, v: [55, 60, 64, 67], tones: [60, 64, 67, 72, 76], lh: [36, 43, 48, 52, 55] },
  { bass: 33, v: [57, 60, 64, 67], tones: [57, 60, 64, 67, 72], lh: [33, 40, 45, 48, 52] },
  { bass: 38, v: [57, 62, 65, 69], tones: [62, 65, 69, 74, 77], lh: [38, 45, 50, 53, 57] },
  { bass: 43, v: [58, 62, 65, 67], tones: [55, 58, 62, 65, 70], lh: [31, 38, 43, 46, 50] },
  { bass: 40, v: [55, 60, 64, 67], tones: [60, 64, 67, 72, 76], lh: [40, 43, 48, 52, 55] },
  { bass: 41, v: [57, 60, 65, 69], tones: [60, 65, 69, 72, 77], lh: [41, 48, 53, 57, 60] },
  { bass: 45, v: [55, 61, 64, 67], tones: [61, 64, 67, 69, 73], lh: [33, 40, 45, 49, 52] },
];
// the hook, on the piano: eighth notes, 0 = rest (held)
const HOOK = [
  [69, 0, 72, 0, 74, 0, 0, 72], [76, 0, 0, 0, 74, 72, 0, 0], [72, 0, 76, 0, 81, 0, 0, 79], [77, 0, 0, 76, 74, 0, 0, 0],
  [74, 0, 77, 0, 79, 0, 0, 77], [76, 0, 0, 79, 84, 0, 82, 0], [81, 0, 0, 0, 79, 77, 0, 0], [76, 0, 0, 73, 0, 0, 69, 0]];
const LH = [0, 1, 2, 3, 4, 3, 2, 1];   // the left hand's broken chord, low to high and back, in eighths
// the lead: eight bars of eighth notes (null = rest)
const MEL = [
  [69, 0, 0, 65, 64, 0, 62, 0], [0, 0, 67, 0, 65, 0, 63, 0], [62, 0, 0, 0, 58, 0, 57, 0], [61, 0, 0, 64, 0, 67, 0, 70],
  [69, 0, 0, 0, 65, 0, 64, 62], [0, 65, 0, 69, 0, 72, 70, 0], [69, 0, 0, 67, 65, 0, 0, 0], [64, 0, 65, 0, 61, 0, 0, 0]];
const KICK = [1, 0, 0, 0, 0, 0, 0, .55, 0, 0, 1, 0, 0, 0, 0, 0], SNARE = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, .22];
const HAT = [.7, 0, .4, 0, .75, 0, .4, .25, .7, 0, .45, 0, .75, 0, .4, .3];
const BASSLINE = [[0, 0, 1.6], [6, 7, .7], [10, 0, 1.1], [14, -1, .45]];   // [step, interval from root, length in beats]; -1 = approach the next root

function Engine(ctx) {
  const now = () => ctx.currentTime, T = (p, v, t, k) => p.setTargetAtTime(v, t, k);
  // noise, shared
  const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const noise = () => { const s = ctx.createBufferSource(); s.buffer = nb; s.loop = true; s.loopStart = Math.random(); return s; };
  // the room: a long dark hall, generated
  const ir = ctx.createBuffer(2, ctx.sampleRate * 3.2, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); let lp = 0; for (let i = 0; i < d.length; i++) { const k = i / d.length; lp += ((Math.random() * 2 - 1) - lp) * (.5 - k * .42); d[i] = lp * Math.pow(1 - k, 2.6) * (i < 300 ? i / 300 : 1); } }
  const verb = ctx.createConvolver(); verb.buffer = ir;
  // the master: radio high-pass (for (Dead) Labor), the scroll's low-pass, tape saturation, glue
  const out = ctx.createGain(); out.gain.value = 0;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3.5; comp.attack.value = .01; comp.release.value = .25;
  const shaper = ctx.createWaveShaper(); { const n = 2048, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(x * 1.6) / Math.tanh(1.6); } shaper.curve = c; shaper.oversample = '2x'; }
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400; lp.Q.value = .6;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 25; hp.Q.value = .7;
  const mix = ctx.createGain();
  const drive = ctx.createWaveShaper(); { const n = 2048, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1, y = Math.tanh(x * 9); c[i] = Math.round(y * 9) / 9 * .7 + y * .3; } drive.curve = c; }   // hard, a little crushed
  const dry = ctx.createGain(), wet = ctx.createGain(); wet.gain.value = 0;
  mix.connect(hp); hp.connect(lp); lp.connect(dry); lp.connect(drive); drive.connect(wet); dry.connect(shaper); wet.connect(shaper); shaper.connect(comp); comp.connect(out); out.connect(ctx.destination);
  const revRet = ctx.createGain(); revRet.gain.value = .55; verb.connect(revRet); revRet.connect(hp);
  const revSend = ctx.createGain(); revSend.connect(verb);
  // a dotted-eighth echo, darkening as it repeats; the scroll feeds it
  const dl = ctx.createDelay(2), fb = ctx.createGain(), dlf = ctx.createBiquadFilter(), dlSend = ctx.createGain(), dlRet = ctx.createGain();
  dl.delayTime.value = SIX * 3; fb.gain.value = .35; dlf.type = 'lowpass'; dlf.frequency.value = 2200; dlRet.gain.value = .5;
  dlSend.connect(dl); dl.connect(dlf); dlf.connect(fb); fb.connect(dl); dlf.connect(dlRet); dlRet.connect(hp); dlf.connect(revSend);
  // pitch: every oscillator listens here, for the tape's wow and the rewind
  const pitch = ctx.createConstantSource(); pitch.offset.value = 0; pitch.start();
  const wow = ctx.createOscillator(); wow.frequency.value = .42; const wowG = ctx.createGain(); wowG.gain.value = 7; wow.connect(wowG); wow.start();
  const det = ctx.createGain(); pitch.connect(det); wowG.connect(det);
  const tune = (o) => { det.connect(o.detune); return o; };
  const osc = (type, f, t) => { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); return tune(o); };
  // buses
  const bus = (g, rev, echo) => { const b = ctx.createGain(); b.gain.value = 0; const v = ctx.createGain(); v.gain.value = g; b.connect(v); v.connect(mix);
    if (rev) { const s = ctx.createGain(); s.gain.value = rev; v.connect(s); s.connect(revSend); } if (echo) { const s = ctx.createGain(); s.gain.value = echo; v.connect(s); s.connect(dlSend); b.echo = s; } return b; };
  const B = { pad: bus(.55, .7), ep: bus(.5, .45, .35), bass: bus(.8, .05), drum: bus(.75, .12), arp: bus(.32, .5, .8), lead: bus(.3, .7, .6), piano: bus(.75, .85, .18), crackle: bus(.5), stat: bus(.28, .2), fx: bus(.5, .8, .3) };
  B.ocean = ctx.createGain(); B.ocean.gain.value = 0; { const v = ctx.createGain(); v.gain.value = .42; B.ocean.connect(v); v.connect(lp); const r = ctx.createGain(); r.gain.value = .25; v.connect(r); r.connect(revSend); }   // the sea stays out of the television
  const pIn = ctx.createGain(), pLP = ctx.createBiquadFilter(), pDry = ctx.createGain(), pCr = ctx.createWaveShaper(), pWet = ctx.createGain();
  pLP.type = 'lowpass'; pLP.frequency.value = 14000; pLP.Q.value = .7; pWet.gain.value = 0;
  { const n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.round(x * 6) / 6; } pCr.curve = c; }   // six levels: a cheap sampler
  pIn.connect(pLP); pLP.connect(pDry); pDry.connect(B.piano); pLP.connect(pCr); pCr.connect(pWet); pWet.connect(B.piano);
  const drumLP = ctx.createBiquadFilter(); drumLP.type = 'lowpass'; drumLP.frequency.value = 9000; drumLP.Q.value = .4;
  const drumIn = ctx.createGain(); drumIn.connect(drumLP); drumLP.connect(B.drum);
  // the electric piano's tremolo, slow and wide
  const trem = ctx.createOscillator(), tremG = ctx.createGain(); trem.frequency.value = 4.2; tremG.gain.value = .12; trem.connect(tremG); tremG.connect(B.ep.gain); trem.start();
  // the pads' chorus
  const cho = ctx.createDelay(.05), choL = ctx.createOscillator(), choG = ctx.createGain(); cho.delayTime.value = .012; choL.frequency.value = .33; choG.gain.value = .004;
  choL.connect(choG); choG.connect(cho.delayTime); choL.start(); const padIn = ctx.createGain(); padIn.connect(B.pad); padIn.connect(cho); cho.connect(B.pad);

  // ── instruments ──
  const env = (g, t, a, peak, d, tail = .0001) => { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setTargetAtTime(tail, t + a, d); };
  function ep(m, t, vel, len) {   // a Rhodes-like tine: two-operator FM with a bell that dies fast
    const f = mtof(m), c = osc('sine', f, t), mo = osc('sine', f, t), mg = ctx.createGain(), bell = osc('sine', f * 4.01, t), bg = ctx.createGain(), g = ctx.createGain();
    mg.gain.setValueAtTime(f * 1.4 * vel, t); mg.gain.setTargetAtTime(f * .12, t, .25); mo.connect(mg); mg.connect(c.frequency);
    env(bg, t, .002, .09 * vel, .06); bell.connect(bg); bg.connect(g); c.connect(g); env(g, t, .004, .22 * vel, len * .55 + .5); g.connect(B.ep);
    const end = t + len + 1.8; [c, mo, bell].forEach((o) => { o.start(t); o.stop(end); }); }
  function pad(ch, t, dur) {   // a 70s polysynth: detuned saws through a slow-opening filter
    const f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'lowpass'; f.Q.value = 2.2; f.frequency.setValueAtTime(300, t); f.frequency.setTargetAtTime(1300, t, .9); f.frequency.setTargetAtTime(500, t + dur * .6, 1.2);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.09, t + 1.2); g.gain.setTargetAtTime(0, t + dur, .9); f.connect(g); g.connect(padIn);
    ch.v.forEach((m, i) => [-9, 8].forEach((d) => { const o = osc('sawtooth', mtof(m), t); o.detune.setValueAtTime(d + i * 1.3, t); o.connect(f); o.start(t); o.stop(t + dur + 2.2); }));
    const sub = osc('triangle', mtof(ch.v[0] - 12), t); sub.connect(f); sub.start(t); sub.stop(t + dur + 2.2); }
  function bass(m, t, len) {
    const f = ctx.createBiquadFilter(), g = ctx.createGain(), a = osc('sine', mtof(m), t), b = osc('triangle', mtof(m), t);
    f.type = 'lowpass'; f.frequency.setValueAtTime(700, t); f.frequency.setTargetAtTime(260, t, .12); a.connect(g); b.connect(f); f.connect(g); env(g, t, .008, .5, len * .5); g.connect(B.bass);
    a.start(t); b.start(t); a.stop(t + len + 2); b.stop(t + len + 2); }
  // the piano: a hammered string; a bright attack that dulls as it rings, two strings a hair apart
  const pw = (() => { const n = 14, re = new Float32Array(n), im = new Float32Array(n); for (let k = 1; k < n; k++) im[k] = Math.pow(k, -1.45) * (k % 2 ? 1 : .72) * (k === 7 ? .4 : 1); return ctx.createPeriodicWave(re, im); })();
  function piano(m, t, vel, len, two) {
    const f = mtof(m), lp = ctx.createBiquadFilter(), g = ctx.createGain(), bright = Math.min(9000, f * (5 + vel * 9));
    lp.type = 'lowpass'; lp.Q.value = .3; lp.frequency.setValueAtTime(bright, t); lp.frequency.setTargetAtTime(Math.max(f * 1.6, 500), t, .35 + 60 / f);
    const dec = clamp(5.5 - (m - 40) * .07, 1.4, 5.5);   // low strings ring longer
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.26 * vel, t + .004); g.gain.setTargetAtTime(.1 * vel, t + .004, .12); g.gain.setTargetAtTime(.0001, t + .2, dec * .4);
    g.gain.setTargetAtTime(.0001, t + len, .35);   // the damper
    const a = osc('sine', f, t); a.setPeriodicWave(pw); a.connect(lp); a.start(t); a.stop(t + len + 1.4);
    if (two) { const b = osc('sine', f, t); b.setPeriodicWave(pw); b.detune.setValueAtTime(2.5, t); b.connect(lp); b.start(t); b.stop(t + len + 1.4); }
    const h = noise(), hf = ctx.createBiquadFilter(), hg = ctx.createGain(); hf.type = 'bandpass'; hf.frequency.value = Math.min(4000, f * 3); hf.Q.value = .6;   // the hammer
    env(hg, t, .001, .05 * vel, .008); h.connect(hf); hf.connect(hg); hg.connect(g); h.start(t); h.stop(t + .06);
    lp.connect(g); g.connect(pIn); }
  // the sea: low swells of brown noise that rise and break, foam hissing after each, never quite in time
  const bb = ctx.createBuffer(1, ctx.sampleRate * 6, ctx.sampleRate), bd = bb.getChannelData(0); { let x = 0; for (let i = 0; i < bd.length; i++) { x = (x + .02 * (Math.random() * 2 - 1)) / 1.02; bd[i] = x * 3.2; } }
  const brown = () => { const s = ctx.createBufferSource(); s.buffer = bb; s.loop = true; s.loopStart = Math.random() * 5; return s; };
  const seaBed = brown(), seaBedF = ctx.createBiquadFilter(); seaBedF.type = 'lowpass'; seaBedF.frequency.value = 380; seaBed.connect(seaBedF); seaBedF.connect(B.ocean); seaBed.start();
  function wave(t, size) {
    const up = 1.8 + Math.random() * 1.6, down = 3 + Math.random() * 3, w = brown(), wf = ctx.createBiquadFilter(), wg = ctx.createGain();
    wf.type = 'lowpass'; wf.Q.value = .5; wf.frequency.setValueAtTime(250, t); wf.frequency.exponentialRampToValueAtTime(900 + size * 1300, t + up); wf.frequency.exponentialRampToValueAtTime(260, t + up + down);
    wg.gain.setValueAtTime(.0001, t); wg.gain.exponentialRampToValueAtTime(.5 * size, t + up); wg.gain.exponentialRampToValueAtTime(.0001, t + up + down); w.connect(wf); wf.connect(wg); wg.connect(B.ocean);
    const fo = noise(), ff = ctx.createBiquadFilter(), fg = ctx.createGain(); ff.type = 'bandpass'; ff.frequency.value = 2600; ff.Q.value = .5;   // the foam, breaking just after the swell
    fg.gain.setValueAtTime(.0001, t); fg.gain.setValueAtTime(.0001, t + up * .8);   // (silent until it breaks) fg.gain.exponentialRampToValueAtTime(.045 * size, t + up + .4); fg.gain.exponentialRampToValueAtTime(.0001, t + up + down * .8);
    fo.connect(ff); ff.connect(fg); fg.connect(B.ocean); [w, fo].forEach((x) => { x.start(t); x.stop(t + up + down + .2); }); }
  let arpCut = 900;
  function arp(m, t) {   // a sequencer voice: one saw through a resonant filter that snaps shut
    const o = osc('sawtooth', mtof(m), t), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'lowpass'; f.Q.value = 8; f.frequency.setValueAtTime(arpCut * 2.8, t); f.frequency.setTargetAtTime(arpCut, t, .05);
    o.connect(f); f.connect(g); env(g, t, .003, .22, .09); g.connect(B.arp); o.start(t); o.stop(t + .7); }
  function lead(m, t, len) {   // a lonely mono lead, a little out of tune, with a late vibrato
    const o = osc('triangle', mtof(m), t), o2 = osc('square', mtof(m), t), f = ctx.createBiquadFilter(), g = ctx.createGain(), g2 = ctx.createGain(), vib = ctx.createOscillator(), vg = ctx.createGain();
    o2.detune.setValueAtTime(6, t); g2.gain.value = .22; f.type = 'lowpass'; f.frequency.value = 1900; f.Q.value = 1.4;
    vib.frequency.value = 5.2; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(14, t + len * .8); vib.connect(vg); vg.connect(o.detune); vg.connect(o2.detune);
    o.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.2, t + .06); g.gain.setTargetAtTime(.0001, t + len, .25); g.connect(B.lead);
    [o, o2, vib].forEach((x) => { x.start(t); x.stop(t + len + 1.6); }); }
  function kick(t, v) { const o = osc('sine', 130, t), g = ctx.createGain(); o.frequency.exponentialRampToValueAtTime(43, t + .11); env(g, t, .002, .95 * v, .16); o.connect(g); g.connect(drumIn); o.start(t); o.stop(t + .9);
    const c = noise(), cf = ctx.createBiquadFilter(), cg = ctx.createGain(); cf.type = 'highpass'; cf.frequency.value = 2500; env(cg, t, .001, .12 * v, .006); c.connect(cf); cf.connect(cg); cg.connect(drumIn); c.start(t); c.stop(t + .05); }
  function snare(t, v) { const n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'bandpass'; f.frequency.value = 1700; f.Q.value = .7; env(g, t, .002, .5 * v, .07); n.connect(f); f.connect(g); g.connect(drumIn); n.start(t); n.stop(t + .5);
    const o = osc('triangle', 190, t), og = ctx.createGain(); o.frequency.exponentialRampToValueAtTime(150, t + .08); env(og, t, .002, .3 * v, .04); o.connect(og); og.connect(drumIn); o.start(t); o.stop(t + .3); }
  function hat(t, v, open) { const n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'highpass'; f.frequency.value = 7200; env(g, t, .001, .16 * v, open ? .12 : .022); n.connect(f); f.connect(g); g.connect(drumIn); n.start(t); n.stop(t + (open ? .8 : .2)); }
  // one-shots the page fires
  function dread(t, dur) {   // (Dead) Labor: a low cluster, D against E flat, grinding under the static
    const f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'lowpass'; f.frequency.value = 240; f.Q.value = 3;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.16, t + 1.5); g.gain.setTargetAtTime(0, t + dur, .8); f.connect(g); g.connect(B.fx);
    [26, 27, 38].forEach((m, i) => { const o = osc('sawtooth', mtof(m), t); o.detune.setValueAtTime(i * 7 - 7, t); o.connect(f); o.start(t); o.stop(t + dur + 3); }); }
  function explode(t) {   // the crosses burst: a crack of timber, splinters raining, a low blow in D
    const c = noise(), cf = ctx.createBiquadFilter(), cg = ctx.createGain(); cf.type = 'bandpass'; cf.frequency.value = 2200; cf.Q.value = .9; env(cg, t, .001, .9, .05); c.connect(cf); cf.connect(cg); cg.connect(B.fx); c.start(t); c.stop(t + .4);
    for (let i = 0; i < 26; i++) { const tt = t + .02 + Math.pow(Math.random(), 1.6) * 1.4, n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = 'bandpass'; f.frequency.value = 1200 + Math.random() * 4500; f.Q.value = 2 + Math.random() * 4; env(g, tt, .001, .25 * Math.random() * (1.2 - (tt - t) / 1.6), .012 + Math.random() * .02);
      n.connect(f); f.connect(g); g.connect(B.fx); n.start(tt); n.stop(tt + .15); }
    const o = osc('sine', 92, t), g = ctx.createGain(); o.frequency.exponentialRampToValueAtTime(36.7, t + .5); env(g, t, .004, .95, .45); o.connect(g); g.connect(B.fx); o.start(t); o.stop(t + 3);
    [50, 57, 62].forEach((m) => { const p = osc('sawtooth', mtof(m), t), f = ctx.createBiquadFilter(), pg = ctx.createGain(); f.type = 'lowpass'; f.frequency.setValueAtTime(2400, t); f.frequency.setTargetAtTime(220, t, .25);
      env(pg, t, .01, .07, 1.1); p.connect(f); f.connect(pg); pg.connect(B.fx); p.start(t); p.stop(t + 4.5); }); }
  function form(t, up) {   // the hand and the globe gather: a chord rising out of the dark (or sinking back, scrolling up)
    const dur = 2.6, f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'lowpass'; f.Q.value = 5;
    f.frequency.setValueAtTime(up ? 300 : 3200, t); f.frequency.exponentialRampToValueAtTime(up ? 3600 : 260, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.16, t + dur * .9); g.gain.exponentialRampToValueAtTime(.0001, t + dur + .3); f.connect(g); g.connect(B.fx);
    [50, 57, 62, 65, 69].forEach((m, i) => { const o = osc('sawtooth', mtof(m - (up ? 12 : 0)), t); o.frequency.exponentialRampToValueAtTime(mtof(m - (up ? 0 : 12)), t + dur); o.detune.setValueAtTime(i * 3 - 6, t);
      o.connect(f); o.start(t); o.stop(t + dur + .5); });
    swell(t + dur - 1.6, up); }
  function lock(t) {   // ...and it closes: a struck chord and a bell
    [38, 50, 57, 62, 65, 69, 74].forEach((m, i) => piano(m, t + i * .008, .75 - i * .04, 3.5, i > 2));
    const b = osc('sine', mtof(86), t), bg = ctx.createGain(); env(bg, t, .002, .18, 1.4); b.connect(bg); bg.connect(B.fx); b.start(t); b.stop(t + 6);
    const o = osc('sine', 55, t), g = ctx.createGain(); o.frequency.exponentialRampToValueAtTime(36.7, t + .6); env(g, t, .004, .7, .6); o.connect(g); g.connect(B.fx); o.start(t); o.stop(t + 3); }
  function impact(t) {   // the walls of the sea crash together
    const o = osc('sine', 70, t), g = ctx.createGain(); o.frequency.exponentialRampToValueAtTime(28, t + 1.8); env(g, t, .01, 1.1, .9); o.connect(g); g.connect(B.fx); o.start(t); o.stop(t + 6);
    const n = noise(), f = ctx.createBiquadFilter(), ng = ctx.createGain(); f.type = 'lowpass'; f.frequency.setValueAtTime(5000, t); f.frequency.exponentialRampToValueAtTime(300, t + 3); env(ng, t, .02, .55, 1.1); n.connect(f); f.connect(ng); ng.connect(B.fx); n.start(t); n.stop(t + 7); }
  function swell(t, up) {   // a reverse cymbal: noise that rises into the moment (or out of it, scrolling back)
    const n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'bandpass'; f.Q.value = .8; f.frequency.setValueAtTime(up ? 600 : 7000, t); f.frequency.exponentialRampToValueAtTime(up ? 7000 : 400, t + 1.6);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.5, t + 1.5); g.gain.exponentialRampToValueAtTime(.0001, t + 1.75); n.connect(f); f.connect(g); g.connect(B.fx); n.start(t); n.stop(t + 2); }
  function scratch(t, dir) {   // the record caught and pushed the other way
    const n = noise(), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'bandpass'; f.Q.value = 4;
    const a = dir > 0 ? 500 : 2600, b = dir > 0 ? 2800 : 420; f.frequency.setValueAtTime(a, t); f.frequency.exponentialRampToValueAtTime(b, t + .09); f.frequency.exponentialRampToValueAtTime(a * .8, t + .2);
    env(g, t, .004, .6, .07); n.connect(f); f.connect(g); g.connect(B.fx); n.start(t); n.stop(t + .5);
    const o = osc('sawtooth', dir > 0 ? 180 : 420, t), og = ctx.createGain(), of = ctx.createBiquadFilter(); of.type = 'lowpass'; of.frequency.value = 1400;
    o.frequency.exponentialRampToValueAtTime(dir > 0 ? 520 : 140, t + .1); o.frequency.exponentialRampToValueAtTime(dir > 0 ? 200 : 380, t + .2); env(og, t, .003, .16, .06); o.connect(of); of.connect(og); og.connect(B.fx); o.start(t); o.stop(t + .5); }
  // continuous textures: vinyl, and a TV's static
  const cb = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate), cd = cb.getChannelData(0);
  for (let i = 0; i < cd.length; i++) { cd[i] = (Math.random() * 2 - 1) * .012 + (Math.random() < .0009 ? (Math.random() * 2 - 1) * .9 : 0); }
  const crk = ctx.createBufferSource(); crk.buffer = cb; crk.loop = true; const crkF = ctx.createBiquadFilter(); crkF.type = 'bandpass'; crkF.frequency.value = 2400; crkF.Q.value = .4;
  crk.connect(crkF); crkF.connect(B.crackle); crk.start();
  const st = noise(), stF = ctx.createBiquadFilter(); stF.type = 'bandpass'; stF.frequency.value = 3200; stF.Q.value = .35; st.connect(stF); stF.connect(B.stat); st.start();
  const wh = noise(), whF = ctx.createBiquadFilter(), whG = ctx.createGain(); whF.type = 'bandpass'; whF.Q.value = 1.6; whF.frequency.value = 900; whG.gain.value = 0; wh.connect(whF); whF.connect(whG); whG.connect(B.fx); wh.start();   // the scroll's wind

  // ── the sequencer ──
  let next = 0, step = 0, L = { pad: 0, ep: 0, bass: 0, kick: 0, snare: 0, hat: 0, arp: 0, lead: 0, piano: 0, theme: 0, ocean: 0, dread: 0 }, roll = 0, surge = 0;
  let inTheme = false, tb = 0, ch = CHORDS[0], nx = CHORDS[1], waveAt = 0;
  function schedule(s, t) {
    const bar = Math.floor(s / 16) % 8, i = s % 16, sw = i % 2 ? SIX * SWING : 0, tt = t + sw;
    if (i === 0) {   // each bar: the jazz loop, or the theme (which always starts from its top)
      if (L.theme > .5 && !inTheme) { inTheme = true; tb = 0; } else if (L.theme <= .5 && inTheme) inTheme = false; else if (inTheme) tb++;
      ch = inTheme ? THEME[tb % 8] : CHORDS[bar]; nx = inTheme ? THEME[(tb + 1) % 8] : CHORDS[(bar + 1) % 8]; }
    if (inTheme && L.piano > .01) {   // the piano: the hook over a broken left hand; the second time round it swells, in octaves
      const pass = Math.floor(tb / 8), full = pass % 2 === 1, b8 = tb % 8;
      if (i % 2 === 0) { const e = i / 2, m = HOOK[b8][e];
        piano(ch.lh[LH[e]], tt, .38 + (full ? .14 : 0) - e * .01, SIX * 2.4, false);
        if (full && e === 0) piano(ch.lh[0] - 12, tt, .5, SIX * 14, false);
        if (m) { let len = SIX * 2; for (let j = e + 1; j < 8 && !HOOK[b8][j]; j++) len += SIX * 2; const v = .7 + (e === 0 ? .12 : 0) + (full ? .15 : 0);
          piano(m, tt + .006, v, len, true); if (full) piano(m - 12, tt + .012, v * .7, len, false); } } }
    if (L.ocean > .01 && t >= waveAt) { wave(t, Math.min(1.6, .55 + Math.random() * .5 + surge * .8)); waveAt = t + (surge > .3 ? 1.8 : 4.5) + Math.random() * (surge > .3 ? 1.5 : 4.5); }
    if (i === 0 && L.pad > .01) pad(ch, t, SIX * 16);
    if (L.ep > .01 && !(inTheme && L.piano > .5)) [[0, .55], [6, .38], [11, .32]].forEach(([k, v]) => { if (k === i) ch.v.forEach((m, j) => ep(m + (bar === 3 && k === 11 ? 1 : 0), tt + j * .012, v * (.8 + Math.random() * .3), SIX * (k === 0 ? 5 : 3))); });
    if (L.bass > .01) BASSLINE.forEach(([k, iv, len]) => { if (k === i) bass(iv < 0 ? nx.bass - 1 : ch.bass + iv, tt, len * SIX * 4); });
    if (L.kick > .01 && KICK[i]) kick(tt, KICK[i]);
    if (L.snare > .01 && SNARE[i]) snare(tt, SNARE[i]);
    if (L.hat > .01) { if (HAT[i]) hat(tt, HAT[i] * (.85 + Math.random() * .3), i === 14 && bar % 2); if (roll > .5) hat(tt + SIX / 2, .45 * roll); }   // a fast scroll rolls the hats
    if (L.arp > .01) { const n = ch.tones.length, k = s % (n * 2), m = ch.tones[k % n] + (k >= n ? 12 : 0); arp(m, tt); }
    if (L.dread > .01 && i === 0) dread(t, SIX * 16);
    if (L.lead > .01 && !inTheme && i % 2 === 0) { const m = MEL[bar][i / 2]; if (m) { let len = SIX * 2; for (let j = i / 2 + 1; j < 8 && !MEL[bar][j]; j++) len += SIX * 2; lead(m, tt, Math.min(len, SIX * 6)); } }
  }
  return {
    ctx, out,
    start(t) { next = t + .1; out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(.75, t + 2.5); },
    fade(v, t) { T(out.gain, v, t, .4); },
    tick(t) { while (next < t + .2) { schedule(step, next); next += SIX; step++; } },
    // the page tells it where the story is and how the scroll is moving
    set(s, t) {
      const f = Math.max(0, s.v), b = Math.max(0, -s.v), k = .12;
      L = s.layers; roll = f;
      const gl = (name, v) => T(B[name].gain, v, t, .6);
      surge = s.surge || 0; gl('piano', L.piano);
      T(pLP.frequency, s.dl > .2 ? 1700 : s.cc > .2 ? 1000 : 14000, t, .6); T(pLP.Q, s.dl > .2 ? 4 : .7, t, .6);
      T(pWet.gain, s.cc * .3 + s.dl * .75, t, .6); T(pDry.gain, 1 - s.dl * .5, t, .6);
      T(wowG.gain, 7 + s.cc * 26 + s.dl * 48, t, .8);   // the tape wavers more as it goes
      const m = clamp(s.mouse || 0, 0, 1); T(wet.gain, m * .42, t, .05); T(dry.gain, 1 - m * .55, t, .05); T(B.ocean.gain, L.ocean * (1 + surge * .8), t, 1.2);
      gl('pad', L.pad); gl('ep', L.ep * (1 - L.theme * .55)); gl('bass', L.bass); gl('arp', L.arp); gl('lead', L.lead); gl('crackle', .5 + s.dl * .3);
      T(B.drum.gain, Math.max(L.kick, L.snare, L.hat), t, .4); T(B.stat.gain, s.dl * (.22 + s.tv * .9), t, .05);
      T(drumLP.frequency, s.cc > .3 ? 700 : 9000, t, .5);   // under water
      // the scroll: forward opens the filter, feeds the echo and blows wind; backward rewinds the tape, pitch sagging and the sound going dark
      T(lp.frequency, clamp(s.base * (1 + f * 1.8) * (1 - b * .65), 180, 16000), t, k);
      T(hp.frequency, s.dl > .2 ? 380 + s.dl * 260 : 25, t, .3);   // (Dead) Labor plays through a television's speaker
      T(pitch.offset, -b * 760 + f * 40, t, b > .05 ? .09 : .22);
      T(fb.gain, clamp(.32 + Math.abs(s.v) * .3, 0, .78), t, .1); T(B.ep.echo.gain, .25 + Math.abs(s.v) * .6, t, .1);
      T(whG.gain, Math.min(.5, Math.abs(s.v) * .38), t, .08); T(whF.frequency, f > b ? 600 + f * 3200 : Math.max(220, 2600 - b * 1900), t, .12);
      arpCut = clamp(700 + f * 3800 - b * 400 + s.ecl * 500, 300, 6000);
    },
    impact, swell, scratch, explode, form, lock,
  };
}

// ── the live score on the page ──
const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };
let E = null, on = store('3w-sound') !== 'off', vol = parseFloat(store('3w-vol') || '.75'), last = { v: 0, t: 0, dir: 0, tA: -1 };
const $ = (id) => document.getElementById(id), btn = $('snd'), mute = $('mute'), slider = $('vol'), wrap = $('sndw');
const level = () => (on ? vol : 0);
const paint = () => { const audible = on && E && E.ctx.state === 'running';
  [btn, mute].forEach((b) => { if (!b) return; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  if (btn) btn.classList.toggle('live', !!audible); if (mute) mute.setAttribute('aria-label', on ? 'Mute' : 'Unmute');
  if (slider) { slider.value = Math.round(vol * 100); slider.style.setProperty('--v', Math.round(vol * 100) + '%'); } };
function boot() {   // build it straight away; the browser lets it sound once the visitor has touched the page
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC || E) return;
  E = Engine(new AC({ latencyHint: 'playback' })); E.start(E.ctx.currentTime); setInterval(() => E.tick(E.ctx.currentTime), 40);
  E.ctx.onstatechange = paint; E.fade(level(), E.ctx.currentTime); if (on) E.ctx.resume().catch(() => {}); paint(); }
const set = (o) => { on = o; store('3w-sound', on ? 'on' : 'off'); if (!E) boot(); E.fade(level(), E.ctx.currentTime); if (on) E.ctx.resume(); paint(); };
const unlock = () => { if (!E) boot(); if (on && E.ctx.state !== 'running') E.ctx.resume().then(paint, () => {}); };
['pointerdown', 'keydown', 'touchend', 'click'].forEach((ev) => addEventListener(ev, unlock, { capture: true, passive: true }));
const touch = matchMedia('(hover: none)').matches;
if (btn) btn.addEventListener('click', (e) => { e.stopPropagation(); if (touch && wrap && !wrap.classList.contains('open')) { wrap.classList.add('open'); return; } set(!on); });
if (mute) mute.addEventListener('click', (e) => { e.stopPropagation(); set(!on); });
if (slider) slider.addEventListener('input', () => { vol = slider.value / 100; store('3w-vol', vol); paint(); if (vol > 0 && !on) set(true); else if (E) E.fade(level(), E.ctx.currentTime); });
if (wrap) addEventListener('pointerdown', (e) => { if (!wrap.contains(e.target)) wrap.classList.remove('open'); }, true);
document.addEventListener('visibilitychange', () => { if (!E) return; if (document.hidden) E.ctx.suspend(); else if (on) E.ctx.resume(); });
boot(); paint();

// the page calls this every frame with where the story is (see index.html)
let acc = 0;
window.Score3W = {
  Engine,
  update(s, dt) {
    if (!E || !on || E.ctx.state !== 'running') { last.tA = s.tA; return; }
    const t = E.ctx.currentTime, v = clamp(s.vel / 1800, -1.6, 1.6);
    // a hard change of direction catches the record
    const dir = Math.abs(v) > .35 ? Math.sign(v) : 0; if (dir && last.dir && dir !== last.dir && t - last.t > .25) { E.scratch(t + .01, dir); last.t = t; } if (dir) last.dir = dir;
    // the sea's walls meeting: forward, the crash; back through it, the crash in reverse
    const cross = (x) => (last.tA < x && s.tA >= x ? 1 : last.tA >= x && s.tA < x ? -1 : 0);
    if (last.tA >= 0) {
      if (cross(1.15) > 0) E.explode(t + .01); else if (cross(1.15) < 0) E.swell(t, false);   // the crosses burst
      if (cross(5.5) !== 0) E.form(t + .01, cross(5.5) > 0);                                 // the hand and globe gather
      if (cross(8.1) > 0) E.lock(t + .01);                                                    // ...and close
      if (cross(12.3) > 0) { E.swell(t, true); E.impact(t + .05); } else if (cross(12.3) < 0) E.swell(t, false); }   // the walls of the sea meet
    last.tA = s.tA;
    acc += dt; if (acc < .05) return; acc = 0;
    E.set(Object.assign({}, s, { v }), t); },
};
})();
