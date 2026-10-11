// =====================================================================
// charts.js — mini biblioteca de gráficos em SVG puro (100% offline).
// Sem dependências, sem CDN. Tipos: barras agrupadas, barras horizontais,
// linha com área, rosca/pizza e cascata (waterfall) com conectores.
// Lê as cores do tema via CSS custom properties (claro/escuro automático).
// Rótulos sem sobreposição, data labels nas barras e animação sutil.
// =====================================================================
(function (global) {
  const NS = "http://www.w3.org/2000/svg";
  const el = (name, attrs = {}) => {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  };
  const txt = (node, s) => { node.textContent = s; return node; };

  function themeColor(varName, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return v || fallback;
  }

  function palette() {
    return {
      text: themeColor("--chart-text", "#475569"),
      textSoft: themeColor("--text-soft", "#64748b"),
      grid: themeColor("--chart-grid", "#e2e8f0"),
      axis: themeColor("--chart-axis", "#94a3b8"),
      surface: themeColor("--surface", "#ffffff"),
      pos: themeColor("--pos", "#dc2626"),
      neg: themeColor("--neg", "#16a34a"),
      brand: themeColor("--brand", "#4f46e5"),
      slate: themeColor("--chart-axis", "#94a3b8"),
      series: ["#6366f1", "#06b6d4", "#f59e0b", "#a855f7", "#ec4899", "#10b981"],
    };
  }

  function clearHost(host) { while (host.firstChild) host.removeChild(host.firstChild); }

  // ---- Tooltip compartilhado ----
  let tipEl = null;
  function ensureTip() {
    if (!tipEl) {
      tipEl = document.createElement("div");
      tipEl.className = "chart-tooltip";
      tipEl.style.display = "none";
      document.body.appendChild(tipEl);
    }
    return tipEl;
  }
  function showTip(html, evt) {
    const t = ensureTip();
    t.innerHTML = html;
    t.style.display = "block";
    const pad = 14;
    let x = evt.pageX + pad, y = evt.pageY + pad;
    const w = t.offsetWidth, h = t.offsetHeight;
    if (x + w > window.scrollX + document.documentElement.clientWidth) x = evt.pageX - w - pad;
    if (y + h > window.scrollY + document.documentElement.clientHeight) y = evt.pageY - h - pad;
    t.style.left = x + "px";
    t.style.top = y + "px";
  }
  function hideTip() { if (tipEl) tipEl.style.display = "none"; }
  function interactive(node, html) {
    node.style.cursor = "pointer";
    node.style.transition = "opacity .15s ease";
    node.addEventListener("mousemove", (e) => { node.style.opacity = ".85"; showTip(html, e); });
    node.addEventListener("mouseleave", () => { node.style.opacity = "1"; hideTip(); });
  }

  function makeSvg(host, w, h) {
    clearHost(host);
    const svg = el("svg", {
      viewBox: `0 0 ${w} ${h}`, width: "100%", height: "100%",
      preserveAspectRatio: "xMidYMid meet", role: "img",
      "font-family": "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    });
    host.appendChild(svg);
    return svg;
  }

  // animação sutil de "subida" das barras
  function animateGrow(node, originY) {
    node.style.transformBox = "fill-box";
    node.style.transformOrigin = `center ${originY}`;
    node.animate(
      [{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }],
      { duration: 500, easing: "cubic-bezier(.22,1,.36,1)" }
    );
  }

  function niceMax(v) {
    if (v <= 0) return 1;
    const mag = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / mag;
    const step = n <= 1 ? 1 : n <= 1.5 ? 1.5 : n <= 2 ? 2 : n <= 3 ? 3 : n <= 5 ? 5 : 10;
    return step * mag;
  }

  // mede largura aproximada de texto (sem DOM) p/ decidir rotação
  const approxW = (s, size) => String(s).length * size * 0.58;

  // desenha rótulo do eixo X: rotaciona se não couber
  function xLabel(svg, p, str, cx, baseY, slotW) {
    const size = 11;
    if (approxW(str, size) <= slotW - 4) {
      svg.appendChild(txt(el("text", { x: cx, y: baseY + 15, "text-anchor": "middle", "font-size": size, fill: p.text }), str));
    } else {
      // rotaciona ~28° a partir de um ponto logo abaixo do eixo
      const px = cx, py = baseY + 14;
      const t = el("text", { x: px, y: py, "text-anchor": "end", "font-size": 10.5, fill: p.text, transform: `rotate(-28 ${px} ${py})` });
      svg.appendChild(txt(t, str));
    }
  }

  function yAxis(svg, p, { x0, x1, yTop, yBot, max, fmt, title }) {
    const ticks = 5;
    for (let i = 0; i <= ticks; i++) {
      const val = (max / ticks) * i;
      const yy = yBot - (val / max) * (yBot - yTop);
      svg.appendChild(el("line", { x1: x0, y1: yy, x2: x1, y2: yy, stroke: p.grid, "stroke-width": i === 0 ? 1.5 : 1 }));
      svg.appendChild(txt(el("text", { x: x0 - 10, y: yy + 4, "text-anchor": "end", "font-size": 11, fill: p.textSoft }), fmt ? fmt(val) : val));
    }
    if (title) {
      const my = (yTop + yBot) / 2;
      svg.appendChild(txt(el("text", { x: 16, y: my, "text-anchor": "middle", "font-size": 11, fill: p.textSoft, transform: `rotate(-90 16 ${my})` }), title));
    }
  }

  function legend(svg, p, items, cx, y) {
    const size = 12;
    const gap = 22;
    const widths = items.map((it) => 16 + approxW(it.label, size) + gap);
    const total = widths.reduce((a, b) => a + b, 0) - gap;
    let x = cx - total / 2;
    items.forEach((it, i) => {
      svg.appendChild(el("rect", { x, y: y - 10, width: 12, height: 12, rx: 3, fill: it.color }));
      svg.appendChild(txt(el("text", { x: x + 17, y: y, "font-size": size, fill: p.text }), it.label));
      x += widths[i];
    });
  }

  // =============================================================
  // Barras agrupadas (vertical) com data labels
  // =============================================================
  function groupedBar(host, { labels, datasets, fmt, yTitle }) {
    const p = palette();
    const W = 680, H = 410, m = { t: 44, r: 20, b: 92, l: 72 };
    const svg = makeSvg(host, W, H);
    const iw = W - m.l - m.r, yTop = m.t, yBot = H - m.b;

    const allVals = datasets.flatMap((d) => d.data.filter((v) => v != null));
    const max = niceMax(Math.max(1, ...allVals));
    const y = (v) => yBot - (v / max) * (yBot - yTop);

    yAxis(svg, p, { x0: m.l, x1: m.l + iw, yTop, yBot, max, fmt, title: yTitle });

    const slot = iw / labels.length;
    const nd = datasets.length;
    const innerPad = slot * 0.18;
    const barsW = slot - innerPad * 2;
    const barGap = 6;
    const barW = (barsW - barGap * (nd - 1)) / nd;

    labels.forEach((lab, gi) => {
      const gx = m.l + slot * gi + innerPad;
      datasets.forEach((ds, di) => {
        const v = ds.data[gi];
        if (v == null) return;
        const bx = gx + di * (barW + barGap);
        const by = y(v), bh = yBot - by;
        const rect = el("rect", { x: bx, y: by, width: Math.max(1, barW), height: Math.max(0, bh), rx: 5, fill: ds.color });
        interactive(rect, `<strong>${lab}</strong><br>${ds.label}: ${fmt ? fmt(v) : v}`);
        svg.appendChild(rect);
        animateGrow(rect, by + bh);
        // data label
        if (bh > 14) {
          svg.appendChild(txt(el("text", { x: bx + barW / 2, y: by - 6, "text-anchor": "middle", "font-size": 10, "font-weight": 700, fill: ds.color }), fmt ? fmt(v) : v));
        }
      });
      xLabel(svg, p, lab, m.l + slot * gi + slot / 2, yBot, slot);
    });

    legend(svg, p, datasets.map((d) => ({ label: d.label, color: d.color })), W / 2, 24);
    return svg;
  }

  // =============================================================
  // Barras horizontais divergentes (impacto) com valores
  // =============================================================
  function horizontalBar(host, { items, fmt, xTitle }) {
    const p = palette();
    const W = 680, rowH = 42, m = { t: 20, r: 90, b: 46, l: 180 };
    const H = m.t + m.b + items.length * rowH;
    const svg = makeSvg(host, W, H);
    const iw = W - m.l - m.r;

    const maxAbs = niceMax(Math.max(1, ...items.map((i) => Math.abs(i.value))));
    const temNeg = items.some((i) => i.value < 0);
    const zeroX = temNeg ? m.l + iw / 2 : m.l;
    const scale = temNeg ? (iw / 2) / maxAbs : iw / maxAbs;

    // ticks verticais
    const tickVals = temNeg ? [-maxAbs, -maxAbs / 2, 0, maxAbs / 2, maxAbs] : [0, maxAbs / 2, maxAbs];
    tickVals.forEach((val) => {
      const xx = zeroX + val * scale;
      svg.appendChild(el("line", { x1: xx, y1: m.t - 6, x2: xx, y2: m.t + items.length * rowH, stroke: val === 0 ? p.axis : p.grid, "stroke-width": val === 0 ? 1.5 : 1 }));
      svg.appendChild(txt(el("text", { x: xx, y: m.t + items.length * rowH + 18, "text-anchor": "middle", "font-size": 10, fill: p.textSoft }), fmt ? fmt(val) : val));
    });

    items.forEach((it, i) => {
      const cy = m.t + i * rowH + rowH / 2;
      const w = Math.abs(it.value) * scale;
      const x = it.value >= 0 ? zeroX : zeroX - w;
      const color = it.color || (it.value > 0 ? p.pos : p.neg);
      const rect = el("rect", { x, y: cy - 12, width: Math.max(2, w), height: 24, rx: 5, fill: color });
      interactive(rect, `<strong>${it.label}</strong><br>${(it.value >= 0 ? "+" : "−")}${fmt ? fmt(Math.abs(it.value)) : Math.abs(it.value)}`);
      svg.appendChild(rect);
      rect.animate([{ width: 0 }, { width: Math.max(2, w) }], { duration: 500, easing: "cubic-bezier(.22,1,.36,1)" });
      // rótulo da linha
      svg.appendChild(txt(el("text", { x: m.l - 12, y: cy + 4, "text-anchor": "end", "font-size": 12, fill: p.text }), it.label));
      // valor na ponta
      const vx = it.value >= 0 ? x + w + 6 : x - 6;
      svg.appendChild(txt(el("text", { x: vx, y: cy + 4, "text-anchor": it.value >= 0 ? "start" : "end", "font-size": 11, "font-weight": 700, fill: color }),
        `${it.value >= 0 ? "+" : "−"}${fmt ? fmt(Math.abs(it.value)) : Math.abs(it.value)}`));
    });

    if (xTitle) svg.appendChild(txt(el("text", { x: W / 2, y: H - 6, "text-anchor": "middle", "font-size": 10.5, fill: p.textSoft }), xTitle));
    return svg;
  }

  // =============================================================
  // Linha com área (série temporal)
  // =============================================================
  function line(host, { labels, datasets, fmt, yTitle }) {
    const p = palette();
    const W = 920, H = 380, m = { t: 44, r: 24, b: 48, l: 72 };
    const svg = makeSvg(host, W, H);
    const iw = W - m.l - m.r, yTop = m.t, yBot = H - m.b;

    const allVals = datasets.flatMap((d) => d.data.filter((v) => v != null));
    const max = niceMax(Math.max(1, ...allVals));
    const n = labels.length;
    const x = (i) => m.l + (n === 1 ? iw / 2 : (iw / (n - 1)) * i);
    const y = (v) => yBot - (v / max) * (yBot - yTop);

    yAxis(svg, p, { x0: m.l, x1: m.l + iw, yTop, yBot, max, fmt, title: yTitle });
    labels.forEach((lab, i) => svg.appendChild(txt(el("text", { x: x(i), y: yBot + 18, "text-anchor": "middle", "font-size": 11, fill: p.textSoft }), lab)));

    datasets.forEach((ds) => {
      const pts = ds.data.map((v, i) => (v == null ? null : [x(i), y(v)])).filter(Boolean);
      if (pts.length === 0) return;
      // área leve
      if (pts.length > 1) {
        let d = `M${pts[0][0]} ${yBot} `;
        pts.forEach((pt) => (d += `L${pt[0]} ${pt[1]} `));
        d += `L${pts[pts.length - 1][0]} ${yBot} Z`;
        const area = el("path", { d, fill: ds.color, opacity: 0.08 });
        svg.appendChild(area);
      }
      // linha
      let dl = "";
      pts.forEach((pt, i) => (dl += (i === 0 ? "M" : "L") + pt[0] + " " + pt[1] + " "));
      const path = el("path", { d: dl, fill: "none", stroke: ds.color, "stroke-width": 2.5, "stroke-linejoin": "round", "stroke-linecap": "round" });
      svg.appendChild(path);
      if (path.getTotalLength) {
        const len = path.getTotalLength();
        path.style.strokeDasharray = len;
        path.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 650, easing: "ease-out" });
      }
      // pontos
      ds.data.forEach((v, i) => {
        if (v == null) return;
        const c = el("circle", { cx: x(i), cy: y(v), r: 4, fill: p.surface, stroke: ds.color, "stroke-width": 2.5 });
        interactive(c, `<strong>${labels[i]}</strong><br>${ds.label}: ${fmt ? fmt(v) : v}`);
        svg.appendChild(c);
      });
    });

    legend(svg, p, datasets.map((d) => ({ label: d.label, color: d.color })), W / 2, 24);
    return svg;
  }

  // =============================================================
  // Rosca / Pizza com legenda alinhada
  // =============================================================
  function donut(host, { items, fmt, donut: isDonut = true }) {
    const p = palette();
    const W = 680, H = 360;
    const svg = makeSvg(host, W, H);
    const cx = 170, cy = H / 2, R = 118, r = isDonut ? 66 : 0;
    const total = items.reduce((a, b) => a + b.value, 0);
    const colors = p.series;
    let ang = -Math.PI / 2;

    items.forEach((it, i) => {
      const frac = it.value / total;
      const a2 = ang + frac * Math.PI * 2;
      const large = frac > 0.5 ? 1 : 0;
      const x1 = cx + R * Math.cos(ang), y1 = cy + R * Math.sin(ang);
      const x2 = cx + R * Math.cos(a2), y2 = cy + R * Math.sin(a2);
      let d;
      if (r > 0) {
        const xi1 = cx + r * Math.cos(a2), yi1 = cy + r * Math.sin(a2);
        const xi2 = cx + r * Math.cos(ang), yi2 = cy + r * Math.sin(ang);
        d = `M${x1} ${y1} A${R} ${R} 0 ${large} 1 ${x2} ${y2} L${xi1} ${yi1} A${r} ${r} 0 ${large} 0 ${xi2} ${yi2} Z`;
      } else {
        d = `M${cx} ${cy} L${x1} ${y1} A${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`;
      }
      const color = colors[i % colors.length];
      const path = el("path", { d, fill: color, stroke: p.surface, "stroke-width": 3 });
      const pct = (frac * 100).toFixed(1);
      interactive(path, `<strong>${it.label}</strong><br>${fmt ? fmt(it.value) : it.value} · ${pct}%`);
      svg.appendChild(path);
      ang = a2;
    });
    // animação de giro
    const first = svg.querySelector("path");
    if (first) svg.querySelectorAll("path").forEach((pth) => pth.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 400, easing: "ease-out" }));

    if (isDonut) {
      svg.appendChild(txt(el("text", { x: cx, y: cy - 4, "text-anchor": "middle", "font-size": 12, fill: p.textSoft, "font-weight": 700 }), "Total"));
      svg.appendChild(txt(el("text", { x: cx, y: cy + 16, "text-anchor": "middle", "font-size": 15, fill: p.text, "font-weight": 800 }), fmt ? fmt(total) : total));
    }

    // legenda com % e valor
    const lx = 350;
    const lineH = Math.min(30, (H - 40) / items.length);
    let ly = cy - (items.length * lineH) / 2 + lineH / 2;
    items.forEach((it, i) => {
      const color = colors[i % colors.length];
      const pct = ((it.value / total) * 100).toFixed(1);
      svg.appendChild(el("rect", { x: lx, y: ly - 9, width: 13, height: 13, rx: 3, fill: color }));
      svg.appendChild(txt(el("text", { x: lx + 20, y: ly + 1, "font-size": 12.5, fill: p.text, "font-weight": 600 }), it.label));
      svg.appendChild(txt(el("text", { x: W - 20, y: ly + 1, "text-anchor": "end", "font-size": 12, fill: p.textSoft }), `${pct}% · ${fmt ? fmt(it.value) : it.value}`));
      ly += lineH;
    });
    return svg;
  }

  // =============================================================
  // Cascata (waterfall) com conectores
  // steps: [{label, value, type:'start'|'end'|'delta'}]
  // =============================================================
  function waterfall(host, { steps, fmt, yTitle }) {
    const p = palette();
    const W = 680, H = 440, m = { t: 44, r: 20, b: 108, l: 76 };
    const svg = makeSvg(host, W, H);
    const iw = W - m.l - m.r, yTop = m.t, yBot = H - m.b;

    let running = 0, maxTop = 0;
    const bars = [];
    steps.forEach((s) => {
      if (s.type === "start") { bars.push({ label: s.label, base: 0, top: s.value, value: s.value, kind: "total" }); running = s.value; }
      else if (s.type === "end") { bars.push({ label: s.label, base: 0, top: s.value, value: s.value, kind: "total" }); }
      else {
        const base = running, top = running + s.value;
        bars.push({ label: s.label, base: Math.min(base, top), top: Math.max(base, top), value: s.value, kind: s.value >= 0 ? "up" : "down" });
        running = top;
      }
      maxTop = Math.max(maxTop, running, s.value || 0);
    });
    const max = niceMax(maxTop);
    const y = (v) => yBot - (v / max) * (yBot - yTop);

    yAxis(svg, p, { x0: m.l, x1: m.l + iw, yTop, yBot, max, fmt, title: yTitle });

    const slot = iw / bars.length;
    const bw = slot * 0.56;
    // nível acumulado ao final de cada barra (para os conectores)
    let acc = 0;
    const endLevels = bars.map((b) => {
      if (b.kind === "total") { acc = b.top; return b.top; }
      acc += b.value; return acc;
    });

    bars.forEach((b, i) => {
      const x = m.l + slot * i + (slot - bw) / 2;
      const xRight = x + bw;
      const yTopBar = y(b.top), yBase = y(b.base);
      const color = b.kind === "total" ? p.brand : b.kind === "up" ? p.pos : p.neg;

      // conector tracejado: do nível acumulado da barra anterior até a próxima
      if (i < bars.length - 1) {
        const yLevel = y(endLevels[i]);
        const nextX = m.l + slot * (i + 1) + (slot - bw) / 2;
        svg.appendChild(el("line", { x1: xRight, y1: yLevel, x2: nextX, y2: yLevel, stroke: p.axis, "stroke-width": 1.5, "stroke-dasharray": "4 3", opacity: .55 }));
      }

      const rect = el("rect", { x, y: yTopBar, width: bw, height: Math.max(2, yBase - yTopBar), rx: 4, fill: color });
      const signo = b.kind === "total" ? "" : (b.value >= 0 ? "+" : "−");
      interactive(rect, `<strong>${b.label}</strong><br>${signo}${fmt ? fmt(Math.abs(b.value)) : Math.abs(b.value)}`);
      svg.appendChild(rect);
      animateGrow(rect, b.kind === "total" ? yBase : (b.kind === "up" ? yBase : yTopBar));
      // valor acima da barra
      svg.appendChild(txt(el("text", { x: x + bw / 2, y: yTopBar - 7, "text-anchor": "middle", "font-size": 10, "font-weight": 700, fill: color }),
        `${signo}${fmt ? fmt(Math.abs(b.value)) : Math.abs(b.value)}`));
      // rótulo embaixo (rotacionado se longo)
      xLabel(svg, p, b.label, m.l + slot * i + slot / 2, yBot, slot);
    });

    // legenda de cores
    legend(svg, p, [
      { label: "Total", color: p.brand },
      { label: "Acima do orçado", color: p.pos },
      { label: "Economia", color: p.neg },
    ], W / 2, 24);
    return svg;
  }

  global.MiniChart = { groupedBar, horizontalBar, line, donut, waterfall, palette };
})(window);
