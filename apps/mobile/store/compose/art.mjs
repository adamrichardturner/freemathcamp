/**
 * Generated artwork for the App Store screenshots: the header's backdrop (a
 * field of maths glyphs and plotted curves behind the headline) and the
 * floating cards that sit across each device's edges. Everything is drawn from
 * the app's own visuals, in its tokens (see template.html's .art rules): the
 * area model's tiles, the mastery ring, function plots, fraction circles.
 *
 * Seeded, so a re-run draws the same picture.
 */

const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 2147483647, 7) || 1;

/* ---------------- Header backdrop ---------------- */

const GLYPHS = ["π", "∑", "√", "x²", "∫", "θ", "∞", "Δ", "÷", "×", "½", "e", "≈", "f(x)", "%", "n!", "∠", "y"];

/**
 * Glyphs scattered around (never under) the headline, and two curves sweeping
 * through the gap between the subtitle and the device. Units are the header's
 * own viewBox (100 × 60), stretched to the page width.
 */
export function backdrop(name) {
  const r = rng(hash(name));
  const glyphs = [];
  for (let i = 0, tries = 0; glyphs.length < 8 && tries < 400; tries++) {
    const x = 3 + r() * 94, y = 4 + r() * 48;
    // Keep the centre clear for the headline: glyphs only towards the edges.
    if (Math.abs(x - 50) < 42) continue;
    if (glyphs.some((g) => Math.hypot(g.x - x, (g.y - y) * 0.9) < 10)) continue;
    glyphs.push({ x, y, g: GLYPHS[Math.floor(r() * GLYPHS.length)], s: 3.2 + r() * 2.6, rot: (r() - 0.5) * 30, o: 0.35 + r() * 0.45 });
    i++;
  }
  const wave = (amp, freq, phase, y0) =>
    Array.from({ length: 101 }, (_, i) => `${i === 0 ? "M" : "L"}${i} ${(y0 + amp * Math.sin((i / 100) * Math.PI * 2 * freq + phase)).toFixed(2)}`).join(" ");
  const phase = r() * Math.PI * 2;
  return `<svg class="backdrop" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="curve" x1="0" x2="1"><stop offset="0" stop-color="var(--a1)" stop-opacity="0"/><stop offset="0.25" stop-color="var(--a1)"/><stop offset="0.75" stop-color="var(--a2)"/><stop offset="1" stop-color="var(--a2)" stop-opacity="0"/></linearGradient></defs>
    <path d="${wave(1.6, 1.15, phase, 56)}" fill="none" stroke="url(#curve)" stroke-width="0.32" vector-effect="non-scaling-stroke" class="c1"/>
    <path d="${wave(1.1, 1.7, phase + 2, 57.6)}" fill="none" stroke="url(#curve)" stroke-width="0.22" vector-effect="non-scaling-stroke" class="c2"/>
  </svg>
  ${glyphs.map((g) => `<span class="glyph" style="left:${g.x}%;top:${((g.y / 60) * 100).toFixed(1)}%;font-size:calc(var(--gs) * ${g.s.toFixed(2)});opacity:${g.o.toFixed(2)};transform:translate(-50%,-50%) rotate(${g.rot.toFixed(1)}deg)">${g.g}</span>`).join("")}`;
}

/* ---------------- Cards ---------------- */

const card = (body, { side, top, rot, cls = "" }) =>
  `<div class="card ${side} ${cls}" style="top:${top}%;--rot:${rot}deg">${body}</div>`;
const tex = (s) => `<span class="tex">${s}</span>`;

