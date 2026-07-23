/* ============================================================
   Φ · Physical Hardware Intelligence — interactions
   ============================================================ */
(() => {
  "use strict";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---------- boot sequence ---------- */
  (function boot() {
    const el = $("#boot"), log = $("#bootLog");
    if (!el) return;
    const done = () => el.classList.add("done");
    if (reduce) { log && (log.textContent = "Φ ready."); setTimeout(done, 250); return; }
    const lines = [
      "Φ // physical hardware intelligence",
      "> init robot_00 .......... SO-ARM101",
      "> actuators .............. 6 × STS3215  [ok]",
      "> lerobot engine ......... linked  [ok]",
      "> policy zoo ............. ACT · diffusion · vla",
      "> status ................. SIG APPROVED",
      "> ready.",
    ];
    let i = 0;
    (function type() {
      if (i >= lines.length) { setTimeout(done, 420); return; }
      const cls = /\[ok\]|ready\.|APPROVED/.test(lines[i]) ? "" : "ok";
      log.innerHTML += `<span class="${cls}">${lines[i]}</span>\n`;
      i++;
      setTimeout(type, i === 1 ? 260 : 150);
    })();
    // safety: never trap the user
    setTimeout(done, 3000);
  })();

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
    links.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  }));

  /* ---------- scroll reveal ---------- */
  if ("IntersectionObserver" in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    $$(".reveal").forEach(el => io.observe(el));
  } else {
    $$(".reveal").forEach(el => el.classList.add("in"));
  }

  /* ---------- joint readouts ---------- */
  const JOINTS = {
    1: ["J1 · Base rotation", "Rotates the whole arm left and right about the vertical axis — how it aims at a target on the table."],
    2: ["J2 · Shoulder", "Lifts the arm up and down. It carries the most load, so it uses the strongest gearing."],
    3: ["J3 · Elbow", "Bends the forearm to reach in and out — the difference between near and far grabs."],
    4: ["J4 · Wrist flex", "Tilts the gripper up and down to line it up with an object's face."],
    5: ["J5 · Wrist roll", "Spins the gripper around its own axis to orient the grasp."],
    6: ["J6 · Gripper", "The one actuated finger pair — opens and closes to actually pick things up."],
  };
  const jrT = $("#jrTitle"), jrB = $("#jrBody");
  $$(".joint").forEach(j => {
    const set = () => {
      const n = j.dataset.j;
      $$(".joint").forEach(x => x.classList.remove("active"));
      j.classList.add("active");
      if (JOINTS[n]) { jrT.textContent = JOINTS[n][0]; jrB.textContent = JOINTS[n][1]; }
    };
    j.addEventListener("click", set);
    j.addEventListener("mouseenter", set);
    j.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); set(); } });
  });

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
      rcTitle.textContent = STEPS[i][0];
      rcBody.textContent = STEPS[i][1];
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
    if ("IntersectionObserver" in window && !reduce) {
      new IntersectionObserver((es) => es.forEach(e => e.isIntersecting ? play() : stop()),
        { threshold: 0.35 }).observe(wrap);
    }
  })();

  /* ---------- scroll-spy nav ---------- */
  (function spy() {
    const map = new Map();
    $$("#navLinks a").forEach(a => { const id = a.getAttribute("href"); if (id && id.startsWith("#")) map.set(id.slice(1), a); });
    const ids = [...map.keys()];
    if (!ids.length || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          map.forEach(a => a.classList.remove("active"));
          const a = map.get(e.target.id); if (a) a.classList.add("active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    ids.forEach(id => { const el = document.getElementById(id); if (el) io.observe(el); });
  })();

  /* ============================================================
     INVERSE-KINEMATICS ARM (hero canvas)
     A 3-link chain solved with FABRIK, reaching for the cursor.
     ============================================================ */
  const canvas = $("#armCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  let base, lens, pts, target, aim, hoverActive = false, autoT = 0;

  function layout() {
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    base = { x: W * (W < 720 ? 0.5 : 0.72), y: H * 0.9 };
    const u = Math.min(H, 760);
    // taller arm on mobile so it fills its dedicated band
    lens = (W < 720) ? [u * 0.3, u * 0.26, u * 0.13] : [u * 0.24, u * 0.2, u * 0.11];
    pts = [ {x:base.x,y:base.y}, {x:base.x,y:base.y-lens[0]},
            {x:base.x,y:base.y-lens[0]-lens[1]}, {x:base.x,y:base.y-lens[0]-lens[1]-lens[2]} ];
    if (!target) target = { x: base.x, y: base.y - 300 };
    if (!aim) aim = { x: target.x, y: target.y };
  }

  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function fabrik(t) {
    const total = lens[0] + lens[1] + lens[2];
    const reach = dist(base, t);
    if (reach > total - 2) {
      // out of reach → stretch straight toward target
      const dx = (t.x - base.x) / reach, dy = (t.y - base.y) / reach;
      let acc = 0;
      pts[0] = { x: base.x, y: base.y };
      for (let i = 1; i < 4; i++) { acc += lens[i - 1]; pts[i] = { x: base.x + dx * acc, y: base.y + dy * acc }; }
      return;
    }
    for (let it = 0; it < 10; it++) {
      // backward
      pts[3] = { x: t.x, y: t.y };
      for (let i = 2; i >= 0; i--) {
        const d = dist(pts[i + 1], pts[i]) || 1e-6, r = lens[i] / d;
        pts[i] = { x: pts[i + 1].x + (pts[i].x - pts[i + 1].x) * r,
                   y: pts[i + 1].y + (pts[i].y - pts[i + 1].y) * r };
      }
      // forward
      pts[0] = { x: base.x, y: base.y };
      for (let i = 1; i < 4; i++) {
        const d = dist(pts[i], pts[i - 1]) || 1e-6, r = lens[i - 1] / d;
        pts[i] = { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * r,
                   y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * r };
      }
      if (dist(pts[3], t) < 0.5) break;
    }
  }

  function drawApple(x, y, r) {
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = "rgba(255,70,70,.45)"; ctx.shadowBlur = 16;
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.15, 0, 0, r * 1.25);
    g.addColorStop(0, "#ff7a72"); g.addColorStop(.5, "#e83b34"); g.addColorStop(1, "#9c1414");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.55);
    ctx.bezierCurveTo(-r * 1.15, -r * 1.15, -r * 1.25, r * 0.7, 0, r * 1.05);
    ctx.bezierCurveTo(r * 1.25, r * 0.7, r * 1.15, -r * 1.15, 0, -r * 0.55);
    ctx.fill();
    ctx.shadowBlur = 0;
    // stem
    ctx.strokeStyle = "#7a4a2a"; ctx.lineWidth = Math.max(2, r * 0.14); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(0, -r * 0.55); ctx.lineTo(r * 0.16, -r * 1.15); ctx.stroke();
    // leaf
    ctx.fillStyle = "#43c07a";
    ctx.beginPath(); ctx.ellipse(r * 0.55, -r * 0.95, r * 0.45, r * 0.2, -0.6, 0, Math.PI * 2); ctx.fill();
    // highlight
    ctx.fillStyle = "rgba(255,255,255,.5)";
    ctx.beginPath(); ctx.ellipse(-r * 0.38, -r * 0.28, r * 0.2, r * 0.32, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawDetect(x, y, s) {
    const L = x - s, R = x + s, T = y - s, B = y + s, c = s * 0.42;
    ctx.strokeStyle = "rgba(63,224,234,.7)"; ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(L, T + c); ctx.lineTo(L, T); ctx.lineTo(L + c, T);
    ctx.moveTo(R - c, T); ctx.lineTo(R, T); ctx.lineTo(R, T + c);
    ctx.moveTo(R, B - c); ctx.lineTo(R, B); ctx.lineTo(R - c, B);
    ctx.moveTo(L + c, B); ctx.lineTo(L, B); ctx.lineTo(L, B - c);
    ctx.stroke();
    ctx.fillStyle = "rgba(63,224,234,.85)";
    ctx.font = "10px 'IBM Plex Mono', ui-monospace, monospace";
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillText("apple", L, T - 5);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    // the target floats freely (only clamped to the canvas); the arm reaches toward it
    const t = { x: Math.max(28, Math.min(W - 28, target.x)),
                y: Math.max(28, Math.min(base.y - 20, target.y)) };
    aim.x += (t.x - aim.x) * 0.08;
    aim.y += (t.y - aim.y) * 0.08;
    fabrik(aim);

    // base plate
    ctx.fillStyle = "#11161c";
    ctx.strokeStyle = "#28313B"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(base.x - 46, base.y - 4, 92, 20, 5); ctx.fill(); ctx.stroke();

    // links (metal, glow)
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.shadowColor = "rgba(63,224,234,.25)"; ctx.shadowBlur = 14;
    const grad = ctx.createLinearGradient(0, base.y - 500, 0, base.y);
    grad.addColorStop(0, "#FFFFFF"); grad.addColorStop(.55, "#D5DCE2"); grad.addColorStop(1, "#9AA4AD");
    ctx.strokeStyle = grad;
    const widths = [13, 11, 8];
    for (let i = 0; i < 3; i++) {
      ctx.lineWidth = widths[i];
      ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[i + 1].x, pts[i + 1].y); ctx.stroke();
    }
    ctx.shadowBlur = 0;

    // joints
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = "#0C0F13"; ctx.strokeStyle = "#C6CED5"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, i === 0 ? 9 : 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    // end-effector gripper
    const e = pts[3], p = pts[2];
    let ang = Math.atan2(e.y - p.y, e.x - p.x);
    ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(ang);
    ctx.strokeStyle = "#3FE0EA"; ctx.lineWidth = 3.4; ctx.shadowColor = "#3FE0EA"; ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(-2, -9); ctx.lineTo(9, -9); ctx.moveTo(-2, 9); ctx.lineTo(9, 9);
    ctx.moveTo(-2, -9); ctx.lineTo(-2, 9); ctx.stroke();
    ctx.restore(); ctx.shadowBlur = 0;

    // the floating apple the arm is reaching for, with a vision-style detection box
    const ar = Math.max(13, Math.min(20, (lens[0] + lens[1] + lens[2]) * 0.05));
    drawDetect(t.x, t.y, ar * 1.7);
    drawApple(t.x, t.y, ar);

    // telemetry
    const hudTheta = $("#hudTheta"), hudEE = $("#hudEE");
    if (hudTheta) {
      const norm = a => { a = ((a + 180) % 360 + 360) % 360 - 180; return a; };
      const a1 = norm(Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x) * 180 / Math.PI + 90);
      const a2 = norm(Math.atan2(pts[2].y - pts[1].y, pts[2].x - pts[1].x) * 180 / Math.PI + 90);
      const a3 = norm(Math.atan2(pts[3].y - pts[2].y, pts[3].x - pts[2].x) * 180 / Math.PI + 90);
      const f = v => (v >= 0 ? "+" : "−") + Math.abs(v).toFixed(0).padStart(2, "0");
      hudTheta.textContent = `${f(a1)}° ${f(a2)}° ${f(a3)}°`;
    }
    if (hudEE) hudEE.textContent = `x ${(e.x - base.x).toFixed(0)} · y ${(base.y - e.y).toFixed(0)}`;
  }

  // interaction
  const hero = $("#hero");
  window.addEventListener("mousemove", (ev) => {
    const r = canvas.getBoundingClientRect();
    if (ev.clientY <= r.bottom && ev.clientY >= r.top) {
      target = { x: ev.clientX - r.left, y: ev.clientY - r.top };
      hoverActive = true;
    }
  }, { passive: true });
  window.addEventListener("mouseleave", () => hoverActive = false);
  // touch: drive the arm only when the touch begins on the canvas (never traps page scroll)
  let touching = false;
  const fromTouch = (ev) => {
    const t = ev.touches[0]; if (!t) return;
    const r = canvas.getBoundingClientRect();
    target = { x: t.clientX - r.left, y: t.clientY - r.top };
    hoverActive = true;
  };
  canvas.addEventListener("touchstart", (ev) => { touching = true; fromTouch(ev); }, { passive: true });
  canvas.addEventListener("touchmove", (ev) => { if (touching) fromTouch(ev); }, { passive: true });
  window.addEventListener("touchend", () => { if (touching) { touching = false; setTimeout(() => hoverActive = false, 1200); } }, { passive: true });
  window.addEventListener("resize", layout);

  layout();

  if (reduce) {
    target = { x: base.x - 120, y: base.y - 320 };
    draw();
  } else {
    (function loop() {
      // auto-orbit when the cursor isn't driving it (touch / idle)
      if (!hoverActive) {
        autoT += 0.008;
        const reach = lens[0] + lens[1] + lens[2];
        const radX = reach * (W < 720 ? 0.42 : 0.52);
        const radY = reach * 0.3;
        const cx = base.x - (W < 720 ? 0 : reach * 0.1);
        const cy = base.y - reach * 0.76;
        target = {
          x: cx + Math.cos(autoT) * radX,
          y: cy + Math.sin(autoT * 1.4) * radY,
        };
      }
      draw();
      requestAnimationFrame(loop);
    })();
  }
})();
