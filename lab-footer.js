/* Footer lab: birds on wires.
   Birds drawn as flat silhouettes, after the Pinterest "bird" board: upright, round head, tail hanging past the wire,
   seen from the side, three-quarter, front or back, and they turn around now and then.
   Perched: look toward a nearby pointer, preen, stretch a wing, fluff and shake, flap for balance, doze when left alone,
   keep their spacing and shuffle aside when a neighbour lands.
   Startled: crouch, burst off with a wing clap, neighbours follow, the group loops around and lands again. */
(() => {
const R = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- perched birds as flat silhouettes (from the Pinterest board): upright, round head, tail hanging past the wire.
// Feet at (0,0) on the wire, facing +x. Four facings: side, three-quarter, front, back.
const INK = '#1a1a19';
const COL = { body: INK, head: INK, wing: INK, tail: INK, leg: INK };
const E_ = (x, y, rx, ry, r = 0) => { const p = new Path2D(); p.ellipse(x, y, rx, ry, r, 0, Math.PI * 2); return p; };
const P_ = pts => { const p = new Path2D(); pts.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); p.closePath(); return p; };
const ORI = {
  side: { body: E_(.2, -7.8, 4.4, 7.9, .42), neck: { x: 2.4, y: -13.2 }, head: E_(1.2, -3, 3.3, 3.1), beak: P_([[4, -3.9], [6.8, -2.8], [4.1, -1.8]]), tail: P_([[-2.2, -3.6], [-6.8, 5.2], [-4.9, 6], [-.4, -1.6]]), wing: { x: -.5, y: -9 } },
  tq:   { body: E_(.2, -8, 5, 8.1, .2), neck: { x: 1.2, y: -14 }, head: E_(.7, -3.2, 3.5, 3.3), beak: P_([[3.6, -4], [5.8, -3.1], [3.7, -2.2]]), tail: P_([[-1.8, -2.6], [-4.4, 5.2], [-2.6, 5.8], [.2, -1.2]]), wing: { x: -.5, y: -9.5 } },
  front:{ body: E_(0, -8.2, 5.6, 8.3), neck: { x: 0, y: -14.4 }, head: E_(0, -3.2, 3.6, 3.4), beak: null, tail: P_([[-1.4, -1], [-1.1, 3.6], [1.1, 3.6], [1.4, -1]]), wing: { x: 0, y: -10, sym: 1 } },
  back: { body: E_(0, -8.2, 5.5, 8.4), neck: { x: 0, y: -14.4 }, head: E_(0, -3, 3.5, 3.3), beak: null, tail: P_([[-2.1, -2.4], [-1.7, 6.6], [1.7, 6.6], [2.1, -2.4]]), wing: { x: 0, y: -10, sym: 1 } } };
const ORIS = ['side', 'side', 'tq', 'tq', 'front', 'back'];

// ---------- flight: body + a wing whose tip moves continuously, so flaps read as one motion
const F_BODY = new Path2D('M12-1.2 9.2-2C8.2-4 5.8-4.8 3.8-3.8 0-3.4-5-2.4-9-.8L-15-2.4-14 .6-15 3-9 1.8C-5 3.2 0 3.4 4 2.6 6.6 2.2 8.4 1 9.2-.2Z');
function wingPath(a, spread) {
  const S = { x: 1.5, y: -2.2 }, L = 16 * spread, tipY = S.y - L * Math.sin(a * 1.15), tipX = S.x - 3 - 5 * (1 - Math.abs(a));
  const s = Math.sign(tipY - S.y) || 1, p = new Path2D();
  p.moveTo(S.x + 2, S.y); p.quadraticCurveTo(S.x + 3, (S.y + tipY) / 2, tipX, tipY);
  p.lineTo(tipX - 1.6, tipY - s * 1.2); p.lineTo(tipX - 2.6, tipY + s * .4); p.lineTo(tipX - 3.8, tipY - s * .6);
  p.quadraticCurveTo(S.x - 5, (S.y + tipY) / 2 + s * 1.6, S.x - 6.5, S.y + .8); p.closePath(); return p;
}

function noiseTile(n, amp) { const c = document.createElement('canvas'); c.width = c.height = n; const x = c.getContext('2d'), d = x.createImageData(n, n); for (let i = 0; i < d.data.length; i += 4) { const v = 128 + (Math.random() - .5) * amp; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } x.putImageData(d, 0, 0); return c; }

// ---------- sound: pigeons clap their wings on take-off; the pole gives a dull thud
let actx = null;
const audio = () => { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); return actx.state === 'running' ? actx : (actx.resume(), null); } catch (e) { return null; } };
function noiseHit(a, t, len, freq, gain) { const n = a.createBuffer(1, a.sampleRate * len, a.sampleRate), ch = n.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 3); const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = .8; g.gain.value = gain; s.buffer = n; s.connect(f).connect(g).connect(a.destination); s.start(t); }
function clap() { const a = audio(); if (!a) return; const t = a.currentTime; for (let i = 0; i < 3; i++) noiseHit(a, t + i * .075 + R(0, .01), .05, R(1400, 2000), .18 * (1 - i * .25)); }
function thud() { const a = audio(); if (!a) return; const t = a.currentTime, o = a.createOscillator(), g = a.createGain(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(48, t + .22); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.5, t + .008); g.gain.exponentialRampToValueAtTime(.0001, t + .35); o.connect(g).connect(a.destination); o.start(t); o.stop(t + .4); noiseHit(a, t, .06, 900, .25); }

