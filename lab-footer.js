/* Footer lab: pigeons on wires.
   Look and behaviour studied from Dakota's photos of pigeons on a street-light arm:
   dark grey bodies with a lighter folded-wing panel and two dark bars, darker head, a hint of sheen on the neck.
   Perched: look toward a nearby pointer, preen, stretch a wing, fluff and shake, flap for balance, doze when left alone,
   keep their spacing and shuffle aside when a neighbour lands.
   Startled: crouch, burst off with a wing clap, neighbours follow, the group loops around and lands again. */
(() => {
const R = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const COL = { body: '#454543', head: '#323230', wing: '#5d5d5b', bar: 'rgba(40,40,39,.55)', tail: '#2c2c2b', leg: '#4f4f4d', sheen: 'rgba(190,190,185,.16)' };

// ---------- perched pigeon, side view, facing +x, feet at (21, 30)
const P_BODY = new Path2D('M31 12.5C33.2 14.6 33.6 17.6 32.6 20.4 31.2 24 27.4 26.2 22.8 26.2 18.6 26.2 15 24.6 12.6 22.2L3.6 23.2 3.2 20.6 12.2 16.6C15 13.6 19.8 11.6 24.6 11.4 27 11.3 29.4 11.6 31 12.5Z');
const P_NECK = new Path2D('M27 13.2C27.4 10.6 28.8 8.8 30.6 8.6L33 12.2C32.4 13.4 31.8 14.2 31 14.8Z');
const P_WING = new Path2D('M14.2 17C17.6 14.2 22.8 13.2 27.2 14.2 28.8 17.4 27.4 21.2 23.6 22.6 19.6 23.6 16 22.6 13.4 20.6Z');
const P_BARS = new Path2D('M19.4 16.4C20.6 18 21.2 19.6 21.3 21.4M22.4 15.6C23.6 17.4 24.2 19 24.3 20.8');
const P_TAIL = new Path2D('M3.2 20.6 6 19.4 6.6 22.6 3.6 23.2Z');
// head, drawn around the neck pivot (27.5, 11.5) so it can turn, dip and tuck
const P_HEAD = new Path2D(); P_HEAD.ellipse(1.5, -2.8, 3.3, 3.1, 0, 0, Math.PI * 2); P_HEAD.moveTo(4.3, -3.7); P_HEAD.lineTo(6.9, -2.7); P_HEAD.lineTo(4.5, -1.8); P_HEAD.closePath();
const NECK = { x: 29, y: 11 };

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
  const S = { c, wires: [], birds: [], mouse: null, m: { x: 0, y: 0 }, sm: { x: 0, y: 0 }, focus: .3, lastMove: performance.now() };
  function size() { const d = Math.min(2, devicePixelRatio || 1); W = card.clientWidth; H = card.clientHeight; cv.width = W * d; cv.height = H * d; c.setTransform(d, 0, 0, d, 0, 0); S.W = W; S.H = H; }
  size();
  const gp = c.createPattern(noiseTile(180, cfg.grainAmp || 90), 'repeat');
  let now = performance.now();

  function newBird(o) { return Object.assign({ st: 'perch', face: Math.random() < .5 ? 1 : -1, act: null, next: R(1500, 7000), headRot: 0, headY: 0, fluff: 0, shake: 0, flapA: 0, stretch: 0, sq: 1, ph: R(0, 6) }, o); }
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
  const ACTS = ['preen', 'preen', 'stretch', 'fluff', 'flap', 'bob', 'turn', 'scratch'];
  function idle(b, dt) {
    const p = bpos(b), m = S.mouse;
    const dozing = now - S.lastMove > 9000;
    if (b.roam && b.stay && now > b.stay && !b.act) { b.stay = 0; S.birds.filter(o => o.roam && o.st === 'perch').forEach((o, i) => { o.stay = 0; setTimeout(() => takeoff(o, 1, i > 0), i * R(80, 200)); }); return; }
    if (m) { const d = Math.hypot(m.x - p.x, m.y - p.y + 8), r = (cfg.scare || 54) * (cfg.depth ? .5 + .5 * p.z : 1); if (d < r) return takeoff(b, m.x < p.x ? 1 : -1); if (d < r * 2.6) { b.face = m.x < p.x ? -1 : 1; b.headRot += (-.25 - b.headRot) * .15; b.alert = true; } else b.alert = false; }
    if (b.act) {
      const a = b.act; a.t += dt; const k = clamp(a.t / a.dur, 0, 1), bell = Math.sin(k * Math.PI);
      if (a.type === 'preen') { b.headRot = 1.25 * bell + Math.sin(a.t / 70) * .12 * bell; b.headY = 2.5 * bell; }
      if (a.type === 'stretch') b.stretch = bell;
      if (a.type === 'fluff') { b.fluff = k < .75 ? Math.min(1, k / .3) : 1 - (k - .75) / .25; b.shake = k > .7 && k < .9 ? Math.sin(a.t / 18) : 0; }
      if (a.type === 'flap') b.flapA = bell;
      if (a.type === 'bob') { b.headY = 2 * Math.sin(k * Math.PI * 4); }
      if (a.type === 'turn' && k > .5 && !a.done) { b.face *= -1; a.done = true; }
      if (a.type === 'scratch') { b.headRot = .5 * bell; b.scratch = bell; }
      if (a.type === 'shuffle') { b.u = a.from + (a.to - a.from) * (1 - Math.pow(1 - k, 2)); b.hop = Math.abs(Math.sin(k * Math.PI * 3)) * 1.6; }
      if (k >= 1) { b.act = null; b.headRot = b.headY = b.stretch = b.fluff = b.shake = b.scratch = b.hop = 0; b.next = R(2500, 9000); }
    } else if (!b.alert) {
      b.headRot += ((dozing ? .9 : 0) - b.headRot) * .03; b.headY += ((dozing ? 3.2 : 0) - b.headY) * .03; b.fluff += ((dozing ? .7 : 0) - b.fluff) * .02;
      if (!dozing && (b.next -= dt) <= 0) { const t = ACTS[(Math.random() * ACTS.length) | 0]; b.act = { type: t, t: 0, dur: { preen: 1400, stretch: 1100, fluff: 1300, flap: 500, bob: 700, turn: 300, scratch: 900 }[t] }; }
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
    c.save(); if (blur > .2) c.filter = `blur(${blur}px)`;
    const sq = b.sq * (1 + b.fluff * .1), sh = b.shake * .8, hop = b.hop || 0;
    c.translate(x + sh, y - hop); c.scale(b.face * s * (1 + b.fluff * .08), s * sq); c.translate(-21, -30);
    // legs
    c.strokeStyle = COL.leg; c.lineWidth = 1.4; c.beginPath(); c.moveTo(20.4, 25.6); c.lineTo(20.2, 30); c.moveTo(23, 25.6); c.lineTo(23.2, 30);
    if (b.scratch) { c.moveTo(23, 24); c.lineTo(26 + b.scratch * 2, 18 - b.scratch * 6); }
    c.stroke();
    // far wing raised for balance
    if (b.flapA > .02) { c.save(); c.translate(22, 14); c.scale(.55, .55); c.fillStyle = COL.wing; c.globalAlpha = .9; c.fill(wingPath(Math.sin(now / 55) * .5 + .5 * b.flapA, b.flapA)); c.restore(); }
    c.fillStyle = COL.tail; c.fill(P_TAIL);
    c.fillStyle = COL.body; c.fill(P_BODY);
    // folded wing panel with its two dark bars; stretched out behind when stretching
    c.save(); if (b.stretch) { c.translate(14, 19); c.rotate(.5 * b.stretch); c.scale(1 + .5 * b.stretch, 1); c.translate(-14, -19); }
    c.fillStyle = COL.wing; c.fill(P_WING); c.strokeStyle = COL.bar; c.lineWidth = 1.1; c.stroke(P_BARS); c.restore();
    // near wing flapping for balance
    if (b.flapA > .02) { c.save(); c.translate(22, 15); c.scale(.6, .6); c.fillStyle = COL.wing; c.fill(wingPath(Math.sin(now / 55 + 1) * .6 + .3 * b.flapA, b.flapA)); c.restore(); }
    // neck sheen, head on its pivot
    c.fillStyle = COL.body; c.fill(P_NECK); c.fillStyle = COL.sheen; c.beginPath(); c.ellipse(30.4, 13, 2, 2.8, -.4, 0, 7); c.fill();
    c.save(); c.translate(NECK.x, NECK.y + b.headY); c.rotate(b.headRot); c.fillStyle = COL.head; c.fill(P_HEAD); c.fillStyle = '#8c8c88'; c.beginPath(); c.arc(2.6, -3.4, .5, 0, 7); c.fill(); c.restore();
    c.restore();
  }
  function drawFlying(b, s, blur) {
    const face = b.vx >= 0 ? 1 : -1; let ang = clamp(Math.atan2(b.vy, Math.abs(b.vx)), -.7, .55), a = Math.sin(b.ph), spread = 1;
    if (b.mode === 'glide') { a = .45; spread = 1; }
    if (b.mode === 'flare') { ang = -.6; a = Math.sin(b.ph) * .7 + .35; spread = 1.1; }
    c.save(); if (blur > .2) c.filter = `blur(${blur}px)`;
    c.translate(b.x, b.y); c.scale(face * s * 1.1, s * 1.1); c.rotate(ang);
    c.fillStyle = COL.wing; c.globalAlpha = .7; c.fill(wingPath(clamp(a + .15, -1, 1), spread * .9)); c.globalAlpha = 1;
    c.fillStyle = COL.body; c.fill(F_BODY); c.fillStyle = COL.head; c.beginPath(); c.ellipse(7, -1.6, 3.6, 2.8, 0, 0, 7); c.fill();
    if (b.mode === 'flare') { c.strokeStyle = COL.leg; c.lineWidth = 1.1; c.beginPath(); c.moveTo(-1, 2.6); c.lineTo(1, 7); c.moveTo(1.5, 2.6); c.lineTo(3.4, 6.6); c.stroke(); }
    c.fillStyle = COL.wing; c.fill(wingPath(a, spread)); c.restore();
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
    c.clearRect(0, 0, W, H); if (cfg.sky) cfg.sky(c, W, H, S);
    if (cfg.back) cfg.back(c, W, H, S, { par, blurFor });
    S.wires.forEach(w => { c.save(); c.strokeStyle = w.col; c.globalAlpha = w.op; const bl = blurFor((w.za + w.zb) / 2); if (bl > .2) c.filter = `blur(${bl * .6}px)`; c.lineWidth = w.lw * (cfg.depth ? (.45 + .55 * (w.za + w.zb) / 2) : 1); c.beginPath(); for (let i = 0; i <= 24; i++) { const u = i / 24, p = pt(w, u); i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y); } c.stroke(); c.restore(); });
    if (cfg.front) cfg.front(c, W, H, S, { par, blurFor, now });
    S.birds.forEach(b => {
      if (b.st === 'away') { if (!b.roam && (b.t -= dt) <= 0) { const side = Math.random() < .5 ? -1 : 1; Object.assign(b, { st: 'fly', x: side > 0 ? W + 50 : -50, y: R(14, H * .3), vx: -side * 260, vy: R(-20, 30), ph: 0, fhz: R(9, 10), mode: 'flap', bt: 0, burst: R(.5, .9), wps: [{ x: side > 0 ? W * R(.3, .6) : W * R(.4, .7), y: R(14, H * .3) }, 'home'] }); } return; }
      if (b.st === 'crouch') { b.t += dt; b.sq = 1 - .18 * Math.sin(Math.min(1, b.t / 80) * Math.PI / 2); if (b.t > 80) { b.sq = 1; launch(b); } }
      else if (b.st === 'settle') { b.t += dt; b.sq = 1 - .14 * Math.sin(Math.min(1, b.t / 170) * Math.PI); b.flapA = Math.max(0, 1 - b.t / 520); if (b.t > 520) { b.st = 'perch'; b.sq = 1; b.next = R(800, 4000); } }
      else if (b.st === 'perch') idle(b, dt);
      else if (b.st === 'fly') fly(b, dt);
      if (b.st === 'fly') { const z = b.roam ? .8 : (b.z || 1), s = b.s * (cfg.depth ? z : 1); drawFlying(b, s, b.roam ? 0 : .4); }
      else if (b.st !== 'away') { const p = bpos(b); drawPerched(b, p.x, p.y, b.s * (cfg.depth ? p.z : 1), blurFor(p.z) * .5); }
    });
    c.globalAlpha = cfg.grain || .07; c.globalCompositeOperation = 'overlay'; c.fillStyle = gp; c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
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
    S.far.forEach(p => { const o = par(p.z), bl = blurFor(p.z); c.save(); if (bl > .2) c.filter = `blur(${bl}px)`; c.globalAlpha = .55 + .45 * p.z / .42; c.fillStyle = '#2e2e2c'; c.fillRect(p.x + o.x - 4 * p.z, p.top + o.y, 8 * p.z + .6, p.h); c.fillRect(p.x + o.x - 22 * p.z, p.top + o.y + 10 * p.z, 44 * p.z, Math.max(1, 3 * p.z)); c.restore(); }); },
  front(c, W, H, S, { par, blurFor, now }) { const px = S.px, o = par(1), bl = blurFor(1); let sh = 0; if (S.shake) { const a = (now - S.shake) / 1000; if (a < .6) sh = Math.sin(a * 60) * 2.2 * Math.exp(-a * 7); }
    c.save(); if (bl > .2) c.filter = `blur(${bl}px)`; c.translate(o.x + sh, o.y); const g = c.createLinearGradient(px - 10, 0, px + 10, 0); g.addColorStop(0, '#4a4844'); g.addColorStop(.4, '#2c2a27'); g.addColorStop(1, '#3e3c38'); c.fillStyle = g;
    c.beginPath(); c.moveTo(px - 7, 40); c.lineTo(px + 7, 40); c.lineTo(px + 11, H + 10); c.lineTo(px - 11, H + 10); c.fill();
    c.fillStyle = '#262522'; c.save(); c.translate(px, 76); c.rotate(-.06); c.fillRect(-72, 0, 144, 6); c.restore(); c.save(); c.translate(px, 124); c.rotate(-.05); c.fillRect(-52, 0, 104, 5); c.restore();
    S.arms.forEach(([x, y]) => { c.fillRect(x - 3, y - 2, 6, 10); c.beginPath(); c.ellipse(x, y - 1, 5, 2, 0, 0, 7); c.fill(); });
    c.fillRect(px + 10, 150, 18, 32); c.fillRect(px + 9, 147, 20, 4); c.strokeStyle = '#2a2926'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(px - 8, 190); c.bezierCurveTo(px - 30, 200, px - 30, 232, px - 12, 236); c.bezierCurveTo(px, 238, px + 2, 220, px - 8, 216); c.stroke(); c.restore(); },
  focusTarget(S) { if (!S.mouse) return .45; const d = Math.abs(S.mouse.x - S.px); return d < 120 ? 1 : Math.max(.2, .55 - (S.px - S.mouse.x) / S.W * .6); },
  knockHit: (S, m) => Math.abs(m.x - (S.px - S.sm.x * 26)) < 16 && m.y > 36,
  perch: () => { const a = []; [[0, [.12, .26, .42]], [1, [.16, .32]], [4, [.22, .4]], [5, [.3, .6]], [2, [.3, .6]], [3, [.4, .72]], [6, [.4]], [8, [.5]]].forEach(([wi, us]) => us.forEach(u => a.push([wi, u, .85]))); return a; } });
})();
