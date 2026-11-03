// The hand of God, in place of the pointer: a hand reaching into the world (after the Creation of Adam, and the
// disembodied hand of Black & White). It trails the pointer with weight, points at what can be pressed, pokes on a
// click, rears back and flicks on a right click, and closes into a fist to drag the world with the middle button.
// On touch screens it fades in under the finger and away again. Model: WebXR Input Profiles generic hand, MIT.
(function () {
if (!window.THREE || !THREE.GLTFLoader) return;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches; if (REDUCED) return;
const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
const SIZE = FINE ? 260 : 240, DPR = Math.min(devicePixelRatio, 2);
const lerp = (a, b, k) => a + (b - a) * k, clamp01 = (x) => Math.max(0, Math.min(1, x)), V3 = (x, y, z) => new THREE.Vector3(x, y, z);

const cv = document.createElement('canvas'); cv.id = 'hand'; cv.setAttribute('aria-hidden', 'true');
cv.style.cssText = `position:fixed;left:0;top:0;width:${SIZE}px;height:${SIZE}px;z-index:60;pointer-events:none;opacity:0;transition:opacity .35s;will-change:transform`;
document.body.appendChild(cv);
let renderer; try { renderer = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, powerPreference: 'low-power' }); } catch (e) { cv.remove(); return; }
renderer.setPixelRatio(DPR); renderer.setSize(SIZE, SIZE, false); renderer.outputEncoding = THREE.sRGBEncoding;
const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(30, 1, .01, 10); cam.position.set(0, 0, .7);
scene.add(new THREE.HemisphereLight('#fff1e4', '#3a0d10', .9));
const key = new THREE.DirectionalLight('#ffe2c8', 1.6); key.position.set(-.6, .9, .8); scene.add(key);
const rim = new THREE.DirectionalLight('#ff2a1e', 2.4); rim.position.set(.8, -.3, -.9); scene.add(rim);   // red from behind

