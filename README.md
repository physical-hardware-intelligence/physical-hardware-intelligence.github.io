# Φ · phi-web

Public website for **Φ (Physical Hardware Intelligence)** — Northeastern Silicon Valley's hands-on robotics & embodied-AI Student Interest Group.

**Live:** https://brutalcaeser.github.io/phi-web/

A single-page, dependency-free static site (HTML + CSS + vanilla JS) deployed on GitHub Pages. The hero features a live inverse-kinematics arm (FABRIK solver on `<canvas>`) that reaches for the cursor; the rest of the page covers the mission, an interactive SO-ARM101 breakdown, the teleop→train→deploy learning loop, the open `phi` monorepo + member ladder, and the roadmap to the September NEURAI Research Day.

## Structure
```
index.html      # all markup / content
styles.css      # design system (near-black + brushed metal + sensor cyan)
main.js         # boot sequence, scroll reveals, joint readouts, IK arm
assets/         # Φ logo mark (SVG)
.nojekyll       # serve files as-is (no Jekyll build)
```

## Develop locally
```bash
python3 -m http.server 8000   # then open http://localhost:8000
```
No build step. Edit the three source files and refresh.

## Deploy
Pushed to `main`; GitHub Pages serves the branch root. All asset paths are relative so it works from the `/phi-web/` project sub-path.

---
Open source · built by the club. Not affiliated with or branded by the university.
