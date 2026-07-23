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
    base = { x: W * (W < 720 ? 0.5 : 0.76), y: H * (W < 720 ? 0.9 : 0.85) };
    const u = Math.min(H, 760);
    lens = [u * 0.24, u * 0.2, u * 0.11];   // upper, fore, hand
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

  function draw() {
    ctx.clearRect(0, 0, W, H);
    // clamp target inside canvas, above the base
    const t = { x: Math.max(20, Math.min(W - 20, target.x)),
                y: Math.max(20, Math.min(base.y - 30, target.y)) };
    // keep the target within reach so the arm always holds a bend (never locks flat)
    const maxR = (lens[0] + lens[1] + lens[2]) * 0.92;
    let dx = t.x - base.x, dy = t.y - base.y, d = Math.hypot(dx, dy);
    if (d > maxR) { t.x = base.x + dx / d * maxR; t.y = base.y + dy / d * maxR; }
    aim.x += (t.x - aim.x) * 0.09;
    aim.y += (t.y - aim.y) * 0.09;
    fabrik(aim);

    // reticle at target
    ctx.strokeStyle = "rgba(63,224,234,.55)"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(aim.x, aim.y, 13, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(aim.x - 20, aim.y); ctx.lineTo(aim.x - 6, aim.y);
    ctx.moveTo(aim.x + 6, aim.y); ctx.lineTo(aim.x + 20, aim.y);
    ctx.moveTo(aim.x, aim.y - 20); ctx.lineTo(aim.x, aim.y - 6);
    ctx.moveTo(aim.x, aim.y + 6); ctx.lineTo(aim.x, aim.y + 20); ctx.stroke();

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
        autoT += 0.009;
        const reach = lens[0] + lens[1] + lens[2];
        const rad = reach * 0.22;
        const ox = (W < 720 ? 0 : -reach * 0.08);
        target = {
          x: base.x + ox + Math.cos(autoT) * rad,
          y: base.y - reach * 0.64 + Math.sin(autoT * 1.5) * rad,
        };
      }
      draw();
      requestAnimationFrame(loop);
    })();
  }
})();