function scene(id, cfg) {
  const card = document.getElementById(id), cv = document.createElement('canvas'); card.prepend(cv);
  const c = cv.getContext('2d'); let W, H;
  const S = { nid: 0, trk: [], snaps: [], c, wires: [], birds: [], mouse: null, m: { x: 0, y: 0 }, sm: { x: 0, y: 0 }, focus: .3, lastMove: performance.now() };
  function size() { const d = Math.min(1.5, devicePixelRatio || 1); W = card.clientWidth; H = card.clientHeight; cv.width = W * d; cv.height = H * d; c.setTransform(d, 0, 0, d, 0, 0); S.W = W; S.H = H; }
  size();
  const gr = document.createElement('div'); gr.style.cssText = `position:absolute;inset:0;pointer-events:none;z-index:1;mix-blend-mode:overlay;opacity:${cfg.grain || .07};background:url(${noiseTile(180, cfg.grainAmp || 90).toDataURL()})`; cv.after(gr);
  let skyC = null;
  let now = performance.now();

  function newBird(o) { return Object.assign({ id: ++S.nid, st: 'perch', face: Math.random() < .5 ? 1 : -1, act: null, next: R(1500, 7000), ori: ORIS[(Math.random() * ORIS.length) | 0], headRot: 0, headY: 0, fluff: 0, shake: 0, flapA: 0, stretch: 0, sq: 1, ph: R(0, 6) }, o); }
  function setup() {
    S.wires = []; S.birds = []; cfg.build(S);
    S.wires.forEach(w => { w.plucks = []; w.waves = []; w.sag = w.sag || 0; w.lw = w.lw || 1; w.col = w.col || '#1d1d1c'; w.op = w.op ?? 1; w.ph = R(0, 6); w.wind = w.wind ?? .7; w.za = w.za ?? 1; w.zb = w.zb ?? w.za; w.L = Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]); });
    (cfg.perch ? cfg.perch(S) : []).forEach(([wi, u, s]) => S.birds.push(newBird({ wi, u, hu: u, s })));
    // a few distant pigeons that cross the sky now and then as a small group, not a constant swarm
    (cfg.roam || []).forEach(s => S.birds.push(newBird({ s, st: 'away', roam: true, t: 1e9 })));
    S.nextFlock = performance.now() + R(1500, 3500);
    // the original constant flock crossing the sky (restored), now faster
    const swarmWp = () => [{ x: W + 60, y: R(20, H * .5) }];
    (cfg.swarm || []).forEach(([x, y, s]) => { const cruise = R(250, 310); const b = newBird({ s, st: 'fly', roam: true, swarm: true, x: x * W / 680, y, vx: cruise, vy: R(-20, 20), fhz: R(7, 8.5), mode: 'flap', bt: 0, burst: R(.5, 1), cruise }); b.wps = swarmWp(); S.birds.push(b); });
    S.swarmWp = swarmWp;
  }
  setup();
  addEventListener('resize', () => { size(); setup(); });

  // ---------- wires: heavy cable that dips slowly under a landing, sways a little in the wind, carries knock waves
  const zAt = (w, u) => w.za + (w.zb - w.za) * u;
  const par = z => cfg.depth ? { x: -S.sm.x * 26 * z, y: -S.sm.y * 10 * z } : { x: 0, y: 0 };
  const base = (w, u) => ({ x: w.a[0] + (w.b[0] - w.a[0]) * u, y: w.a[1] + (w.b[1] - w.a[1]) * u + 4 * w.sag * u * (1 - u) });
  function disp(w, u) {
    let d = Math.sin(now / 1000 * 1.3 + w.ph) * w.wind * u * (1 - u) * 4 * (.6 + .4 * Math.sin(now / 7300 + w.ph * 2));
    for (const p of w.plucks) { const age = (now - p.t) / 1000; if (age > 5) continue; const s = u < p.u ? u / p.u : (1 - u) / (1 - p.u); d += p.a * s * Math.sin(age * Math.PI * 2 * 1.15 + .6) * Math.exp(-age * .95); }
    for (const v of w.waves) { const age = (now - v.t) / 1000; if (age > 3) continue; const f = age * 620 / w.L; d += 5 * Math.exp(-Math.pow((u - f) / .05, 2)) * Math.exp(-age * .8) * u * (1 - u) * 4 + (u < f ? 1.6 * Math.sin((f - u) * 28) * Math.exp(-(f - u) * 3) * Math.exp(-age * 1.4) * u * (1 - u) * 4 : 0); }
    return d;
  }
  const pluck = (w, u, a) => { w.plucks.push({ u: clamp(u, .05, .95), a, t: now }); if (w.plucks.length > 10) w.plucks.shift(); };
  const pt = (w, u) => { const p = base(w, u), z = zAt(w, u), o = par(z); return { x: p.x + o.x, y: p.y + disp(w, u) + o.y, z }; };

  // ---------- input
  const local = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  cv.addEventListener('pointermove', e => { S.mouse = local(e); S.m = { x: S.mouse.x / W * 2 - 1, y: S.mouse.y / H * 2 - 1 }; S.lastMove = now; if (cfg.knockHit) cv.style.cursor = cfg.knockHit(S, S.mouse) ? 'pointer' : 'default'; });
  cv.addEventListener('pointerleave', () => { S.mouse = null; S.m = { x: 0, y: 0 }; });
  cv.addEventListener('pointerdown', e => {
    const m = local(e); S.lastMove = now; audio();
    if (cfg.knockHit && cfg.knockHit(S, m)) return knock();
    const near = S.birds.filter(b => b.st === 'perch' && dist(b, m) < (e.pointerType === 'touch' ? 90 : 70));
    if (near.length) near.forEach((b, i) => setTimeout(() => takeoff(b, m.x < bpos(b).x ? 1 : -1), i * 40));
    else S.birds.forEach((b, i) => setTimeout(() => takeoff(b, Math.random() < .6 ? -1 : 1), i * 22 + R(0, 60)));
  });
  const bpos = b => pt(S.wires[b.wi], b.u);
  const dist = (b, m) => { const p = bpos(b); return Math.hypot(m.x - p.x, m.y - (p.y - 8)); };

  function knock() {
    thud(); S.shake = now;
    S.wires.forEach(w => { if (w.fromPole) { w.waves.push({ t: now }); if (w.waves.length > 3) w.waves.shift(); } });
    S.birds.forEach(b => { if (b.st !== 'perch') return; const w = S.wires[b.wi]; if (!w.fromPole) return; setTimeout(() => takeoff(b, Math.random() < .5 ? -1 : 1, true), b.u * w.L / 620 * 1000 + R(0, 80)); });
  }

  // ---------- take off: crouch, leap, clap; neighbours on the same wire catch the fright
  function takeoff(b, side, quiet) {
    if (b.st !== 'perch') return;
    b.st = 'crouch'; b.t = 0; b.side = side; b.act = null;
    if (!quiet && (!S.clapT || now - S.clapT > 250)) { S.clapT = now; clap(); }
    S.birds.forEach(o => { if (o !== b && o.st === 'perch' && o.wi === b.wi && Math.abs(o.u - b.u) < .14 && Math.random() < .65) setTimeout(() => takeoff(o, side, true), R(60, 220)); });
  }
  function launch(b) {
    const p = bpos(b), side = b.side;
    Object.assign(b, { st: 'fly', x: p.x, y: p.y - 6, vx: side * R(120, 180), vy: -R(330, 400), ph: 0, fhz: R(9, 11), mode: 'flap', bt: 0, burst: R(.7, 1), z: p.z });
    // a loop around the sky and back to (roughly) the same spot; now and then one leaves for a while instead
    const hi = () => R(14, Math.max(30, H * .28));
    if (b.roam || Math.random() < .2) b.wps = [{ x: p.x + side * 120, y: p.y - 140 }, { x: side > 0 ? W + 80 : -80, y: hi() }];
    else b.wps = [{ x: p.x + side * R(70, 120), y: p.y - R(110, 150) }, { x: side > 0 ? W * R(.82, .96) : W * R(.04, .18), y: hi() }, { x: side > 0 ? W * R(.25, .45) : W * R(.55, .75), y: hi() }, 'home'];
    if (cfg.track) { const z = R(26, 58); S.snaps.push({ x: p.x + R(-12, 12), y: p.y - 10 + R(-14, 8), w: z * R(.85, 1.3), h: z, t: now, life: R(4500, 8000) }); if (S.snaps.length > 40) S.snaps.shift(); }
    b.u = clamp(b.hu + R(-.025, .025), .04, .96);
    pluck(S.wires[b.wi], b.u, -1.1);
  }
  function land(b) {
    b.st = 'settle'; b.t = 0; b.face = b.vx >= 0 ? 1 : -1; b.flapA = 1; if (b.roam) b.stay = now + R(12000, 26000);
    const w = S.wires[b.wi]; pluck(w, b.u, 1.6);
    // keep their spacing: whoever is too close shuffles along, or gives up and flaps off
    S.birds.forEach(o => { if (o === b || o.st !== 'perch' || o.wi !== b.wi) return; const gap = o.u - b.u, min = 28 / w.L; if (Math.abs(gap) < min) { if (Math.random() < .15) takeoff(o, Math.sign(gap) || 1, true); else { o.act = { type: 'shuffle', t: 0, dur: 420, from: o.u, to: clamp(b.u + Math.sign(gap || 1) * min * 1.15, .03, .97) }; o.flapA = .6; } } });
  }

  // ---------- idle behaviour while perched
  const ACTS = ['preen', 'preen', 'stretch', 'fluff', 'flap', 'bob', 'turn', 'turn', 'scratch'];
  function idle(b, dt) {
    const p = bpos(b), m = S.mouse;
    const dozing = now - S.lastMove > 9000;
    if (b.roam && b.stay && now > b.stay && !b.act) { b.stay = 0; S.birds.filter(o => o.roam && o.st === 'perch').forEach((o, i) => { o.stay = 0; setTimeout(() => takeoff(o, 1, i > 0), i * R(80, 200)); }); return; }
    if (m) { const d = Math.hypot(m.x - p.x, m.y - p.y + 8), r = (cfg.scare || 54) * (cfg.depth ? .5 + .5 * p.z : 1); if (d < r) return takeoff(b, m.x < p.x ? 1 : -1); if (d < r * 2.6) { b.face = m.x < p.x ? -1 : 1; if (b.ori === 'back' || b.ori === 'front') b.ori = 'tq'; b.headRot += (-.25 - b.headRot) * .15; b.alert = true; } else b.alert = false; }
    if (b.act) {
      const a = b.act; a.t += dt; const k = clamp(a.t / a.dur, 0, 1), bell = Math.sin(k * Math.PI);
      if (a.type === 'preen') { b.headRot = 1.25 * bell + Math.sin(a.t / 70) * .12 * bell; b.headY = 2.5 * bell; }
      if (a.type === 'stretch') b.stretch = bell;
      if (a.type === 'fluff') { b.fluff = k < .75 ? Math.min(1, k / .3) : 1 - (k - .75) / .25; b.shake = k > .7 && k < .9 ? Math.sin(a.t / 18) : 0; }
      if (a.type === 'flap') b.flapA = bell;
      if (a.type === 'bob') { b.headY = 2 * Math.sin(k * Math.PI * 4); }
      if (a.type === 'turn') { b.sq = 1 - .1 * bell; if (k > .5 && !a.done) { b.ori = ORIS[(Math.random() * ORIS.length) | 0]; b.face = Math.random() < .5 ? 1 : -1; a.done = true; } }
      if (a.type === 'scratch') { b.headRot = .5 * bell; b.scratch = bell; }
      if (a.type === 'shuffle') { b.u = a.from + (a.to - a.from) * (1 - Math.pow(1 - k, 2)); b.hop = Math.abs(Math.sin(k * Math.PI * 3)) * 1.6; }
      if (k >= 1) { b.act = null; b.sq = 1; b.headRot = b.headY = b.stretch = b.fluff = b.shake = b.scratch = b.hop = 0; b.next = R(2500, 9000); }
    } else if (!b.alert) {
      b.headRot += ((dozing ? .9 : 0) - b.headRot) * .03; b.headY += ((dozing ? 3.2 : 0) - b.headY) * .03; b.fluff += ((dozing ? .7 : 0) - b.fluff) * .02;
      if (!dozing && (b.next -= dt) <= 0) { const t = ACTS[(Math.random() * ACTS.length) | 0]; b.act = { type: t, t: 0, dur: { preen: 1400, stretch: 1100, fluff: 1300, flap: 500, bob: 700, turn: 360, scratch: 900 }[t] }; }
    }
    if (b.flapA > 0 && (!b.act || b.act.type !== 'flap')) b.flapA = Math.max(0, b.flapA - dt / 450);
  }

  // ---------- flight
  function fly(b, dt) {
    const T = dt / 1000;
    let tgt = b.wps[0];
    if (tgt === 'home') { const p = bpos(b); tgt = { x: p.x, y: p.y - 3, home: true }; }
    const dx = tgt.x - b.x, dy = tgt.y - b.y, d = Math.hypot(dx, dy) || 1;
    const flare = tgt.home && d < 80;
    const speed = flare ? Math.max(40, d * 3.2) : b.roam && !tgt.home ? b.cruise : 420;
    const k = flare ? 7 : 2.8;
    b.vx += (dx / d * speed - b.vx) * Math.min(1, k * T); b.vy += (dy / d * speed - b.vy) * Math.min(1, k * T);
    // pigeons: steady flapping with short glides, wings held in a shallow V
    b.bt += T;
    if (flare) b.mode = 'flare';
    else if (b.mode === 'flap' && b.bt > b.burst) { b.mode = 'glide'; b.bt = 0; }
    else if (b.mode === 'glide' && b.bt > (b.roam ? R(.6, 1.1) : R(.18, .4))) { b.mode = 'flap'; b.bt = 0; b.burst = b.roam ? R(.25, .45) : R(.5, .9); }
    else if (b.mode === 'flare' && !flare) b.mode = 'flap';
    if (b.mode === 'glide') b.vy += 70 * T;
    b.x += b.vx * T; b.y += b.vy * T;
    if (b.mode !== 'glide') b.ph += (b.mode === 'flare' ? 6 : b.fhz) * T * Math.PI * 2;
    if (!tgt.home && d < 46) { b.wps.shift(); if (!b.wps.length && b.swarm) { b.x = -50; b.y = R(20, H * .5); b.wps = S.swarmWp(); } else if (!b.wps.length) { b.st = 'away'; b.t = b.roam ? 1e9 : R(2500, 6000); } }
    if (tgt.home && d < 3) land(b);
  }

  // ---------- drawing
  function drawPerched(b, x, y, s, blur) {
    const O = ORI[b.ori] || ORI.side, flat = O.wing.sym;
    c.save(); if (blur > .2) c.globalAlpha = Math.max(.4, 1 - blur * .2);
    const sq = b.sq * (1 + b.fluff * .08), sh = b.shake * .8, hop = b.hop || 0;
    c.translate(x + sh, y - hop); c.scale(b.face * s * 1.25 * (1 + b.fluff * .1), s * 1.25 * sq);
    c.fillStyle = INK; c.strokeStyle = INK;
    c.lineWidth = .9; c.beginPath(); c.moveTo(-1, -1); c.lineTo(-1, 0); c.moveTo(1, -1); c.lineTo(1, 0);
    if (b.scratch) { c.moveTo(1, -2); c.lineTo(2.5 + b.scratch * 1.5, -6 - b.scratch * 6); }
    c.stroke();
    c.fill(O.tail); c.fill(O.body);
    // wings: flapped open for balance (both sides when seen front/back), or stretched down and back
    const wing = (sx, a, sp) => { c.save(); c.translate(O.wing.x, O.wing.y); c.scale(sx * .55, .55); c.rotate(-.3); c.fill(wingPath(a, sp)); c.restore(); };
    if (b.flapA > .02) { const a = Math.sin(now / 55) * .6 + .3 * b.flapA; if (flat) { wing(1, a, b.flapA); wing(-1, a, b.flapA); } else wing(-1, a, b.flapA); }
    if (b.stretch > .02) { c.save(); c.translate(O.wing.x, O.wing.y + 2); c.rotate((flat ? 2.2 : 2.5) * b.stretch); c.scale(.5 * b.stretch + .1, .5); c.fill(wingPath(.2, 1)); c.restore(); }
    // head on its pivot: tucks back to preen, droops when dozing; seen from front/back it only tilts
    c.save(); c.translate(O.neck.x, O.neck.y + b.headY); c.rotate(flat ? b.headRot * .35 : -b.headRot * .9);
    c.fill(O.head); O.beak && c.fill(O.beak); c.restore();
    c.beginPath(); c.moveTo(O.neck.x - 2, O.neck.y + 1.5); c.lineTo(O.neck.x, O.neck.y + b.headY - 1.5); c.lineTo(O.neck.x + 2, O.neck.y + 1.5); c.fill();
    c.restore();
  }
  function drawFlying(b, s, blur) {
    const face = b.vx >= 0 ? 1 : -1; let ang = clamp(Math.atan2(b.vy, Math.abs(b.vx)), -.7, .55), a = Math.sin(b.ph), spread = 1;
    if (b.mode === 'glide') { a = .45; spread = 1; }
    if (b.mode === 'flare') { ang = -.6; a = Math.sin(b.ph) * .7 + .35; spread = 1.1; }
    c.save(); if (blur > .2) c.globalAlpha = Math.max(.4, 1 - blur * .2);
    c.translate(b.x, b.y); c.scale(face * s * 1.1, s * 1.1); c.rotate(ang);
    c.fillStyle = INK; c.globalAlpha = .85; c.fill(wingPath(clamp(a + .15, -1, 1), spread * .9)); c.globalAlpha = 1;
    c.fillStyle = COL.body; c.fill(F_BODY); c.fillStyle = COL.head; c.beginPath(); c.ellipse(7, -1.6, 3.6, 2.8, 0, 0, 7); c.fill();
    if (b.mode === 'flare') { c.strokeStyle = COL.leg; c.lineWidth = 1.1; c.beginPath(); c.moveTo(-1, 2.6); c.lineTo(1, 7); c.moveTo(1.5, 2.6); c.lineTo(3.4, 6.6); c.stroke(); }
    c.fillStyle = COL.wing; c.fill(wingPath(a, spread)); c.restore();
  }
  // ---------- tracking layer: detection boxes that lag behind the birds, sometimes doubled, left behind when a bird is lost
  const MONO = '8.5px ui-monospace, "SF Mono", Menlo, monospace';
  function track(dt) {
    S.birds.forEach(b => {
      if (b.st !== 'fly' || b.trk || b.x < -20 || b.x > W + 20) return;
      if (!b.seen) b.seen = now + R(60, 340);           // detection lag
      if (now < b.seen) return;
      const n = Math.random() < .18 ? 2 : 1;
      for (let i = 0; i < n; i++) S.trk.push({ b, x: b.x + R(-14, 14), y: b.y + R(-10, 10), w: R(22, 34) * (i ? 1.4 : 1), h: R(16, 26) * (i ? 1.35 : 1), a: 0, k: R(9, 18), lab: i === 0 && Math.random() < .55, conf: R(.71, .98), id: b.id, cls: Math.random() < .08 ? 'pigeon?' : 'bird', live: true, sec: !!i });
      b.trk = true;
    });
    S.trk.forEach(t => {
      const b = t.b;
      if (t.live) {
        if (b.st !== 'fly') { t.live = false; t.end = now; t.why = 'perch'; b.trk = false; b.seen = 0; }
        else if (b.x < -10 || b.x > W + 10 || b.y < -10) { t.live = false; t.end = now; t.why = 'lost'; b.trk = false; b.seen = 0; }
        else { const f = 1 - Math.exp(-t.k * dt / 1000); t.x += (b.x + b.vx * .05 - t.x) * f + R(-.6, .6); t.y += (b.y + b.vy * .05 - t.y) * f + R(-.6, .6); t.a = Math.min(1, t.a + dt / 160); if (Math.random() < .04) t.conf = clamp(t.conf + R(-.06, .05), .52, .99); if (t.sec && Math.random() < .004) { t.live = false; t.end = now; t.why = ''; } }
      } else t.a = Math.max(0, 1 - (now - t.end) / (t.why === 'lost' ? 3600 : 900));
    });
    S.trk = S.trk.filter(t => t.live || t.a > 0);
  }
  function drawSnaps() {
    S.snaps = S.snaps.filter(f => now - f.t < f.life);
    S.snaps.forEach(f => { const k = (now - f.t) / f.life, a = k < .06 ? k / .06 : 1 - Math.pow((k - .06) / .94, 1.6);
      c.save(); c.globalAlpha = a; c.fillStyle = 'rgba(246,246,243,.38)'; c.fillRect(f.x - f.w / 2, f.y - f.h / 2, f.w, f.h); c.strokeStyle = 'rgba(26,26,25,.55)'; c.lineWidth = .5; c.strokeRect(f.x - f.w / 2 + .5, f.y - f.h / 2 + .5, f.w, f.h); c.restore(); });
  }
  function drawTrk() {
    c.save(); c.font = MONO; c.textBaseline = 'bottom';
    S.trk.forEach(t => { const x = Math.round(t.x - t.w / 2) + .5, y = Math.round(t.y - t.h / 2) + .5;
      c.globalAlpha = t.a * (t.live ? .85 : .6); c.strokeStyle = '#1a1a19'; c.fillStyle = '#1a1a19';
      c.lineWidth = .6; if (!t.live && t.why === 'lost') c.setLineDash([2, 2]); c.strokeRect(x, y, t.w, t.h); c.setLineDash([]);
      c.lineWidth = 1.3; const k = 4; [[0, 0, 1, 1], [t.w, 0, -1, 1], [t.w, t.h, -1, -1], [0, t.h, 1, -1]].forEach(([dx, dy, sx, sy]) => { c.beginPath(); c.moveTo(x + dx + sx * k, y + dy); c.lineTo(x + dx, y + dy); c.lineTo(x + dx, y + dy + sy * k); c.stroke(); });
      const lb = !t.lab ? '' : t.live ? `${t.cls === 'bird' ? '' : t.cls + ' '}${String(t.id).padStart(2, '0')}  ${t.conf.toFixed(2)}` : t.why === 'lost' ? `${String(t.id).padStart(2, '0')} lost` : '';
      if (lb) c.fillText(lb, x, y - 2);
    });
    c.restore();
  }
  const blurFor = z => cfg.depth ? Math.min(3.2, Math.abs(z - S.focus) * 4.2) : 0;

  let last = performance.now(), running = true, visible = true;
  function frame(t) {
    const dt = Math.min(32, t - last); last = t; now = t;
    S.sm.x += (S.m.x - S.sm.x) * .06; S.sm.y += (S.m.y - S.sm.y) * .06;
    if (cfg.focusTarget) S.focus += (cfg.focusTarget(S) - S.focus) * .05;
    if (cfg.roam && now > S.nextFlock) {
      const idle = S.birds.filter(b => b.roam && b.st === 'away'), n = Math.min(idle.length, 3 + ((Math.random() * 3) | 0));
      if (n) { const dir = Math.random() < .7 ? 1 : -1, y0 = R(18, H * .26), y1 = y0 + R(-30, 20), cruise = R(240, 300), settle = cfg.roamLand && Math.random() < .55;
        idle.slice(0, n).forEach((b, i) => { const ox = -i * R(22, 38), oy = R(-14, 14);
          Object.assign(b, { st: 'fly', x: dir > 0 ? -40 + ox : W + 40 - ox, y: y0 + oy, vx: dir * cruise, vy: 0, ph: R(0, 6), fhz: R(6.5, 8), mode: Math.random() < .5 ? 'glide' : 'flap', bt: R(0, .4), burst: R(.25, .45), cruise, wps: [{ x: dir > 0 ? W + 60 : -60, y: y1 + oy }] });
          // sometimes the group drops in and sits on the wires for a while before moving on
          if (settle) { const [wi, u0, du] = cfg.roamLand[i % cfg.roamLand.length]; b.wi = wi; b.hu = b.u = clamp(u0 + R(-du, du), .05, .95); b.s = b.s0 || (b.s0 = b.s, b.s); b.wps = [{ x: W * R(.35, .6), y: y0 + oy + 20 }, 'home']; } }); }
      S.nextFlock = now + R(7000, 14000);
    }
    c.clearRect(0, 0, W, H); if (cfg.sky) { if (!skyC || skyC.width !== cv.width) { skyC = document.createElement('canvas'); skyC.width = cv.width; skyC.height = cv.height; const x = skyC.getContext('2d'); x.scale(cv.width / W, cv.height / H); cfg.sky(x, W, H, S); } c.drawImage(skyC, 0, 0, W, H); }
    if (cfg.back) cfg.back(c, W, H, S, { par, blurFor });
    S.wires.forEach(w => { c.save(); c.strokeStyle = w.col; c.globalAlpha = w.op; const bl = blurFor((w.za + w.zb) / 2); if (bl > .2) c.globalAlpha = w.op * Math.max(.35, 1 - bl * .2); c.lineWidth = w.lw * (cfg.depth ? (.45 + .55 * (w.za + w.zb) / 2) : 1); c.beginPath(); for (let i = 0; i <= 24; i++) { const u = i / 24, p = pt(w, u); i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); } c.stroke(); c.restore(); });
    if (cfg.front) cfg.front(c, W, H, S, { par, blurFor, now });
    if (cfg.track) drawSnaps();
    S.birds.forEach(b => {
      if (b.st === 'away') { if (!b.roam && (b.t -= dt) <= 0) { const side = Math.random() < .5 ? -1 : 1; Object.assign(b, { st: 'fly', x: side > 0 ? W + 50 : -50, y: R(14, H * .3), vx: -side * 260, vy: R(-20, 30), ph: 0, fhz: R(9, 10), mode: 'flap', bt: 0, burst: R(.5, .9), wps: [{ x: side > 0 ? W * R(.3, .6) : W * R(.4, .7), y: R(14, H * .3) }, 'home'] }); } return; }
      if (b.st === 'crouch') { b.t += dt; b.sq = 1 - .18 * Math.sin(Math.min(1, b.t / 80) * Math.PI / 2); if (b.t > 80) { b.sq = 1; launch(b); } }
      else if (b.st === 'settle') { b.t += dt; b.sq = 1 - .14 * Math.sin(Math.min(1, b.t / 170) * Math.PI); b.flapA = Math.max(0, 1 - b.t / 520); if (b.t > 520) { b.st = 'perch'; b.sq = 1; b.next = R(800, 4000); } }
      else if (b.st === 'perch') idle(b, dt);
      else if (b.st === 'fly') fly(b, dt);
      if (b.st === 'fly') { const z = b.roam ? .8 : (b.z || 1), s = b.s * (cfg.depth ? z : 1); drawFlying(b, s, b.roam ? 0 : .4); }
      else if (b.st !== 'away') { const p = bpos(b); drawPerched(b, p.x, p.y, b.s * (cfg.depth ? p.z : 1), blurFor(p.z) * .5); }
    });
    if (cfg.track) { track(dt); drawTrk(); }
    if (cfg.autoScare && now > (S.nextScare || (S.nextScare = now + R(6000, 9000)))) { S.nextScare = now + R(16000, 26000); const ps = S.birds.filter(b => b.st === 'perch'); if (ps.length > 6 && now - S.lastMove > 4000) { const b0 = ps[(Math.random() * ps.length) | 0]; ps.forEach(b => setTimeout(() => takeoff(b, Math.random() < .5 ? -1 : 1, true), Math.abs(b.u - b0.u) * 1600 + (b.wi !== b0.wi) * R(100, 400) + R(0, 120))); } }
    if (!reduce && visible) requestAnimationFrame(frame); else running = false;
  }
  requestAnimationFrame(frame);
  new IntersectionObserver(es => es.forEach(e => { visible = e.isIntersecting; if (visible && !running && !reduce) { running = true; last = performance.now(); requestAnimationFrame(frame); } }), { rootMargin: '100px' }).observe(card);
  return S;
}

