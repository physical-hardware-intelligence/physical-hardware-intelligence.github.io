/* ─────────────────────────────────────────────────────────────────────────────
   THE SCHEDULE — one file, read by every page.

   Edit `oneOffs` when a session is confirmed, moved or cancelled.
   Edit `week` only when the standing slots actually move.

   Past entries drop out on their own at local midnight. Nothing here needs
   deleting, which is the point: the homepage spent three weeks of October
   advertising sessions that had happened in September.

   Who renders what
     index.html                  the weekly table and the NEXT UP list
     learn / industry / blog     one line in the masthead, the next thing only

   The markup in index.html is the no-JS fallback. These values win.
   ───────────────────────────────────────────────────────────────────────────── */
(function () {
  "use strict";

  var ROOM = "Room 1012";
  var DASH = " – ";            // thin space, en dash, thin space

  // dow follows Date.getDay(): Sun 0 … Sat 6.
  // ends is the hour the slot is over, so "next" stops meaning a session that
  // finished this morning.
  var week = [
    { dow: 1, day: "Monday",   time: "10:00" + DASH + "13:00", kind: "Learning", cls: "sd-learn", ends: 13 },
    { dow: 2, day: "Tuesday",  time: "10:00" + DASH + "13:00", kind: "R&D",      cls: "sd-rnd",   ends: 13 },
    { dow: 5, day: "Friday",   time: "10:00" + DASH + "13:00", kind: "R&D",      cls: "sd-rnd",   ends: 13 },
    { dow: 6, day: "Saturday", time: "all day",                kind: "Open",     cls: "sd-flex",  ends: 24 }
  ];

  // date is YYYY-MM-DD. `note` shows only on the homepage. `ends` is optional:
  // without it the session is assumed to run for that weekday's standing slot.
  var oneOffs = [
    { date: "2026-10-12", what: "Diffusion models", note: "Talk by Yashvardhan Gupta" }
  ];

  /* ── dates ────────────────────────────────────────────────────────────────
     Everything is built from local Y/M/D parts. new Date("2026-10-12") parses
     as UTC midnight, which in California is the evening of the 11th, so a
     session would disappear a day early. */

  var DAYS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function today() {
    var n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  }

  function parse(iso) {
    var p = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
    if (!p) return null;
    var d = new Date(+p[1], +p[2] - 1, +p[3]);
    return isNaN(d) ? null : d;
  }

  function label(d) {                          // "Mon 12 Oct"
    return DAYS[d.getDay()] + " " + d.getDate() + " " + MONTHS[d.getMonth()];
  }

  function slotFor(dow) {                      // the standing slot on that weekday
    for (var i = 0; i < week.length; i++) if (week[i].dow === dow) return week[i];
    return null;
  }

  function endsAt(x) {                         // hour a one-off is over
    if (typeof x.o.ends === "number") return x.o.ends;
    var slot = slotFor(x.d.getDay());
    return slot ? slot.ends : 24;
  }

  function upcoming() {                        // one-offs still ahead, soonest first
    var t = today(), hour = new Date().getHours();
    return oneOffs
      .map(function (o) { var d = parse(o.date); return d ? { d: d, o: o } : null; })
      .filter(function (x) {
        if (!x || x.d < t) return false;
        return x.d > t || hour < endsAt(x);    // today's entry drops once it is over
      })
      .sort(function (a, b) { return a.d - b.d; });
  }

  /* Next standing slot. Today counts only while it is still running — at nine
     on a Friday evening the next R&D day is Tuesday, not the one that ended at
     one o'clock. */
  function nextStanding() {
    var t = today(), hour = new Date().getHours();
    for (var i = 0; i < 8; i++) {
      var d = new Date(t.getFullYear(), t.getMonth(), t.getDate() + i);
      for (var j = 0; j < week.length; j++) {
        if (week[j].dow !== d.getDay()) continue;
        if (i === 0 && hour >= week[j].ends) continue;
        return { d: d, w: week[j] };
      }
    }
    return null;
  }

  /* The next thing that happens. A one-off on the same day as a standing slot
     replaces it rather than queueing behind it, because that is what it is. */
  function nextThing() {
    var one = upcoming()[0], std = nextStanding();
    if (one && (!std || one.d <= std.d)) {
      return { when: label(one.d), what: one.o.what };
    }
    if (std) {
      return { when: label(std.d), what: std.w.kind + ", " + std.w.time };
    }
    return null;
  }

  /* ── rendering ─────────────────────────────────────────────────────────── */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;         // textContent, so & and – are safe
    return n;
  }

  function renderWeek(ul) {
    ul.textContent = "";
    week.forEach(function (w) {
      var li = el("li");
      li.appendChild(el("span", "sd-day", w.day));
      li.appendChild(el("span", "sd-time", w.time));
      li.appendChild(el("span", "sd-kind " + w.cls, w.kind));
      ul.appendChild(li);
    });
  }

  function renderNext(ul) {
    ul.textContent = "";
    var items = upcoming();
    if (!items.length) {
      var li = el("li", "sn-none");
      li.appendChild(el("b", null, "Nothing extra this week"));
      li.appendChild(el("span", null, "The standing sessions above still run."));
      ul.appendChild(li);
      return;
    }
    items.forEach(function (x) {
      var li = el("li");
      var t  = el("time", null, label(x.d));
      t.setAttribute("datetime", x.o.date);
      li.appendChild(t);
      li.appendChild(el("b", null, x.o.what));
      if (x.o.note) li.appendChild(el("span", null, x.o.note));
      ul.appendChild(li);
    });
  }

  function renderStrip(a) {
    var n = nextThing();
    if (!n) { a.hidden = true; return; }
    a.textContent = "";
    a.appendChild(el("span", "ss-label", "Next"));
    a.appendChild(el("span", "ss-when", n.when));
    a.appendChild(el("span", "ss-what", n.what));
    a.appendChild(el("span", "ss-room", ROOM));
    a.appendChild(el("span", "ss-ext", "↗"));
    a.setAttribute("aria-label", "Next session: " + n.when + ", " + n.what +
                                 ", " + ROOM + ". See the full schedule.");
    a.hidden = false;
  }

  function mount() {
    var w = document.getElementById("schedWeek");
    var n = document.getElementById("schedNext");
    var s = document.getElementById("schedStrip");
    if (w) renderWeek(w);
    if (n) renderNext(n);
    if (s) renderStrip(s);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
