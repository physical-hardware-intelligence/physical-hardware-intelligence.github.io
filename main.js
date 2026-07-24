/* ============================================================
   Φ · Physical Hardware Intelligence — interactions
   ============================================================ */
(() => {
  "use strict";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  /* ============================================================
     SHARED SO-ARM101 RENDERER
     One articulated arm, drawn as a fine ink line-drawing.
     Used by the hero (IK, cursor-driven) and the 03 diagram.
     6 DOF: base rotation · shoulder · elbow · wrist flex · wrist roll · gripper.
     ============================================================ */
  const INK = "#1B1712", PAPER = "#ECE7DC", BRACKET = "#E4DDCD", SERVO = "#C4B99F",
        SEAM = "rgba(27,23,18,.22)", ACCENT = "#B23A2E";
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  const seg = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);

  function drawBase(g, p0, S, hot) {
    g.strokeStyle = INK; g.lineWidth = 2;
    g.fillStyle = hot ? INK : SERVO; rr(g, p0.x - S * 0.19, p0.y + S * 0.02, S * 0.38, S * 0.4, 4); g.fill(); g.stroke();
    g.fillStyle = BRACKET; rr(g, p0.x - S * 0.62, p0.y + S * 0.36, S * 1.24, S * 0.15, 4); g.fill(); g.stroke();
    g.fillStyle = INK;
    [-S * 0.48, 0, S * 0.48].forEach(x => { g.beginPath(); g.arc(p0.x + x, p0.y + S * 0.435, 2, 0, 7); g.fill(); });
  }

  function drawBracket(g, a, b, w) {
    const ang = seg(a, b), len = dist(a, b);
    g.save(); g.translate(a.x, a.y); g.rotate(ang);
    g.fillStyle = BRACKET; g.strokeStyle = INK; g.lineWidth = 2;
    rr(g, -w * 0.1, -w / 2, len + w * 0.2, w, w * 0.34); g.fill(); g.stroke();
    g.strokeStyle = SEAM; g.lineWidth = 1;
    g.beginPath();
    g.moveTo(w * 0.2, -w * 0.5 + 4); g.lineTo(len - w * 0.2, -w * 0.5 + 4);
    g.moveTo(w * 0.2, w * 0.5 - 4); g.lineTo(len - w * 0.2, w * 0.5 - 4); g.stroke();
    g.restore();
  }

  function drawServo(g, c, ang, sw, sh, hot) {
    g.save(); g.translate(c.x, c.y); g.rotate(ang);
    g.fillStyle = hot ? INK : SERVO; g.strokeStyle = INK; g.lineWidth = 2;
    rr(g, -sw * 0.5, -sh * 0.5, sw, sh, sh * 0.16); g.fill(); g.stroke();
    g.fillStyle = hot ? PAPER : INK;
    const mx = sw * 0.5 - 4, my = sh * 0.5 - 4;
    [[-mx, -my], [mx, -my], [-mx, my], [mx, my]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 1.5, 0, 7); g.fill(); });
    g.fillStyle = hot ? ACCENT : PAPER; g.strokeStyle = INK; g.lineWidth = 1.8;
    g.beginPath(); g.arc(0, 0, sh * 0.3, 0, 7); g.fill(); g.stroke();
    g.strokeStyle = hot ? "rgba(236,231,220,.55)" : SEAM; g.lineWidth = 1;
    for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * sh * 0.26, Math.sin(a) * sh * 0.26); g.stroke(); }
    g.fillStyle = hot ? PAPER : INK; g.beginPath(); g.arc(0, 0, sh * 0.08, 0, 7); g.fill();
    g.restore();
  }

  // wrist-roll collar — a short band around the last link
  function drawRoll(g, c, ang, S, hot) {
    g.save(); g.translate(c.x, c.y); g.rotate(ang);
    g.fillStyle = hot ? INK : SERVO; g.strokeStyle = INK; g.lineWidth = 2;
    rr(g, -S * 0.09, -S * 0.16, S * 0.18, S * 0.32, S * 0.04); g.fill(); g.stroke();
    g.strokeStyle = hot ? "rgba(236,231,220,.55)" : SEAM; g.lineWidth = 1;
    [-S * 0.03, S * 0.03].forEach(x => { g.beginPath(); g.moveTo(x, -S * 0.15); g.lineTo(x, S * 0.15); g.stroke(); });
    g.restore();
  }

  function drawGripper(g, pos, ang, open, hot) {
    const S = window.__armS || 120;
    g.save(); g.translate(pos.x, pos.y); g.rotate(ang);
    g.fillStyle = hot ? INK : BRACKET; g.strokeStyle = INK; g.lineWidth = 2;
    rr(g, -S * 0.14, -S * 0.2, S * 0.22, S * 0.4, S * 0.05); g.fill(); g.stroke();
    const jl = S * 0.42, jw = S * 0.11, gap = S * (0.05 + open * 0.12);
    [-1, 1].forEach(s => {
      const cy = s * (gap + jw / 2);
      rr(g, S * 0.06, cy - jw / 2, jl, jw, jw * 0.35); g.fill(); g.stroke();
      g.save(); g.fillStyle = hot ? ACCENT : INK; g.globalAlpha = hot ? .6 : .3;
      rr(g, S * 0.06 + jl * 0.58, s < 0 ? cy + jw * 0.15 : cy - jw * 0.5, jl * 0.3, jw * 0.35, 1); g.fill();
      g.restore();
    });
    g.restore();
  }

  // draw the whole arm; returns the 6 DOF joint positions [J1..J6]
  function drawSO101(g, P, S, opt) {
    const [p0, p1, p2, ee] = P, hot = opt.hot || 0;
    window.__armS = S;
    g.lineJoin = "round"; g.lineCap = "round";
    drawBase(g, p0, S, hot === 1);
    drawBracket(g, p0, p1, S * 0.30);
    drawBracket(g, p1, p2, S * 0.25);
    drawBracket(g, p2, ee, S * 0.19);
    const roll = { x: p2.x + (ee.x - p2.x) * 0.55, y: p2.y + (ee.y - p2.y) * 0.55 };
    drawServo(g, p0, seg(p0, p1), S * 0.48, S * 0.38, hot === 2);
    drawServo(g, p1, seg(p1, p2), S * 0.40, S * 0.32, hot === 3);
    drawServo(g, p2, seg(p2, ee), S * 0.30, S * 0.25, hot === 4);
    drawRoll(g, roll, seg(p2, ee), S, hot === 5);
    drawGripper(g, ee, seg(p2, ee), opt.open, hot === 6);
    return [{ x: p0.x, y: p0.y + S * 0.22 }, p0, p1, p2, roll, ee];
  }

  /* joint reference (shared) */
  const JOINTS = {
    1: ["J1 · Base rotation", "Rotates the whole arm left and right about the vertical axis — how it aims across the table."],
    2: ["J2 · Shoulder", "Lifts the arm up and down. It carries the most load, so it uses the strongest gearing."],
    3: ["J3 · Elbow", "Bends the forearm to reach in and out — the difference between a near and a far grab."],
    4: ["J4 · Wrist flex", "Tilts the gripper up and down to line it up with an object's face."],
    5: ["J5 · Wrist roll", "Spins the gripper around its own axis to orient the grasp."],
    6: ["J6 · Gripper", "The one actuated finger pair — opens and closes to actually pick things up."],
  };

  /* ---------- nav ---------- */
  const nav = $("#nav"), toggle = $("#navToggle"), links = $("#navLinks");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 40);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
  });
  $$("#navLinks a").forEach(a => a.addEventListener("click", () => {
    links.classList.remove("open"); toggle.setAttribute("aria-expanded", "false");
  }));

  /* ---------- scroll reveal ---------- */
  if ("IntersectionObserver" in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    $$(".reveal").forEach(el => io.observe(el));
  } else { $$(".reveal").forEach(el => el.classList.add("in")); }

  /* ---------- learning-loop ring ---------- */
  (function ring() {
    const wrap = $("#loopRing"); if (!wrap) return;
    const STEPS = [
      ["Teleoperate", "Drive the follower by moving the leader arm by hand."],
      ["Record", "Capture synced camera and joint data into a dataset."],
      ["Train", "Fit a policy — ACT, Diffusion, or a VLA — to the demos."],
      ["Evaluate", "Roll it out on the real arm against a success rubric."],
      ["Deploy", "Run on-robot or at the edge, then collect more data."],
    ];
    const nodes = $$(".lnode", wrap), prog = $(".ring-progress", wrap);
    const C = 722.6;
    const rcIdx = $("#rcIdx"), rcTitle = $("#rcTitle"), rcBody = $("#rcBody");
    let cur = -1, timer = null;
    const set = (i) => {
      cur = i;
      nodes.forEach(n => n.classList.toggle("active", +n.dataset.i === i));
      prog.style.strokeDashoffset = C * (1 - i / 5);
      rcIdx.textContent = String(i + 1).padStart(2, "0") + " / 05";
      rcTitle.textContent = STEPS[i][0]; rcBody.textContent = STEPS[i][1];
    };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    const play = () => { if (reduce) return; stop(); timer = setInterval(() => set((cur + 1) % 5), 2600); };
    nodes.forEach(n => {
      const i = +n.dataset.i, pick = () => { set(i); stop(); };
      n.addEventListener("click", pick);
      n.addEventListener("mouseenter", pick);
      n.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
    });
    wrap.addEventListener("mouseleave", play);
    set(0);
    if ("IntersectionObserver" in window && !reduce)
      new IntersectionObserver((es) => es.forEach(e => e.isIntersecting ? play() : stop()), { threshold: 0.35 }).observe(wrap);
  })();

  /* ---------- scroll-spy nav ---------- */
  (function spy() {
    const map = new Map();
    $$("#navLinks a").forEach(a => { const id = a.getAttribute("href"); if (id && id.startsWith("#")) map.set(id.slice(1), a); });
    if (!map.size || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { map.forEach(a => a.classList.remove("active")); const a = map.get(e.target.id); if (a) a.classList.add("active"); }
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    [...map.keys()].forEach(id => { const el = document.getElementById(id); if (el) io.observe(el); });
  })();

  /* ============================================================
     HERO ARM — FABRIK IK, gripper follows the cursor / finger
     ============================================================ */
  (function heroArm() {
    const canvas = $("#armCanvas"); if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0, base, lens, pts, target, aim, hoverActive = false, autoT = 0;

    function layout() {
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      base = { x: W * 0.5, y: H * 0.82 };
      const u = Math.min(H, 780);
      lens = [u * 0.36, u * 0.31, u * 0.17];
      pts = [{ x: base.x, y: base.y }, { x: base.x, y: base.y - lens[0] },
             { x: base.x, y: base.y - lens[0] - lens[1] }, { x: base.x, y: base.y - lens[0] - lens[1] - lens[2] }];
      if (!target) target = { x: base.x, y: base.y - 300 };
      if (!aim) aim = { x: target.x, y: target.y };
    }

    function fabrik(t) {
      const total = lens[0] + lens[1] + lens[2], reach = dist(base, t);
      if (reach > total - 2) {
        const dx = (t.x - base.x) / reach, dy = (t.y - base.y) / reach; let acc = 0;
        pts[0] = { x: base.x, y: base.y };
        for (let i = 1; i < 4; i++) { acc += lens[i - 1]; pts[i] = { x: base.x + dx * acc, y: base.y + dy * acc }; }
        return;
      }
      for (let it = 0; it < 10; it++) {
        pts[3] = { x: t.x, y: t.y };
        for (let i = 2; i >= 0; i--) { const d = dist(pts[i + 1], pts[i]) || 1e-6, r = lens[i] / d; pts[i] = { x: pts[i + 1].x + (pts[i].x - pts[i + 1].x) * r, y: pts[i + 1].y + (pts[i].y - pts[i + 1].y) * r }; }
        pts[0] = { x: base.x, y: base.y };
        for (let i = 1; i < 4; i++) { const d = dist(pts[i], pts[i - 1]) || 1e-6, r = lens[i - 1] / d; pts[i] = { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * r, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * r }; }
        if (dist(pts[3], t) < 0.5) break;
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      const t = { x: Math.max(28, Math.min(W - 28, target.x)), y: Math.max(28, Math.min(base.y - 20, target.y)) };
      aim.x += (t.x - aim.x) * 0.1; aim.y += (t.y - aim.y) * 0.1;
      fabrik(aim);
      drawSO101(ctx, pts, lens[0], { open: 0.5, hot: 0 });
    }

    window.addEventListener("mousemove", (ev) => {
      const r = canvas.getBoundingClientRect();
      if (ev.clientY <= r.bottom && ev.clientY >= r.top) { target = { x: ev.clientX - r.left, y: ev.clientY - r.top }; hoverActive = true; }
    }, { passive: true });
    window.addEventListener("mouseleave", () => hoverActive = false);
    let touching = false;
    const fromTouch = (ev) => { const t = ev.touches[0]; if (!t) return; const r = canvas.getBoundingClientRect(); target = { x: t.clientX - r.left, y: t.clientY - r.top }; hoverActive = true; };
    canvas.addEventListener("touchstart", (ev) => { touching = true; fromTouch(ev); }, { passive: true });
    canvas.addEventListener("touchmove", (ev) => { if (touching) fromTouch(ev); }, { passive: true });
    window.addEventListener("touchend", () => { if (touching) { touching = false; setTimeout(() => hoverActive = false, 1200); } }, { passive: true });
    window.addEventListener("resize", layout);
    layout();

    if (reduce) { target = { x: base.x - 120, y: base.y - 320 }; draw(); }
    else (function loop() {
      if (!hoverActive) {
        autoT += 0.008;
        const reach = lens[0] + lens[1] + lens[2];
        target = { x: base.x - reach * 0.06 + Math.cos(autoT) * reach * 0.42, y: base.y - reach * 0.6 + Math.sin(autoT * 1.4) * reach * 0.24 };
      }
      draw(); requestAnimationFrame(loop);
    })();
  })();

  /* ============================================================
     03 · SO-101 ANATOMY DIAGRAM — same arm, static pose, 6 clickable joints
     ============================================================ */
  (function diagram() {
    const canvas = $("#diagramCanvas"); if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const jrT = $("#jrTitle"), jrB = $("#jrBody"), btns = $$(".dof-list button");
    let W = 0, H = 0, S = 1, markers = [], selected = 0, hover = 0;

    const pose = () => [
      { x: W * 0.30, y: H * 0.74 }, { x: W * 0.43, y: H * 0.47 },
      { x: W * 0.63, y: H * 0.37 }, { x: W * 0.84, y: H * 0.31 },
    ];

    function render() {
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const P = pose(); S = dist(P[0], P[1]);
      const hot = hover || selected;
      markers = drawSO101(ctx, P, S, { open: 0.5, hot });
      markers.forEach((m, i) => {
        const n = i + 1, active = hot === n;
        ctx.beginPath(); ctx.arc(m.x, m.y, active ? 13 : 11, 0, 7);
        ctx.fillStyle = active ? ACCENT : PAPER; ctx.fill();
        ctx.lineWidth = 1.6; ctx.strokeStyle = INK; ctx.stroke();
        ctx.fillStyle = active ? PAPER : INK;
        ctx.font = "600 12px 'IBM Plex Mono', monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(String(n), m.x, m.y + 0.5);
      });
    }
    function select(n) {
      selected = n; const j = JOINTS[n];
      if (j) { jrT.textContent = j[0]; jrB.textContent = j[1]; }
      btns.forEach(b => b.classList.toggle("active", +b.dataset.j === n));
      render();
    }
    const hit = (cx, cy) => {
      const r = canvas.getBoundingClientRect(), x = cx - r.left, y = cy - r.top;
      let best = 0, bd = 1e9;
      markers.forEach((m, i) => { const d = Math.hypot(m.x - x, m.y - y); if (d < bd) { bd = d; best = i + 1; } });
      return bd < 30 ? best : 0;
    };
    canvas.addEventListener("mousemove", ev => { const h = hit(ev.clientX, ev.clientY); if (h !== hover) { hover = h; canvas.style.cursor = h ? "pointer" : "default"; render(); } });
    canvas.addEventListener("mouseleave", () => { if (hover) { hover = 0; render(); } });
    canvas.addEventListener("click", ev => { const h = hit(ev.clientX, ev.clientY); if (h) select(h); });
    canvas.addEventListener("touchstart", ev => { const t = ev.touches[0]; const h = hit(t.clientX, t.clientY); if (h) select(h); }, { passive: true });
    btns.forEach(b => {
      const n = +b.dataset.j;
      b.addEventListener("click", () => select(n));
      b.addEventListener("mouseenter", () => { hover = n; render(); });
      b.addEventListener("mouseleave", () => { hover = 0; render(); });
    });
    window.addEventListener("resize", render);
    render();
  })();
})();