// ================= versions =================
scene('v1', { grain: .06,
  build(S) { const W = S.W, ys = [64, 92, 120, 148, 176, 214], nm = document.getElementById('nm1'); nm.style.left = '72px'; nm.style.top = (120 - 28) + 'px'; const tx = 72 + (nm.offsetWidth || 150) + 16; ys.forEach((y, i) => S.wires.push({ a: [i === 2 ? tx : 46, y], b: [W + 10, y + 3], lw: i === 5 ? 1.7 : 1.05, wind: .5 })); },
  back(c, W, H) { c.fillStyle = '#1b1b1a'; c.save(); c.translate(26, 0); c.rotate(-.06); c.fillRect(0, 0, 8, H + 20); c.restore(); c.save(); c.translate(42, 0); c.rotate(-.04); c.fillRect(0, 0, 7, H + 20); c.restore(); [64, 92, 120, 148, 176, 214].forEach(y => { c.beginPath(); c.arc(39, y, 2.4, 0, 7); c.fill(); }); },
  perch: () => [[0, .12, .42], [1, .2, .4], [1, .3, .4], [3, .14, .4], [3, .26, .4], [3, .46, .4], [3, .6, .4], [4, .1, .4], [4, .2, .4], [4, .3, .4], [4, .42, .4], [4, .56, .4], [4, .78, .4], [2, .6, .42], [0, .72, .42]] });