/** The lesson's area model, 23 × 14, in the same tiles and tones as the app draws it. */
const areaModel = () => {
  const cols = [[20, 118], [3, 34]], rows = [[10, 70], [4, 34]];
  const tone = ["chart-1", "chart-2", "chart-2", "chart-3"];
  let y = 22, cells = "", k = 0;
  for (const [rv, rh] of rows) {
    let x = 24;
    for (const [cv, cw] of cols) {
      const t = tone[k++];
      cells += `<rect x="${x}" y="${y}" width="${cw - 4}" height="${rh - 4}" rx="5" fill="var(--${t})" fill-opacity="0.16" stroke="var(--${t})" stroke-width="2"/>
        <text x="${x + (cw - 4) / 2}" y="${y + (rh - 4) / 2 + 5}" text-anchor="middle" class="n">${rv * cv}</text>`;
      x += cw;
    }
    y += rh;
  }
  return `<svg viewBox="0 0 180 130" class="w-area">
    <text x="${24 + 57}" y="15" text-anchor="middle" class="lbl">20</text><text x="${24 + 118 + 15}" y="15" text-anchor="middle" class="lbl">3</text>
    <text x="14" y="${22 + 35 + 4}" text-anchor="middle" class="lbl">10</text><text x="14" y="${22 + 70 + 17 + 4}" text-anchor="middle" class="lbl">4</text>
    ${cells}
  </svg><div class="foot">${tex("23 × 14 = 322")}</div>`;
};

/** The mastery ring from a lesson's header. */
const ring = (pct, title, sub) => {
  const R = 26, C = 2 * Math.PI * R;
  return `<div class="row"><svg viewBox="0 0 64 64" class="w-ring">
    <defs><linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--primary)"/><stop offset="1" stop-color="var(--chart-4)"/></linearGradient></defs>
    <circle cx="32" cy="32" r="${R}" fill="none" stroke="var(--muted)" stroke-width="7"/>
    <circle cx="32" cy="32" r="${R}" fill="none" stroke="url(#ring)" stroke-width="7" stroke-linecap="round" stroke-dasharray="${(C * pct) / 100} ${C}" transform="rotate(-90 32 32)"/>
    <text x="32" y="37" text-anchor="middle" class="pct">${pct}%</text>
  </svg><div><div class="t">${title}</div><div class="s">${sub}</div></div></div>`;
};

/** A function plot: grid, axes, a parabola and its vertex. */
const plot = () => {
  const f = (x) => 0.5 * (x - 1) ** 2 - 2; // vertex (1, -2)
  const X = (x) => 80 + x * 18, Y = (y) => 70 - y * 18;
  const d = Array.from({ length: 61 }, (_, i) => { const x = -3 + i * 0.1; return `${i ? "L" : "M"}${X(x).toFixed(1)} ${Y(f(x)).toFixed(1)}`; }).join(" ");
  const grid = [];
  for (let i = -4; i <= 4; i++) grid.push(`<line x1="${X(i)}" y1="4" x2="${X(i)}" y2="136" class="g"/>`, `<line x1="4" y1="${Y(i)}" x2="156" y2="${Y(i)}" class="g"/>`);
  return `<svg viewBox="0 0 160 140" class="w-plot"><defs><clipPath id="pc"><rect x="4" y="4" width="152" height="132" rx="6"/></clipPath></defs>
    <g clip-path="url(#pc)">${grid.join("")}
    <line x1="${X(0)}" y1="4" x2="${X(0)}" y2="136" class="ax"/><line x1="4" y1="${Y(0)}" x2="156" y2="${Y(0)}" class="ax"/>
    <path d="${d}" fill="none" stroke="var(--primary)" stroke-width="3.5" stroke-linecap="round"/>
    <circle cx="${X(1)}" cy="${Y(-2)}" r="5.5" fill="var(--chart-4)" stroke="var(--card)" stroke-width="2.5"/></g>
  </svg><div class="foot">${tex("y = ½(x − 1)² − 2")}</div>`;
};

/** A fraction circle, three eighths shaded. */
const pie = (n, d) => {
  const slices = Array.from({ length: d }, (_, i) => {
    const a0 = (i / d) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / d) * 2 * Math.PI - Math.PI / 2;
    const p = (a) => `${(40 + 34 * Math.cos(a)).toFixed(2)} ${(40 + 34 * Math.sin(a)).toFixed(2)}`;
    return `<path d="M40 40 L${p(a0)} A34 34 0 0 1 ${p(a1)} Z" fill="${i < n ? "var(--primary)" : "var(--muted)"}" stroke="var(--card)" stroke-width="2"/>`;
  }).join("");
  return `<div class="row"><svg viewBox="0 0 80 80" class="w-pie">${slices}</svg><div class="frac">${tex(`<span class="num">${n}</span><span class="den">${d}</span>`)}</div></div>`;
};