// skin like a fresco's: pale, warm, a red rim that burns brighter over anything that can be pressed
const glow = { value: 0 };
const skin = new THREE.MeshStandardMaterial({ color: '#c88f74', roughness: .7, metalness: 0, transparent: true });
skin.onBeforeCompile = (sh) => { sh.uniforms.glow = glow;
  // the wrist (bound to the wrist joint, index 0) dissolves into red light, so the hand has no cut end
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vWr;')
    .replace('#include <skinning_vertex>', '#include <skinning_vertex>\nvWr = dot(skinWeight, vec4(equal(skinIndex, vec4(0.))));');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float glow; varying float vWr;')
    .replace('#include <output_fragment>', '#include <output_fragment>\nfloat wf = smoothstep(.55, .98, vWr); gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1., .18, .1) * 1.4, wf * .8); gl_FragColor.a *= 1. - wf;')
    .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      float fr = pow(1. - clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0., 1.), 2.4);
      totalEmissiveRadiance += vec3(1., .1, .06) * fr * (.6 + glow * 1.8) + vec3(.04, .012, .01);`); };
const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,60,40,.55)'); r.addColorStop(.45, 'rgba(255,30,20,.18)'); r.addColorStop(1, 'rgba(255,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })(),
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
halo.scale.setScalar(.34); scene.add(halo);

// poses: [curl per joint for thumb, index, middle, ring, pinky], spread of the fingers
const POSE = {
  rest:  { c: [.25, .06, .32, .5, .62], s: .05 },    // God's hand: the index reaching, the others falling away
  point: { c: [.7, 0, 1.25, 1.35, 1.4], s: 0 },
  poke:  { c: [.6, .38, 1.2, 1.3, 1.35], s: 0 },
  fist:  { c: [1.05, 1.45, 1.5, 1.5, 1.5], s: -.04 },
  flick: { c: [-.1, -.25, -.25, -.25, -.25], s: .32 },
};
const FING = ['thumb', 'index-finger', 'middle-finger', 'ring-finger', 'pinky-finger'];
let hand = null, root = null, bones = {}, rest = {}, tip = null;
const cur = { c: POSE.rest.c.slice(), s: POSE.rest.s };

const toGLB = (j) => { const uri = j.buffers[0].uri, bin = Uint8Array.from(atob(uri.slice(uri.indexOf(',') + 1)), (c) => c.charCodeAt(0)); delete j.buffers[0].uri;
  const js = new TextEncoder().encode(JSON.stringify(j)), jp = (4 - js.length % 4) % 4, bp = (4 - bin.length % 4) % 4, total = 28 + js.length + jp + bin.length + bp, out = new Uint8Array(total), dv = new DataView(out.buffer);
  dv.setUint32(0, 0x46546C67, true); dv.setUint32(4, 2, true); dv.setUint32(8, total, true); dv.setUint32(12, js.length + jp, true); dv.setUint32(16, 0x4E4F534A, true); out.set(js, 20); out.fill(0x20, 20 + js.length, 20 + js.length + jp);
  const o = 20 + js.length + jp; dv.setUint32(o, bin.length + bp, true); dv.setUint32(o + 4, 0x004E4942, true); out.set(bin, o + 8); return out.buffer; };
fetch('assets/hand.gltf.json').then((r) => r.json()).then((j) => new THREE.GLTFLoader().parse(toGLB(j), 'assets/', (g) => {
  hand = g.scene; hand.traverse((o) => { if (o.isMesh) { o.material = skin; o.frustumCulled = false; } if (/wrist|finger|thumb/.test(o.name)) { bones[o.name] = o; rest[o.name] = o.quaternion.clone(); } });
  tip = bones['index-finger-tip'];
  // the model's fingers point down (-y) with the palm to -x: turn it so it reaches up and to the left, palm down and away from us
  const F = V3(-.62, .74, -.26).normalize(), P0 = V3(.05, -.55, -.83), P = P0.sub(F.clone().multiplyScalar(P0.dot(F))).normalize();
  const X = P.clone().negate(), Y = F.clone().negate(), m = new THREE.Matrix4().makeBasis(X, Y, X.clone().cross(Y));
  root = new THREE.Group(); const inner = new THREE.Group(); inner.quaternion.setFromRotationMatrix(m);
  const c = new THREE.Box3().setFromObject(hand).getCenter(V3()); hand.position.sub(c); inner.add(hand); root.add(inner); scene.add(root);
  start(); }, () => {}));

// ── the pointer ──
const S = { x: innerWidth / 2, y: innerHeight / 2, hx: innerWidth / 2, hy: innerHeight / 2, vx: 0, vy: 0, seen: false, over: false, pose: 'rest', act: 0, actPose: null, mid: false, vis: 0, touchT: -1, fling: 0 };
const target = (e) => e && e.target && e.target.closest && e.target.closest('a, button, input, select, textarea, [role=button], label');
function ripple(x, y, kind) {   // red rings on a click; a burst of sparks on a right click
  const d = document.createElement('div'); d.className = 'hand-fx ' + kind; d.style.left = x + 'px'; d.style.top = y + 'px';
  if (kind === 'burst') for (let i = 0; i < 9; i++) { const r = document.createElement('i'); r.style.setProperty('--a', (i * 40 + Math.random() * 18) + 'deg'); d.appendChild(r); }
  document.body.appendChild(d); setTimeout(() => d.remove(), 900); }
function act(pose, dur) { S.actPose = pose; S.act = dur; }
if (FINE) {
  addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse') return; S.x = e.clientX; S.y = e.clientY; S.over = !!target(e); if (!S.seen) { S.seen = true; S.hx = S.x; S.hy = S.y; }
    if (S.mid) { scrollBy(0, -e.movementY * 3.2); S.fling = lerp(S.fling, -e.movementY * 3.2, .5); } }, { passive: true });
  addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return;
    if (e.button === 0) { act('poke', .32); ripple(e.clientX, e.clientY, 'ring'); }
    if (e.button === 1) { e.preventDefault(); S.mid = true; S.fling = 0; ripple(e.clientX, e.clientY, 'grip'); }   // grab the world
    if (e.button === 2) { act('flick', .5); ripple(e.clientX, e.clientY, 'burst'); } });
  addEventListener('mousedown', (e) => { if (e.button === 1) e.preventDefault(); });   // no autoscroll: the hand does it
  addEventListener('pointerup', (e) => { if (e.button === 1) S.mid = false; });
  addEventListener('contextmenu', (e) => { if (!target(e)) e.preventDefault(); });
  document.addEventListener('mouseleave', () => { S.seen = false; });
  document.addEventListener('mouseenter', () => { S.seen = true; });
} else {
  addEventListener('touchstart', (e) => { const t = e.touches[0]; if (!t) return; S.x = S.hx = t.clientX; S.y = S.hy = t.clientY; S.seen = true; S.touchT = 1e9; act('poke', .35); }, { passive: true });
  addEventListener('touchmove', (e) => { const t = e.touches[0]; if (!t) return; S.x = t.clientX; S.y = t.clientY; S.pose = 'fist'; }, { passive: true });
  addEventListener('touchend', () => { S.touchT = .7; S.pose = 'rest'; }, { passive: true });
}

// ── animate ──
const tipV = V3(), q = new THREE.Quaternion(), ax = V3();
let last = performance.now(), t = 0;
function start() { if (FINE) document.documentElement.classList.add('godhand'); requestAnimationFrame(loop); }
function loop(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now; t += dt;
  // follow with weight: a spring, so it lags and swings like a hand moved by an arm
  const ax2 = (S.x - S.hx) * 120 - S.vx * 15, ay2 = (S.y - S.hy) * 120 - S.vy * 15; S.vx += ax2 * dt; S.vy += ay2 * dt; S.hx += S.vx * dt; S.hy += S.vy * dt;
  if (!S.mid && Math.abs(S.fling) > .5) { scrollBy(0, S.fling); S.fling *= Math.pow(.02, dt); }   // the world keeps moving a little after you let go
  if (S.touchT < 1e8) S.touchT -= dt;
  const want = FINE ? (S.seen ? 1 : 0) : (S.touchT > 0 ? 1 : 0); S.vis = lerp(S.vis, want, 1 - Math.exp(-dt * (want ? 10 : 5)));
  cv.style.opacity = S.vis.toFixed(3);
  if (S.act > 0) S.act -= dt;
  const pose = POSE[S.act > 0 ? S.actPose : S.mid ? 'fist' : S.over ? 'point' : S.pose] || POSE.rest;
  const k = 1 - Math.exp(-dt * (S.act > 0 ? 22 : 11));
  for (let i = 0; i < 5; i++) cur.c[i] = lerp(cur.c[i], pose.c[i] + (i ? Math.sin(t * 1.3 + i) * .025 : 0), k); cur.s = lerp(cur.s, pose.s, k);
  if (hand) {
    FING.forEach((f, i) => ['phalanx-proximal', 'phalanx-intermediate', 'phalanx-distal'].forEach((j, n) => { const b = bones[f + '-' + j]; if (!b) return;
      b.quaternion.copy(rest[b.name]).multiply(q.setFromAxisAngle(ax.set(-1, 0, 0), cur.c[i] * (i === 0 ? .8 : 1) * (n === 0 ? 1.05 : .95)));
      if (n === 0 && i > 0) b.quaternion.multiply(q.setFromAxisAngle(ax.set(0, 0, 1), cur.s * (i - 2.3))); }));   // spread
    const tm = bones['thumb-metacarpal']; if (tm) tm.quaternion.copy(rest[tm.name]).multiply(q.setFromAxisAngle(ax.set(0, -1, 0), .35 + cur.c[0] * .45));   // the thumb tucks in toward the fingers
    // sway: the hand tips into its motion, and breathes when still
    const sp = Math.hypot(S.vx, S.vy), poke = S.act > 0 && S.actPose === 'poke' ? Math.sin((1 - S.act / .32) * Math.PI) : 0, rear = S.act > 0 && S.actPose === 'flick' ? Math.sin((1 - S.act / .5) * Math.PI) : 0;
    root.rotation.set(clamp01(Math.abs(S.vy) / 3000) * Math.sign(S.vy) * .5 + Math.sin(t * .9) * .03 - rear * .5, -S.vx / 3000 * .6 + Math.sin(t * .7) * .04, -S.vx / 2600 * .5);
    root.position.set(0, Math.sin(t * 1.1) * .004, -poke * .05 + rear * .06);
    glow.value = lerp(glow.value, S.over || S.mid ? 1 : rear, 1 - Math.exp(-dt * 8)); halo.material.opacity = glow.value * .9;
    scene.updateMatrixWorld(true); tip.getWorldPosition(tipV); halo.position.copy(tipV).add(V3(.02, -.02, -.05));
    tipV.project(cam);
    // the fingertip sits exactly on the pointer (the weight is all in the swing)
    const px = (tipV.x + 1) / 2 * SIZE, py = (1 - tipV.y) / 2 * SIZE;
    cv.style.transform = `translate(${(S.x - px).toFixed(1)}px, ${(S.y - py).toFixed(1)}px)`;
    if (S.vis > .01) renderer.render(scene, cam); }
  requestAnimationFrame(loop); }
})();