scene('v2', { grain: .05, scare: 64,
  build(S) { const W = S.W, H = S.H; S.wires.push({ a: [W * .18, -10], b: [W * .98, H + 10], lw: 2.1, wind: .4 }, { a: [W * .06, -10], b: [W * .86, H + 10], lw: 1.6, wind: .4 }, { a: [W * 0, 4], b: [W * .78, H + 10], lw: 1.6, wind: .4 }, { a: [W * .22, -4], b: [W * .5, -60], lw: .6, col: '#555' }); },
  perch: () => [[0, .24, .78], [0, .34, .76], [0, .44, .78], [0, .53, .77], [0, .62, .79], [0, .71, .78]] });

scene('v3', { grain: .07,
  build(S) { const W = S.W, H = S.H, px = W * .62, py = 110; [[-20, 40], [-20, 110], [-20, 200], [-20, 300], [W * .2, H + 10], [W * .38, H + 10], [W + 20, 12], [W + 20, 84], [W + 20, 170], [W * .82, H + 10], [W * .95, H + 10], [W * .4, -10], [W * .7, -10]].forEach(([x, y], i) => S.wires.push({ a: [px + (x < px ? -3 : 3), py + (i % 3) * 3], b: [x, y], lw: i % 4 === 0 ? 1.4 : .9, op: i % 3 === 2 ? .6 : .95, wind: .5, fromPole: true })); },
  back(c, W, H) { const px = W * .62, py = 110; c.fillStyle = '#262624'; c.beginPath(); c.moveTo(px - 7, H + 10); c.lineTo(px - 5, py - 6); c.lineTo(px + 5, py - 6); c.lineTo(px + 7, H + 10); c.fill(); c.fillRect(px - 8, py + 4, 6, 26); c.fillRect(px + 2, py + 8, 6, 22); c.fillRect(px - 1.6, py - 32, 3.2, 28); c.save(); c.translate(px - 4, py - 38); c.rotate(-.18); c.beginPath(); c.ellipse(0, 0, 26, 9, 0, 0, 7); c.fill(); c.fillStyle = '#4a4a47'; c.beginPath(); c.ellipse(-2, 1, 15, 4.6, 0, 0, 7); c.fill(); c.restore(); for (let i = 0; i < 7; i++) { c.fillStyle = '#262624'; c.fillRect(px - (i % 2 ? 9 : -5), py + 80 + i * 28, 7, 2.2); } },
  knockHit: (S, m) => Math.abs(m.x - S.W * .62) < 14 && m.y > 70,
  perch: () => { const a = []; [[0, 3], [1, 3], [2, 2], [4, 4], [5, 2], [6, 3], [7, 4], [8, 2], [9, 2], [11, 2], [12, 2]].forEach(([wi, n]) => { for (let k = 0; k < n; k++) a.push([wi, .2 + k * (.66 / n) + R(-.02, .02), R(.46, .52)]); }); return a; } });

