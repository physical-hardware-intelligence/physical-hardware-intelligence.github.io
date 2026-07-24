# physical-hardware-intelligence.github.io

Public website for **Φ (Physical Hardware Intelligence)** — a hands-on robotics & embodied-AI Student Interest Group at Northeastern University, Silicon Valley.

**Live:** https://physical-hardware-intelligence.github.io/

A single-page, dependency-free static site (HTML + CSS + vanilla JS) served from GitHub Pages as the organization site, in a warm-paper / ink / serif editorial style. The hero is an interactive **SO-ARM101**: drag to pose it (FABRIK inverse kinematics on `<canvas>`) and tap any of its six joints to learn what it does. Below: how a policy is learned (teleop → record → train → evaluate → deploy), the open [`phi`](https://github.com/physical-hardware-intelligence/phi) code monorepo + member ladder, and how to join.

## Structure
```
index.html   # markup + content
styles.css   # design system (warm paper · ink · Fraunces / Newsreader serif)
main.js      # shared SO-101 renderer, hero IK + joint interaction, loop ring, nav
assets/      # Φ ink logo mark + OG image
.nojekyll    # serve files as-is (no Jekyll build)
```

## Develop locally
```bash
python3 -m http.server 8000   # then open http://localhost:8000
```
No build step — edit the source files and refresh.

## Deploy
Push to `main`; GitHub Pages serves the repo root at https://physical-hardware-intelligence.github.io/. All asset paths are relative.

---
Open source · built by the club. Not affiliated with or branded by the university.
