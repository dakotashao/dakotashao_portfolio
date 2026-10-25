/* Card kit: fits a component stage into the card, and drives a demo cursor that sends real pointer/mouse events.
   Usage in a card file:
     <div id="stage" data-w="360" data-h="280"> ...component... </div>
     <script src="kit.js"></script>
     <script> KIT.demo(async c => { await c.move(180,140); await c.click(); }, { tint:'#2f6bff', reset(){...} }); </script>
   Parent page talks to it with postMessage: {type:'demo', on:true|false}. Kit posts {type:'demo-state', on} back. */
(function () {
  const KIT = (window.KIT = {});
  const stage = document.getElementById("stage");
  const W = +stage.dataset.w, H = +stage.dataset.h;
  const Q = new URLSearchParams(location.search);
  const pad = +(Q.get("pad") || stage.dataset.pad || 0);

  // ---- layout: stage is a fixed design box, scaled to fit and centered
  const css = document.createElement("style");
  css.textContent = `
    html,body{margin:0;height:100%;overflow:hidden;background:transparent}
    body{display:block;position:relative}
    #stage{position:absolute;left:50%;top:50%;width:${W}px;height:${H}px;transform-origin:50% 50%}
    .kit-cursor{position:absolute;left:0;top:0;width:32px;height:32px;margin:-3.87px 0 0 -7.33px;pointer-events:none;z-index:2147483647;
      filter:drop-shadow(rgba(0,0,0,.3) 0 2px 3px);overflow:visible;transition:scale .12s cubic-bezier(.28,1.2,.36,1);animation:kit-in .2s cubic-bezier(.28,1.2,.36,1) both}
    .kit-cursor[data-down="true"]{scale:.88}
    .kit-cursor path{fill:var(--tint,#fff);stroke:#fff;stroke-width:1.75px;stroke-linejoin:round}
    .kit-cursor.out{animation:kit-out .18s ease both}
    @keyframes kit-in{from{opacity:0;scale:.5}}
    @keyframes kit-out{to{opacity:0;scale:.5}}`;
  document.head.appendChild(css);
  KIT.scale = 1;
  function fit() {
    const max = +(Q.get("max") || 1);
    const s = Math.min((innerWidth - pad * 2) / W, (innerHeight - pad * 2) / H, max) * +(Q.get("zoom") || 1);
    KIT.scale = s;
    stage.style.transform = `translate(-50%,-50%) scale(${s})`;
  }
  addEventListener("resize", fit); fit();

  // ---- ?soft=1: in the gallery, quiet the big soft drop shadows (the originals sit on a #F6F6F6 page; here they sit on a grey card).
  // Rewrites the stylesheet rules themselves, so state changes driven by classes still work. Inline styles are left alone.
  if (Q.get("soft") === "1") {
    const K = 0.45;
    const splitTop = v => { const out = []; let d = 0, cur = ""; for (const ch of v) { if (ch === "(") d++; if (ch === ")") d--; if (ch === "," && !d) { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); return out; };
    const soften = layer => {
      const m = layer.match(/rgba?\(([^)]+)\)/); if (!m) return layer;
      const lens = layer.replace(m[0], "").match(/-?[\d.]+px/g) || [];
      const blur = parseFloat(lens[2] || "0"); if (blur < 14) return layer;
      const parts = m[1].split(/[ ,\/]+/).filter(Boolean); const a = parts[3] != null ? parseFloat(parts[3]) * (parts[3].includes("%") ? .01 : 1) : 1;
      return layer.replace(m[0], `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${(a * K).toFixed(3)})`);
    };
    const walk = rules => { for (const r of rules) {
      if (r.cssRules) walk(r.cssRules);
      if (!r.style) continue;
      const bs = r.style.getPropertyValue("box-shadow");
      if (bs && !bs.includes("var(") && bs !== "none") r.style.setProperty("box-shadow", splitTop(bs).map(soften).join(","), r.style.getPropertyPriority("box-shadow"));
      const fl = r.style.getPropertyValue("filter");
      if (fl && fl.includes("drop-shadow") && !fl.includes("var(")) r.style.setProperty("filter", fl.replace(/drop-shadow\(([^()]*(\([^)]*\))?[^()]*)\)/g, (all, inner) => "drop-shadow(" + soften(inner) + ")"));
    } };
    for (const sh of document.styleSheets) { try { if (sh.ownerNode !== css) walk(sh.cssRules); } catch (e) {} }
  }

  // ---- pointer capture shim so synthetic pointers don't throw
  const PID = 7;
  let captured = null;
  const sp = Element.prototype.setPointerCapture, rp = Element.prototype.releasePointerCapture, hp = Element.prototype.hasPointerCapture;
  Element.prototype.setPointerCapture = function (id) { if (id === PID) { captured = this; return; } try { return sp.call(this, id); } catch (e) {} };
  Element.prototype.releasePointerCapture = function (id) { if (id === PID) { if (captured === this) captured = null; return; } try { return rp.call(this, id); } catch (e) {} };
  Element.prototype.hasPointerCapture = function (id) { if (id === PID) return captured === this; try { return hp.call(this, id); } catch (e) { return false; } };

  // ---- cursor
  let cur = null, pos = { x: W / 2, y: H + 30 }, hoverEl = null, isDown = false, run = 0, tint = "#17181B";
  function ensureCursor() {
    if (cur) return;
    cur = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    cur.setAttribute("class", "kit-cursor"); cur.setAttribute("viewBox", "0 0 24 24"); cur.setAttribute("aria-hidden", "true");
    cur.innerHTML = '<path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.85a.5.5 0 0 0-.85.35Z"/>';
    cur.style.setProperty("--tint", tint);
    stage.appendChild(cur);
    place();
  }
  function place() { if (cur) cur.style.transform = `translate(${pos.x}px,${pos.y}px)`; }
  function client(x, y) { const r = stage.getBoundingClientRect(); return { cx: r.left + x * KIT.scale, cy: r.top + y * KIT.scale }; }
  function target(cx, cy) { return document.elementFromPoint(cx, cy) || document.body; }
  function chain(el) { const a = []; for (let e = el; e && e.nodeType === 1; e = e.parentElement) a.push(e); return a; }
  function fire(el, type, cx, cy, extra) {
    const base = { bubbles: true, cancelable: true, composed: true, clientX: cx, clientY: cy, screenX: cx, screenY: cy, view: window,
      button: 0, buttons: isDown ? 1 : 0, ...extra };
    const pointer = type.startsWith("pointer");
    const ev = pointer ? new PointerEvent(type, { pointerId: PID, pointerType: "mouse", isPrimary: true, width: 1, height: 1, pressure: isDown ? 0.5 : 0, ...base })
                       : new MouseEvent(type, base);
    if (type.endsWith("enter") || type.endsWith("leave")) Object.defineProperty(ev, "bubbles", { value: false });
    el.dispatchEvent(ev);
  }
  function setHover(el, cx, cy) {
    if (el === hoverEl) return;
    const prev = hoverEl ? chain(hoverEl) : [], next = el ? chain(el) : [];
    if (hoverEl) { fire(hoverEl, "pointerout", cx, cy); fire(hoverEl, "mouseout", cx, cy); }
    prev.filter(e => !next.includes(e)).forEach(e => { e.removeAttribute("data-kit-hover"); fire(e, "pointerleave", cx, cy); fire(e, "mouseleave", cx, cy); });
    if (el) { fire(el, "pointerover", cx, cy); fire(el, "mouseover", cx, cy); }
    next.filter(e => !prev.includes(e)).reverse().forEach(e => { e.setAttribute("data-kit-hover", ""); fire(e, "pointerenter", cx, cy); fire(e, "mouseenter", cx, cy); });
    hoverEl = el;
  }
  function moveEvents() {
    const { cx, cy } = client(pos.x, pos.y);
    const el = target(cx, cy);
    if (!isDown || !captured) setHover(el, cx, cy);
    const to = captured || el;
    fire(to, "pointermove", cx, cy); fire(isDown && downEl ? downEl : el, "mousemove", cx, cy);
  }
  let downEl = null;

  const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  function frame() { return new Promise(r => requestAnimationFrame(r)); }
  function alive(id) { if (id !== run) throw new Error("demo-stopped"); }

  function makeCtl(id) {
    const c = {
      async wait(ms) { const t0 = performance.now(); while (performance.now() - t0 < ms) { alive(id); await frame(); } alive(id); },
      async move(x, y, ms, fn) {
        ensureCursor();
        const x0 = pos.x, y0 = pos.y, d = Math.hypot(x - x0, y - y0);
        ms = ms ?? Math.max(260, Math.min(900, d * 2.2));
        const e = fn || (isDown ? ease : easeOut);
        const t0 = performance.now();
        // a slight arc so motion reads as a hand
        const bow = isDown ? 0 : Math.min(18, d * 0.08);
        while (true) {
          alive(id);
          const t = Math.min(1, (performance.now() - t0) / ms), k = e(t);
          const arc = Math.sin(Math.PI * k) * bow;
          const nx = -(y - y0) / (d || 1), ny = (x - x0) / (d || 1);
          pos = { x: x0 + (x - x0) * k + nx * arc, y: y0 + (y - y0) * k + ny * arc };
          place(); moveEvents();
          if (t >= 1) break;
          await frame();
        }
      },
      async down() {
        alive(id); ensureCursor(); isDown = true; cur.dataset.down = "true";
        const { cx, cy } = client(pos.x, pos.y); downEl = target(cx, cy);
        fire(downEl, "pointerdown", cx, cy, { buttons: 1 }); fire(downEl, "mousedown", cx, cy, { buttons: 1 });
        if (downEl.focus && downEl.matches("button,input,[tabindex],a,select,textarea,label")) try { downEl.focus({ preventScroll: true }); } catch (e) {}
        await c.wait(70);
      },
      async up() {
        alive(id);
        const { cx, cy } = client(pos.x, pos.y), el = target(cx, cy);
        isDown = false; if (cur) cur.dataset.down = "false";
        const to = captured || el;
        fire(to, "pointerup", cx, cy, { buttons: 0 }); fire(el, "mouseup", cx, cy, { buttons: 0 });
        if (downEl && (downEl === el || downEl.contains(el) || el.contains(downEl))) fire(el, "click", cx, cy, { buttons: 0, detail: 1 });
        if (captured) { const cap = captured; captured = null; fire(cap, "lostpointercapture", cx, cy); }
        downEl = null;
        await c.wait(60);
      },
      async click(x, y, ms) { if (x != null) await c.move(x, y, ms); await c.down(); await c.wait(90); await c.up(); },
      async hold(ms) { await c.down(); await c.wait(ms); },
      async drag(x, y, ms, fn) { if (!isDown) await c.down(); await c.move(x, y, ms ?? 700, fn || ease); },
      async leave() { await c.move(pos.x, H + 40, 400); setHover(null, 0, 0); },
      get pos() { return { ...pos }; },
      el(sel) { return stage.querySelector(sel); },
      // centre of an element, in stage (design) coordinates
      at(selOrEl, fx = 0.5, fy = 0.5) {
        const el = typeof selOrEl === "string" ? stage.querySelector(selOrEl) : selOrEl;
        const r = el.getBoundingClientRect(), s = stage.getBoundingClientRect();
        return [(r.left - s.left + r.width * fx) / KIT.scale, (r.top - s.top + r.height * fy) / KIT.scale];
      },
    };
    return c;
  }

  let script = null, opts = {};
  KIT.demo = (fn, o = {}) => { script = fn; opts = o; tint = o.tint || tint; if (/[?&]demo=1/.test(location.search)) KIT.start(); };
  KIT.playing = false;
  function post(on) { try { parent.postMessage({ type: "demo-state", on, id: location.pathname }, "*"); } catch (e) {} }
  KIT.start = async () => {
    if (!script) return;
    const id = ++run; KIT.playing = true; post(true);
    pos = { x: W * 0.62, y: H + 24 };
    try { if (opts.reset) await opts.reset(); if (opts.cursor !== false) ensureCursor(); await script(makeCtl(id)); await makeCtl(id).wait(500); }
    catch (e) { if (e.message !== "demo-stopped") console.error(e); }
    if (id === run) KIT.stop(true);
  };
  KIT.stop = (natural) => {
    if (!natural) run++;
    if (isDown) { isDown = false; const { cx, cy } = client(pos.x, pos.y); const to = captured || target(cx, cy); fire(to, "pointerup", cx, cy); fire(to, "mouseup", cx, cy); captured = null; downEl = null; }
    setHover(null, 0, 0);
    if (cur) { const c0 = cur; cur = null; c0.classList.add("out"); setTimeout(() => c0.remove(), 200); }
    if (KIT.playing) { KIT.playing = false; post(false); }
  };
  // a real hand takes over from the demo
  addEventListener("pointerdown", e => { if (e.isTrusted && KIT.playing) KIT.stop(); }, true);
  // a real click on empty card space asks the gallery to open the detail view
  addEventListener("click", e => {
    if (e.isTrusted && (e.target === document.body || e.target === document.documentElement || e.target === stage))
      try { parent.postMessage({ type: "open-detail" }, "*"); } catch (err) {}
  });  // tell the gallery whether this block has a demo, so it can hide the play button
  addEventListener("load", () => { try { parent.postMessage({ type: "demo-avail", on: !!script }, "*"); } catch (e) {} });
  addEventListener("message", e => {
    const d = e.data || {};
    if (d.type === "demo") d.on ? KIT.start() : KIT.stop();
  });
})();