scene('v4', { grain: .32, grainAmp: 150,
  sky(c, W, H) { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#bdbdb9'); g.addColorStop(.55, '#d6d6d2'); g.addColorStop(1, '#c4c4c0'); c.fillStyle = g; c.fillRect(0, 0, W, H); const r = c.createRadialGradient(W * .4, H * .55, 10, W * .4, H * .55, W * .5); r.addColorStop(0, 'rgba(240,240,236,.55)'); r.addColorStop(1, 'rgba(240,240,236,0)'); c.fillStyle = r; c.fillRect(0, 0, W, H); },
  build(S) { const W = S.W, H = S.H, px = W * .72; S.wires.push({ a: [W * .18, H + 10], b: [W + 10, 48], lw: 1.2 }, { a: [W * .3, H + 10], b: [W + 10, 116], lw: 1.05 }, { a: [W * .4, H + 10], b: [W + 10, 150], lw: 1.05 }, { a: [W * .5, H + 10], b: [W + 10, 196], lw: .95 }, { a: [px - 38, 184], b: [px + 44, 188], lw: 5, col: '#1a1a19', wind: 0 }); },
  back(c, W, H) { const px = W * .72; c.fillStyle = '#1e1e1d'; c.beginPath(); c.moveTo(px - 6, H + 10); c.lineTo(px - 4, 170); c.lineTo(px + 4, 170); c.lineTo(px + 6, H + 10); c.fill(); c.fillRect(px - 30, 206, 60, 3); c.strokeStyle = '#2a2a28'; c.lineWidth = 1; c.beginPath(); c.moveTo(px + 2, 210); c.lineTo(px + 34, H + 10); c.stroke(); },
  knockHit: (S, m) => Math.abs(m.x - S.W * .72) < 14 && m.y > 165,
  perch: () => [[4, .12, .62], [4, .84, .6], [0, .7, .56], [1, .82, .56], [2, .62, .56]],
  swarm: [[60, 70, .4], [130, 56, .38], [190, 108, .36], [260, 82, .4], [330, 48, .4], [400, 96, .37], [470, 62, .36], [540, 30, .38]],
  roam: [.5, .48, .5, .46, .5],
  roamLand: [[0, .55, .05], [1, .6, .05], [0, .82, .04], [2, .78, .05], [1, .4, .05]] });

scene('v5', { grain: .08, depth: true,
  sky(c, W, H) { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#e6e6e3'); g.addColorStop(.7, '#f2f2f0'); g.addColorStop(1, '#f7f7f5'); c.fillStyle = g; c.fillRect(0, 0, W, H); },
  build(S) { const W = S.W, H = S.H, px = W * .76; S.px = px; S.far = []; for (let i = 0; i < 6; i++) { const z = .42 * Math.pow(.72, i), x = W * .5 - i * W * .085 * Math.pow(.88, i), top = H * .62 - 200 * z; S.far.push({ x, top, z, h: 260 * z }); }
    const arms = [[px - 58, 82], [px - 24, 78], [px + 26, 74], [px + 60, 70], [px - 40, 128], [px + 42, 124]]; S.arms = arms; const f1 = S.far[0];
    arms.forEach(([ax, ay], i) => { const left = i !== 3 && i !== 2; if (left) S.wires.push({ a: [ax, ay], b: [f1.x + (i % 2 ? -10 : 10) * f1.z * 2, f1.top + 12 * f1.z + (i > 3 ? 18 * f1.z : 0)], za: 1, zb: f1.z, lw: 1.5, sag: 14, fromPole: true, wind: .8 }); else S.wires.push({ a: [ax, ay], b: [W + 30, ay - 18 + i * 6], za: 1, zb: 1.05, lw: 1.6, sag: 6, fromPole: true, wind: .6 }); });
    for (let i = 0; i < S.far.length - 1; i++) { const a = S.far[i], b = S.far[i + 1]; [-1, 1].forEach(j => S.wires.push({ a: [a.x + j * 16 * a.z, a.top + 12 * a.z], b: [b.x + j * 16 * b.z, b.top + 12 * b.z], za: a.z, zb: b.z, lw: 1.2, sag: 8 * a.z, op: .9, wind: .4 })); } },
  back(c, W, H, S, { par, blurFor }) { c.save(); const hz = H * .62, o = par(.15); c.strokeStyle = '#d2d2cf'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, hz + o.y); c.lineTo(W, hz - 4 + o.y); c.stroke(); c.restore();
    S.far.forEach(p => { const o = par(p.z), bl = blurFor(p.z); c.save(); c.globalAlpha = (.55 + .45 * p.z / .42) * (bl > .2 ? Math.max(.35, 1 - bl * .2) : 1); c.fillStyle = '#2e2e2c'; c.fillRect(p.x + o.x - 4 * p.z, p.top + o.y, 8 * p.z + .6, p.h); c.fillRect(p.x + o.x - 22 * p.z, p.top + o.y + 10 * p.z, 44 * p.z, Math.max(1, 3 * p.z)); c.restore(); }); },
  front(c, W, H, S, { par, blurFor, now }) { const px = S.px, o = par(1), bl = blurFor(1); let sh = 0; if (S.shake) { const a = (now - S.shake) / 1000; if (a < .6) sh = Math.sin(a * 60) * 2.2 * Math.exp(-a * 7); }
    c.save(); if (bl > .2) c.filter = `blur(${bl}px)`; c.translate(o.x + sh, o.y); const g = c.createLinearGradient(px - 10, 0, px + 10, 0); g.addColorStop(0, '#4a4844'); g.addColorStop(.4, '#2c2a27'); g.addColorStop(1, '#3e3c38'); c.fillStyle = g;
    c.beginPath(); c.moveTo(px - 7, 40); c.lineTo(px + 7, 40); c.lineTo(px + 11, H + 10); c.lineTo(px - 11, H + 10); c.fill();
    c.fillStyle = '#262522'; c.save(); c.translate(px, 76); c.rotate(-.06); c.fillRect(-72, 0, 144, 6); c.restore(); c.save(); c.translate(px, 124); c.rotate(-.05); c.fillRect(-52, 0, 104, 5); c.restore();
    S.arms.forEach(([x, y]) => { c.fillRect(x - 3, y - 2, 6, 10); c.beginPath(); c.ellipse(x, y - 1, 5, 2, 0, 0, 7); c.fill(); });
    c.fillRect(px + 10, 150, 18, 32); c.fillRect(px + 9, 147, 20, 4); c.strokeStyle = '#2a2926'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(px - 8, 190); c.bezierCurveTo(px - 30, 200, px - 30, 232, px - 12, 236); c.bezierCurveTo(px, 238, px + 2, 220, px - 8, 216); c.stroke(); c.restore(); },
  focusTarget(S) { if (!S.mouse) return .45; const d = Math.abs(S.mouse.x - S.px); return d < 120 ? 1 : Math.max(.2, .55 - (S.px - S.mouse.x) / S.W * .6); },
  knockHit: (S, m) => Math.abs(m.x - (S.px - S.sm.x * 26)) < 16 && m.y > 36,
  perch: () => { const a = []; [[0, [.12, .26, .42]], [1, [.16, .32]], [4, [.22, .4]], [5, [.3, .6]], [2, [.3, .6]], [3, [.4, .72]], [6, [.4]], [8, [.5]]].forEach(([wi, us]) => us.forEach(u => a.push([wi, u, .85]))); return a; } });

scene('v6', { grain: .22, grainAmp: 120, track: true, autoScare: true, scare: 46,
  sky(c, W, H) { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#d9d9d5'); g.addColorStop(.6, '#e7e7e3'); g.addColorStop(1, '#dededa'); c.fillStyle = g; c.fillRect(0, 0, W, H); },
  build(S) { const W = S.W, H = S.H, px = W * .2;
    [[-10, 92, W + 10, 40, 1.1], [-10, 128, W + 10, 84, 1], [-10, 160, W + 10, 122, 1], [px, 70, W + 10, 196, .8], [-10, 240, W + 10, 214, .9]].forEach(([ax, ay, bx, by, lw], i) => S.wires.push({ a: [ax, ay], b: [bx, by], lw, sag: i === 3 ? 18 : 10, wind: .5 })); },
  back(c, W, H) { const px = W * .2; c.fillStyle = '#222220'; c.beginPath(); c.moveTo(px - 5, H + 10); c.lineTo(px - 3, 54); c.lineTo(px + 3, 54); c.lineTo(px + 5, H + 10); c.fill(); c.fillRect(px - 34, 66, 68, 3); c.fillRect(px - 24, 100, 48, 2.5); },
  perch: () => { const a = []; [[0, 9, .3, .95], [1, 7, .35, .9], [2, 6, .3, .85], [3, 5, .3, .9], [4, 4, .45, .9]].forEach(([wi, n, u0, u1]) => { for (let k = 0; k < n; k++) a.push([wi, u0 + (u1 - u0) * (k + R(.1, .9)) / n, R(.48, .56)]); }); return a; } });
})();
