// =====================================================================
// charts.js — mini biblioteca de gráficos em SVG puro (100% offline).
// Sem dependências, sem CDN. Suporta: barras agrupadas, barras horizontais,
// linha, pizza/rosca e cascata (waterfall).
// Todos os gráficos leem as cores do tema via CSS custom properties,
// então funcionam em tema claro e escuro automaticamente.
// =====================================================================
(function (global) {
  const NS = "http://www.w3.org/2000/svg";
  const el = (name, attrs = {}) => {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  };

  function themeColor(varName, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    return v || fallback;
  }

  // paleta coerente com o CSS
  function palette() {
    return {
      text: themeColor("--chart-text", "#475569"),
      grid: themeColor("--chart-grid", "#e2e8f0"),
      axis: themeColor("--chart-axis", "#94a3b8"),
      pos: themeColor("--pos", "#dc2626"),
      neg: themeColor("--neg", "#16a34a"),
      brand: themeColor("--brand", "#4f46e5"),
      slate: "#94a3b8",
      series: ["#4f46e5", "#06b6d4", "#f59e0b", "#8b5cf6", "#ec4899", "#10b981"],
    };
  }

  function clearHost(host) {
    while (host.firstChild) host.removeChild(host.firstChild);
  }

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
    t.style.left = evt.pageX + 12 + "px";
    t.style.top = evt.pageY + 12 + "px";
  }
  function hideTip() { if (tipEl) tipEl.style.display = "none"; }

  function attachTip(node, html) {
    node.addEventListener("mousemove", (e) => showTip(html, e));
    node.addEventListener("mouseleave", hideTip);
    node.style.cursor = "default";
  }

  function makeSvg(host, w, h) {
    clearHost(host);
    const svg = el("svg", {
      viewBox: `0 0 ${w} ${h}`,
      width: "100%",
      height: "100%",
      preserveAspectRatio: "xMidYMid meet",
      role: "img",
    });
    host.appendChild(svg);
    return svg;
  }

  function niceMax(v) {
    if (v <= 0) return 1;
    const mag = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / mag;
    const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return step * mag;
  }

  // =============================================================
  // Barras agrupadas (vertical) — datasets: [{label,color,data[]}]
  // =============================================================
  function groupedBar(host, { labels, datasets, fmt, yTitle }) {
    const p = palette();
    const W = 640, H = 360, m = { t: 20, r: 16, b: 70, l: 64 };
    const svg = makeSvg(host, W, H);
    const iw = W - m.l - m.r, ih = H - m.t - m.b;

    const allVals = datasets.flatMap((d) => d.data.filter((v) => v != null));
    const max = niceMax(Math.max(1, ...allVals));
    const y = (v) => m.t + ih - (v / max) * ih;

    // grid + eixo Y
    const ticks = 5;
    for (let i = 0; i <= ticks; i++) {
      const val = (max / ticks) * i;
      const yy = y(val);
      svg.appendChild(el("line", { x1: m.l, y1: yy, x2: m.l + iw, y2: yy, stroke: p.grid, "stroke-width": 1 }));
      const tx = el("text", { x: m.l - 8, y: yy + 4, "text-anchor": "end", "font-size": 11, fill: p.text });
      tx.textContent = fmt ? fmt(val) : val;
      svg.appendChild(tx);
    }
    if (yTitle) {
      const t = el("text", { x: 14, y: m.t + ih / 2, "text-anchor": "middle", "font-size": 11, fill: p.text, transform: `rotate(-90 14 ${m.t + ih / 2})` });
      t.textContent = yTitle;
      svg.appendChild(t);
    }

    const groupW = iw / labels.length;
    const barGap = 6;
    const barW = (groupW - barGap * (datasets.length + 1)) / datasets.length;

    labels.forEach((lab, gi) => {
      const gx = m.l + groupW * gi;
      datasets.forEach((ds, di) => {
        const v = ds.data[gi];
        if (v == null) return;
        const bx = gx + barGap + di * (barW + barGap);
        const by = y(v);
        const bh = m.t + ih - by;
        const rect = el("rect", { x: bx, y: by, width: Math.max(1, barW), height: Math.max(0, bh), rx: 4, fill: ds.color });
        attachTip(rect, `<strong>${lab}</strong><br>${ds.label}: ${fmt ? fmt(v) : v}`);
        svg.appendChild(rect);
      });
      const tx = el("text", { x: gx + groupW / 2, y: m.t + ih + 16, "text-anchor": "middle", "font-size": 10.5, fill: p.text });
      wrapLabel(tx, lab, gx + groupW / 2, m.t + ih + 16);
      svg.appendChild(tx);
    });

    legend(svg, datasets.map((d) => ({ label: d.label, color: d.color })), W, m.t - 4);
    return svg;
  }

  // quebra rótulos longos em 2 linhas
  function wrapLabel(textNode, str, x, y) {
    const words = str.split(" ");
    if (words.length <= 1 || str.length <= 11) { textNode.textContent = str; return; }
    const mid = Math.ceil(words.length / 2);
    const l1 = words.slice(0, mid).join(" ");
    const l2 = words.slice(mid).join(" ");
    const t1 = el("tspan", { x, dy: 0 }); t1.textContent = l1;
    const t2 = el("tspan", { x, dy: 12 }); t2.textContent = l2;
    textNode.appendChild(t1); textNode.appendChild(t2);
  }

  function legend(svg, items, W, y) {
    const g = el("g");
    const itemW = 120;
    const totalW = items.length * itemW;
    let x = (W - totalW) / 2;
    items.forEach((it) => {
      g.appendChild(el("rect", { x, y: y - 9, width: 11, height: 11, rx: 2, fill: it.color }));
      const t = el("text", { x: x + 16, y: y, "font-size": 11, fill: palette().text });
      t.textContent = it.label;
      g.appendChild(t);
      x += itemW;
    });
    svg.appendChild(g);
  }

  // =============================================================
  // Barras horizontais com cor por sinal (impacto / desvios)
  // items: [{label, value, color?}]
  // =============================================================
  function horizontalBar(host, { items, fmt, xTitle }) {
    const p = palette();
    const W = 640, rowH = 34, m = { t: 16, r: 24, b: 40, l: 160 };
    const H = m.t + m.b + items.length * rowH;
    const svg = makeSvg(host, W, H);
    const iw = W - m.l - m.r;

    const maxAbs = niceMax(Math.max(1, ...items.map((i) => Math.abs(i.value))));
    const zeroX = m.l + iw / 2;
    const scale = (iw / 2) / maxAbs;

    // linha zero
    svg.appendChild(el("line", { x1: zeroX, y1: m.t - 4, x2: zeroX, y2: m.t + items.length * rowH, stroke: p.axis, "stroke-width": 1.5 }));
    // ticks laterais
    [-maxAbs, -maxAbs / 2, maxAbs / 2, maxAbs].forEach((val) => {
      const xx = zeroX + val * scale;
      svg.appendChild(el("line", { x1: xx, y1: m.t - 4, x2: xx, y2: m.t + items.length * rowH, stroke: p.grid, "stroke-width": 1 }));
      const t = el("text", { x: xx, y: m.t + items.length * rowH + 16, "text-anchor": "middle", "font-size": 10, fill: p.text });
      t.textContent = fmt ? fmt(val) : val;
      svg.appendChild(t);
    });

    items.forEach((it, i) => {
      const cy = m.t + i * rowH + rowH / 2;
      const w = Math.abs(it.value) * scale;
      const x = it.value >= 0 ? zeroX : zeroX - w;
      const color = it.color || (it.value > 0 ? p.pos : p.neg);
      const rect = el("rect", { x, y: cy - 10, width: Math.max(1, w), height: 20, rx: 4, fill: color });
      attachTip(rect, `<strong>${it.label}</strong><br>${fmt ? fmt(it.value) : it.value}`);
      svg.appendChild(rect);
      const lab = el("text", { x: m.l - 10, y: cy + 4, "text-anchor": "end", "font-size": 11.5, fill: p.text });
      lab.textContent = it.label;
      svg.appendChild(lab);
    });

    if (xTitle) {
      const t = el("text", { x: W / 2, y: H - 6, "text-anchor": "middle", "font-size": 10.5, fill: p.text });
      t.textContent = xTitle;
      svg.appendChild(t);
    }
    return svg;
  }

  // =============================================================
  // Linha (série temporal) — datasets: [{label,color,data[]}]
  // =============================================================
  function line(host, { labels, datasets, fmt, yTitle }) {
    const p = palette();
    const W = 640, H = 340, m = { t: 20, r: 18, b: 42, l: 64 };
    const svg = makeSvg(host, W, H);
    const iw = W - m.l - m.r, ih = H - m.t - m.b;

    const allVals = datasets.flatMap((d) => d.data.filter((v) => v != null));
    const max = niceMax(Math.max(1, ...allVals));
    const x = (i) => m.l + (iw / (labels.length - 1)) * i;
    const y = (v) => m.t + ih - (v / max) * ih;

    const ticks = 5;
    for (let i = 0; i <= ticks; i++) {
      const val = (max / ticks) * i;
      const yy = y(val);
      svg.appendChild(el("line", { x1: m.l, y1: yy, x2: m.l + iw, y2: yy, stroke: p.grid, "stroke-width": 1 }));
      const tx = el("text", { x: m.l - 8, y: yy + 4, "text-anchor": "end", "font-size": 11, fill: p.text });
      tx.textContent = fmt ? fmt(val) : val;
      svg.appendChild(tx);
    }
    labels.forEach((lab, i) => {
      const tx = el("text", { x: x(i), y: m.t + ih + 16, "text-anchor": "middle", "font-size": 10.5, fill: p.text });
      tx.textContent = lab;
      svg.appendChild(tx);
    });
    if (yTitle) {
      const t = el("text", { x: 14, y: m.t + ih / 2, "text-anchor": "middle", "font-size": 11, fill: p.text, transform: `rotate(-90 14 ${m.t + ih / 2})` });
      t.textContent = yTitle;
      svg.appendChild(t);
    }

    datasets.forEach((ds) => {
      let d = "";
      ds.data.forEach((v, i) => {
        if (v == null) return;
        d += (d === "" ? "M" : "L") + x(i) + " " + y(v) + " ";
      });
      svg.appendChild(el("path", { d, fill: "none", stroke: ds.color, "stroke-width": 2.5, "stroke-linejoin": "round" }));
      ds.data.forEach((v, i) => {
        if (v == null) return;
        const c = el("circle", { cx: x(i), cy: y(v), r: 3.5, fill: ds.color });
        attachTip(c, `<strong>${labels[i]}</strong><br>${ds.label}: ${fmt ? fmt(v) : v}`);
        svg.appendChild(c);
      });
    });

    legend(svg, datasets.map((d) => ({ label: d.label, color: d.color })), W, m.t - 4);
    return svg;
  }

  // =============================================================
  // Rosca / Pizza — items: [{label, value}]
  // =============================================================
  function donut(host, { items, fmt, donut: isDonut = true }) {
    const p = palette();
    const W = 640, H = 340;
    const svg = makeSvg(host, W, H);
    const cx = 180, cy = H / 2, R = 120, r = isDonut ? 64 : 0;
    const total = items.reduce((a, b) => a + b.value, 0);
    let ang = -Math.PI / 2;
    const colors = p.series;

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
      const path = el("path", { d, fill: color, stroke: themeColor("--surface", "#fff"), "stroke-width": 2 });
      const pct = ((frac) * 100).toFixed(1);
      attachTip(path, `<strong>${it.label}</strong><br>${fmt ? fmt(it.value) : it.value} · ${pct}%`);
      svg.appendChild(path);
      ang = a2;
    });

    if (isDonut) {
      const t1 = el("text", { x: cx, y: cy - 4, "text-anchor": "middle", "font-size": 13, fill: p.text, "font-weight": 700 });
      t1.textContent = "Total";
      const t2 = el("text", { x: cx, y: cy + 16, "text-anchor": "middle", "font-size": 14, fill: p.text, "font-weight": 800 });
      t2.textContent = fmt ? fmt(total) : total;
      svg.appendChild(t1); svg.appendChild(t2);
    }

    // legenda lateral
    let ly = cy - items.length * 13;
    items.forEach((it, i) => {
      const color = colors[i % colors.length];
      svg.appendChild(el("rect", { x: 350, y: ly, width: 12, height: 12, rx: 2, fill: color }));
      const t = el("text", { x: 368, y: ly + 11, "font-size": 12, fill: p.text });
      const pct = ((it.value / total) * 100).toFixed(1);
      t.textContent = `${it.label} — ${pct}%`;
      svg.appendChild(t);
      ly += 26;
    });
    return svg;
  }

  // =============================================================
  // Cascata (waterfall) — do orçado ao realizado passando pelos desvios
  // steps: [{label, value, type:'start'|'end'|'delta'}]
  // =============================================================
  function waterfall(host, { steps, fmt, yTitle }) {
    const p = palette();
    const W = 680, H = 380, m = { t: 24, r: 16, b: 76, l: 72 };
    const svg = makeSvg(host, W, H);
    const iw = W - m.l - m.r, ih = H - m.t - m.b;

    // calcula posições cumulativas
    let running = 0;
    const bars = [];
    let maxTop = 0;
    steps.forEach((s) => {
      if (s.type === "start") {
        bars.push({ label: s.label, base: 0, top: s.value, value: s.value, kind: "total" });
        running = s.value;
      } else if (s.type === "end") {
        bars.push({ label: s.label, base: 0, top: s.value, value: s.value, kind: "total" });
      } else {
        const base = running;
        const top = running + s.value;
        bars.push({ label: s.label, base: Math.min(base, top), top: Math.max(base, top), value: s.value, kind: s.value >= 0 ? "up" : "down" });
        running = top;
      }
      maxTop = Math.max(maxTop, running, s.value || 0);
    });
    const max = niceMax(maxTop);
    const y = (v) => m.t + ih - (v / max) * ih;

    const ticks = 5;
    for (let i = 0; i <= ticks; i++) {
      const val = (max / ticks) * i;
      const yy = y(val);
      svg.appendChild(el("line", { x1: m.l, y1: yy, x2: m.l + iw, y2: yy, stroke: p.grid, "stroke-width": 1 }));
      const tx = el("text", { x: m.l - 8, y: yy + 4, "text-anchor": "end", "font-size": 11, fill: p.text });
      tx.textContent = fmt ? fmt(val) : val;
      svg.appendChild(tx);
    }
    if (yTitle) {
      const t = el("text", { x: 16, y: m.t + ih / 2, "text-anchor": "middle", "font-size": 11, fill: p.text, transform: `rotate(-90 16 ${m.t + ih / 2})` });
      t.textContent = yTitle;
      svg.appendChild(t);
    }

    const slot = iw / bars.length;
    const bw = slot * 0.6;
    bars.forEach((b, i) => {
      const x = m.l + slot * i + (slot - bw) / 2;
      const yTop = y(b.top), yBase = y(b.base);
      const color = b.kind === "total" ? p.brand : b.kind === "up" ? p.pos : p.neg;
      const rect = el("rect", { x, y: yTop, width: bw, height: Math.max(1, yBase - yTop), rx: 3, fill: color });
      const signo = b.kind === "total" ? "" : (b.value >= 0 ? "+" : "−");
      attachTip(rect, `<strong>${b.label}</strong><br>${signo}${fmt ? fmt(Math.abs(b.value)) : Math.abs(b.value)}`);
      svg.appendChild(rect);
      // conector
      if (i < bars.length - 1 && b.kind !== "total") {
        // nada
      }
      const tx = el("text", { x: m.l + slot * i + slot / 2, y: m.t + ih + 16, "text-anchor": "middle", "font-size": 10, fill: p.text });
      wrapLabel(tx, b.label, m.l + slot * i + slot / 2, m.t + ih + 16);
      svg.appendChild(tx);
    });

    return svg;
  }

  global.MiniChart = { groupedBar, horizontalBar, line, donut, waterfall, palette };
})(window);