/* ---- Dark mode, driven by the portfolio's theme (?theme=dark, then {type:'theme', dark} messages).
   Every colour in the block's own stylesheets and markup is remapped once and kept, so the switch can go both ways:
   neutrals flip their lightness (white card -> #242424, ink -> near white), pale tints become deep tints,
   strong accents stay. Shadows stay dark. Blocks marked data-notheme (photos, film, booklets) are left alone. */
(function () {
  const stage = document.getElementById("stage");
  if (!stage) return;
  // an iframe whose colour-scheme differs from the page gets an opaque backdrop, so always match the page
  const scheme = dark => { document.documentElement.style.colorScheme = dark ? "dark" : "light"; };
  if (stage.hasAttribute("data-notheme")) {
    KIT.dark = false; KIT.theme = d => scheme(!!d);
    if (new URLSearchParams(location.search).get("theme") === "dark") scheme(true);
    addEventListener("message", e => { const d = e.data || {}; if (d.type === "theme") scheme(d.dark); });
    return;
  }
  const SKIP = /^(box-shadow|text-shadow|filter|-webkit-filter|backdrop-filter)$/;
  const NAMED = { white: "#ffffff", black: "#000000" };
  const TOKEN = /#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|\b(?:white|black)\b/gi;
  const parse = t => {
    t = NAMED[t.toLowerCase()] || t;
    if (t[0] === "#") { let h = t.slice(1); if (h.length <= 4) h = [...h].map(c => c + c).join("");
      return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1]; }
    const n = t.match(/[\d.]+%?/g); if (!n || n.length < 3) return null;
    if (/^hsl/i.test(t)) { const [hh, ss, ll] = n.map(parseFloat), s = ss / 100, l = ll / 100, k = x => (x + hh / 30) % 12, a = s * Math.min(l, 1 - l), f = x => l - a * Math.max(-1, Math.min(k(x) - 3, 9 - k(x), 1));
      return [f(0) * 255, f(8) * 255, f(4) * 255, n[3] != null ? parseFloat(n[3]) * (n[3].includes("%") ? .01 : 1) : 1]; }
    return [+parseFloat(n[0]), +parseFloat(n[1]), +parseFloat(n[2]), n[3] != null ? parseFloat(n[3]) * (n[3].includes("%") ? .01 : 1) : 1];
  };
  function toHsl(r, g, b) { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
    if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
    return [h, s, l]; }
  const hsl = (h, s, l, a) => `hsla(${h.toFixed(1)}, ${(s * 100).toFixed(1)}%, ${(l * 100).toFixed(1)}%, ${+a.toFixed(3)})`;
  // iOS-style dark: surfaces become plain neutral greys (no tint), text goes near white, system accents stay as they are.
  // white card -> #242424, light wells and rails -> #2e2e2e-#3a3a3a, ink -> #eaeaea, secondary text -> mid grey
  function map(t, ink) {
    const c = parse(t); if (!c) return t;
    const [h, s, l] = toHsl(c[0], c[1], c[2]);
    const grey = L => { const v = Math.round(Math.max(0, Math.min(1, L)) * 255); return `rgba(${v}, ${v}, ${v}, ${+c[3].toFixed(3)})`; };
    if (s < .25 || l > .9) {                       // neutrals and near-white tints
      if (l < .3) return grey(.95 - l * .6);         // ink -> near white
      return grey(.14 + (1 - l) * .8);               // surfaces and secondary text flip, staying grey
    }
    if (l > .78) return grey(.14 + (1 - l) * .8);    // pale tinted surfaces -> plain grey too
    if (ink && l < .3) return hsl(h, s, .6, c[3]);   // dark coloured text: readable on grey
    return t;                                       // accents (blue, red badges, orange) stay
  }
  const remap = (v, ink) => v.replace(TOKEN, t => map(t, ink));
  const INK = /^(color|fill|stroke|caret-color|outline-color|text-decoration-color|-webkit-text-fill-color)$/;
  const jobs = [];   // [apply(dark)]
  const walk = rules => { for (const r of rules) {
    if (r.cssRules) walk(r.cssRules);
    if (!r.style) continue;
    for (let i = 0; i < r.style.length; i++) {
      const p = r.style[i]; if (SKIP.test(p)) continue;
      const v = r.style.getPropertyValue(p); if (!v || !TOKEN.test(v)) { TOKEN.lastIndex = 0; continue; } TOKEN.lastIndex = 0;
      const pr = r.style.getPropertyPriority(p), d = remap(v, INK.test(p) || p.startsWith("--")), st = r.style;
      jobs.push(dark => st.setProperty(p, dark ? d : v, pr));
    }
  } };
  for (const sh of document.styleSheets) { try { walk(sh.cssRules); } catch (e) {} }
  stage.querySelectorAll("[fill],[stroke],[stop-color],[style]").forEach(el => {
    for (const a of ["fill", "stroke", "stop-color"]) { const v = el.getAttribute(a); if (v && TOKEN.test(v)) { TOKEN.lastIndex = 0; const d = remap(v, true); jobs.push(dark => el.setAttribute(a, dark ? d : v)); } TOKEN.lastIndex = 0; }
    const sv = el.getAttribute("style"); if (sv && TOKEN.test(sv)) { TOKEN.lastIndex = 0; const d = remap(sv); jobs.push(dark => el.setAttribute("style", dark ? d : sv)); } TOKEN.lastIndex = 0;
  });
  let on = false;
  KIT.dark = false;
  KIT.theme = dark => { dark = !!dark; if (dark === on) return; on = dark; KIT.dark = dark; jobs.forEach(j => j(dark)); scheme(dark); };
  if (new URLSearchParams(location.search).get("theme") === "dark") KIT.theme(true);
  addEventListener("message", e => { const d = e.data || {}; if (d.type === "theme") KIT.theme(d.dark); });
})();