const check = (title, sub) =>
  `<div class="row"><span class="badge ok"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span><div><div class="t">${title}</div><div class="s">${sub}</div></div></div>`;

const stars = (title, sub) =>
  `<div class="row"><span class="badge star"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg></span><div><div class="t">${title}</div><div class="s">${sub}</div></div></div>`;

const bars = (vals, title) => {
  const max = Math.max(...vals);
  return `<div class="eyebrow">${title}</div><svg viewBox="0 0 150 70" class="w-bars">${vals
    .map((v, i) => `<rect x="${4 + i * 21}" y="${66 - (v / max) * 60}" width="15" height="${(v / max) * 60}" rx="4" fill="${i === vals.length - 1 ? "url(#bar)" : "var(--primary)"}" fill-opacity="${i === vals.length - 1 ? 1 : 0.28}"/>`)
    .join("")}<defs><linearGradient id="bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--chart-4)"/><stop offset="1" stop-color="var(--primary)"/></linearGradient></defs></svg>`;
};

const rank = () =>
  `<div class="eyebrow">This week</div>${[[3, "Priya", "1,290"], [4, "You", "1,150"], [5, "Sam", "980"]]
    .map(([p, n, xp]) => `<div class="rank${n === "You" ? " me" : ""}"><span class="p">${p}</span><span class="nm">${n}</span><span class="xp">${xp} XP</span></div>`)
    .join("")}`;

/** A corner of the course map: lessons as nodes, prerequisites as edges. */
const graph = () => {
  const nodes = [[20, 60, 2], [56, 30, 2], [62, 86, 2], [98, 54, 1], [134, 26, 1], [140, 80, 0], [172, 52, 0]];
  const edges = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5], [4, 6], [5, 6]];
  const fill = ["var(--muted)", "var(--chart-2)", "var(--primary)"];
  return `<div class="eyebrow">Course map</div><svg viewBox="0 0 192 108" class="w-graph">${edges
    .map(([a, b]) => `<line x1="${nodes[a][0]}" y1="${nodes[a][1]}" x2="${nodes[b][0]}" y2="${nodes[b][1]}" class="edge"/>`)
    .join("")}${nodes.map(([x, y, s]) => `<circle cx="${x}" cy="${y}" r="11" fill="${fill[s]}" stroke="var(--card)" stroke-width="3"/>${s === 2 ? `<path d="M${x - 4.5} ${y}l3 3 6-6" fill="none" stroke="var(--card)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>` : ""}`).join("")}</svg>`;
};

/** Two cards per shot, one hanging off each side of the device. */
const motifs = {
  "01-learn": () => [card(ring(67, "Daily goal", "10 of 15 problems"), { side: "right", top: 17, rot: 3 }), card(areaModel(), { side: "left", top: 58, rot: -4 })],
  "02-lesson": () => [card(plot(), { side: "right", top: 22, rot: 4 }), card(pie(3, 8), { side: "left", top: 66, rot: -3 })],
  "03-practice": () => [card(stars("Stretch unlocked", "Level 3 problems next"), { side: "left", top: 33, rot: -4 }), card(check("Correct!", "+10 XP · 6 in a row"), { side: "right", top: 58, rot: 3 })],
  "04-progress": () => [card(check("Lesson mastered", "Equivalent fractions"), { side: "left", top: 33, rot: -4 }), card(bars([4, 7, 5, 9, 8, 12, 15], "XP this week"), { side: "right", top: 60, rot: 3 })],
  "05-leagues": () => [card(rank(), { side: "right", top: 24, rot: 3 }), card(check("Daily goal met", "+40 XP today"), { side: "left", top: 64, rot: -3 })],
  "06-course": () => [card(graph(), { side: "right", top: 18, rot: 3 }), card(check("95 connected lessons", "Free, with no ads"), { side: "left", top: 62, rot: -4 })],
};

export const cards = (name) => (motifs[name] ? motifs[name]().join("") : "");
