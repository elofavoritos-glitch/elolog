// =====================================================================
// app.js — lógica do dashboard (100% offline).
// Filtro por período, agregações, tabelas, gráficos (MiniChart), tema e PDF.
// =====================================================================

// ---------- Formatação (dados em R$ mil -> reais cheios) ----------
const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const brlCompact = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });
const fmtMil = (v) => (v == null ? "—" : brl.format(Math.abs(v) * 1000));
const fmtAxis = (vMil) => brlCompact.format(vMil * 1000);
const fmtSigned = (v) => {
  if (v == null) return "—";
  const s = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${s}${fmtMil(Math.abs(v))}`;
};
const fmtPct = (v) => (v == null ? "n/a" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v)}%`);

// ---------- Estado do filtro ----------
let ini = 0, fim = MESES.length - 1; // índices inclusivos

// soma um array mensal no intervalo [ini..fim], ignorando nulls; retorna null se todo nulo
function somaIntervalo(arr) {
  let soma = 0, temValor = false;
  for (let i = ini; i <= fim; i++) {
    if (arr[i] != null) { soma += arr[i]; temValor = true; }
  }
  return temValor ? Math.round(soma * 10) / 10 : null;
}

// agrega os grupos conforme o período selecionado
function gruposPeriodo() {
  return SERIE_MENSAL.map((s) => {
    const orcado = somaIntervalo(s.orcadoMensal);
    const realizado = somaIntervalo(s.realizadoMensal);
    const desvio = realizado == null ? null : (orcado == null ? realizado : Math.round((realizado - orcado) * 10) / 10);
    const pct = orcado && orcado !== 0 ? Math.round((desvio / orcado) * 100) : null;
    return { grupo: s.grupo, orcado, realizado, desvio, pct };
  });
}

// ---------- Setup do filtro ----------
(function setupFilter() {
  const selIni = document.getElementById("selIni");
  const selFim = document.getElementById("selFim");
  MESES.forEach((m, i) => {
    selIni.appendChild(new Option(m, i));
    selFim.appendChild(new Option(m, i));
  });
  selIni.value = 0;
  selFim.value = MESES.length - 1;

  const onChange = () => {
    let a = parseInt(selIni.value, 10), b = parseInt(selFim.value, 10);
    if (a > b) { [a, b] = [b, a]; selIni.value = a; selFim.value = b; }
    ini = a; fim = b;
    markPreset();
    renderAll();
  };
  selIni.addEventListener("change", onChange);
  selFim.addEventListener("change", onChange);

  // presets por trimestre
  const presets = { all: [0, 8], q1: [0, 2], q2: [3, 5], q3: [6, 8] };
  document.getElementById("presets").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-preset]");
    if (!btn) return;
    const [a, b] = presets[btn.dataset.preset];
    ini = a; fim = b;
    selIni.value = a; selFim.value = b;
    markPreset();
    renderAll();
  });

  function markPreset() {
    const map = { "0-8": "all", "0-2": "q1", "3-5": "q2", "6-8": "q3" };
    const key = map[`${ini}-${fim}`];
    document.querySelectorAll("#presets button").forEach((b) =>
      b.classList.toggle("chip-active", b.dataset.preset === key));
  }
  window.__markPreset = markPreset;
})();

// ---------- Render principal (reexecuta a cada mudança de filtro) ----------
function renderAll() {
  const grupos = gruposPeriodo();
  const periodoLabel = ini === fim ? MESES[ini] : `${MESES[ini]}–${MESES[fim]}`;
  document.getElementById("tagPeriodo1").textContent = periodoLabel.toLowerCase();
  document.getElementById("filterInfo").textContent = `${fim - ini + 1} ${fim - ini + 1 === 1 ? "mês" : "meses"} · ${periodoLabel}`;

  renderKPIs(grupos);
  renderTableGrupos(grupos);
  renderChartGrupos(grupos);
  renderWaterfall(grupos);
  renderDonut(grupos);
  renderLinha();
  renderRanking(grupos);
  renderInsights(grupos, periodoLabel);
}

// ---------- KPIs ----------
function renderKPIs(grupos) {
  const totO = grupos.reduce((s, g) => s + (g.orcado || 0), 0);
  const totR = grupos.reduce((s, g) => s + (g.realizado || 0), 0);
  const desvio = Math.round((totR - totO) * 10) / 10;
  const pct = totO ? Math.round((desvio / totO) * 100) : 0;

  document.getElementById("kpi-orcado").textContent = fmtMil(totO);
  document.getElementById("kpi-realizado").textContent = fmtMil(totR);
  const dEl = document.getElementById("kpi-desvio");
  dEl.textContent = fmtSigned(desvio);
  dEl.className = "kpi-value " + (desvio > 0 ? "val-pos" : "val-neg");
  document.getElementById("kpi-desvio-pct").textContent = `${fmtPct(pct)} vs. orçado`;

  // maior impacto absoluto
  const top = grupos.slice().sort((a, b) => Math.abs(b.desvio || 0) - Math.abs(a.desvio || 0))[0];
  const iEl = document.getElementById("kpi-impacto");
  iEl.textContent = top ? top.grupo : "—";
  iEl.className = "kpi-value";
  document.getElementById("kpi-impacto-hint").textContent = top ? `${fmtSigned(top.desvio)} de desvio` : "";
}

// ---------- Tabela de grupos ----------
function renderTableGrupos(grupos) {
  const tbody = document.querySelector("#tableGrupos tbody");
  tbody.innerHTML = "";
  grupos.forEach((g) => {
    const cls = (g.desvio || 0) > 0 ? "val-pos" : "val-neg";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${g.grupo}</td>
      <td class="num">${g.orcado == null ? '<span class="muted">—</span>' : fmtMil(g.orcado)}</td>
      <td class="num">${fmtMil(g.realizado)}</td>
      <td class="num ${cls}">${fmtSigned(g.desvio)}</td>
      <td class="num ${g.pct == null ? "muted" : cls}">${fmtPct(g.pct)}</td>`;
    tbody.appendChild(tr);
  });
  const totO = grupos.reduce((s, g) => s + (g.orcado || 0), 0);
  const totR = grupos.reduce((s, g) => s + (g.realizado || 0), 0);
  const totD = Math.round((totR - totO) * 10) / 10;
  let tfoot = document.querySelector("#tableGrupos tfoot");
  if (tfoot) tfoot.remove();
  tfoot = document.createElement("tfoot");
  tfoot.innerHTML = `<tr>
      <td>Total</td>
      <td class="num">${fmtMil(totO)}</td>
      <td class="num">${fmtMil(totR)}</td>
      <td class="num ${totD > 0 ? "val-pos" : "val-neg"}">${fmtSigned(totD)}</td>
      <td class="num ${totD > 0 ? "val-pos" : "val-neg"}">${fmtPct(totO ? Math.round((totD / totO) * 100) : null)}</td>
    </tr>`;
  document.getElementById("tableGrupos").appendChild(tfoot);
}

// ---------- Gráfico: barras agrupadas Orçado x Realizado ----------
function renderChartGrupos(grupos) {
  const p = MiniChart.palette();
  MiniChart.groupedBar(document.getElementById("chartGrupos"), {
    labels: grupos.map((g) => g.grupo),
    datasets: [
      { label: "Orçado", color: p.slate, data: grupos.map((g) => g.orcado) },
      { label: "Realizado", color: p.brand, data: grupos.map((g) => g.realizado) },
    ],
    fmt: fmtAxis,
    yTitle: "Valor (R$)",
  });
}

// ---------- Gráfico: cascata (orçado -> desvios -> realizado) ----------
function renderWaterfall(grupos) {
  const totO = grupos.reduce((s, g) => s + (g.orcado || 0), 0);
  const totR = grupos.reduce((s, g) => s + (g.realizado || 0), 0);
  const steps = [{ label: "Orçado", value: totO, type: "start" }];
  grupos.forEach((g) => {
    if (g.desvio) steps.push({ label: g.grupo, value: g.desvio, type: "delta" });
  });
  steps.push({ label: "Realizado", value: totR, type: "end" });
  MiniChart.waterfall(document.getElementById("chartWaterfall"), { steps, fmt: fmtAxis, yTitle: "Valor (R$)" });
}

// ---------- Gráfico: composição (rosca) ----------
function renderDonut(grupos) {
  const items = grupos
    .filter((g) => (g.realizado || 0) > 0)
    .map((g) => ({ label: g.grupo, value: g.realizado }))
    .sort((a, b) => b.value - a.value);
  MiniChart.donut(document.getElementById("chartDonut"), { items, fmt: fmtAxis, donut: true });
}

// ---------- Gráfico: linha (evolução mensal realizado) ----------
function renderLinha() {
  const p = MiniChart.palette();
  const labels = MESES.slice(ini, fim + 1);
  const datasets = SERIE_MENSAL.map((s, idx) => ({
    label: s.grupo,
    color: p.series[idx % p.series.length],
    data: s.realizadoMensal.slice(ini, fim + 1),
  }));
  MiniChart.line(document.getElementById("chartLinha"), { labels, datasets, fmt: fmtAxis, yTitle: "Realizado (R$)" });
}

// ---------- Gráfico: ranking de impactos ----------
function renderRanking(grupos) {
  const p = MiniChart.palette();
  const items = grupos
    .filter((g) => g.desvio != null && g.desvio !== 0)
    .map((g) => ({ label: g.grupo, value: g.desvio, color: g.desvio > 0 ? p.pos : p.neg }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  MiniChart.horizontalBar(document.getElementById("chartRanking"), {
    items, fmt: fmtAxis, xTitle: "Desvio (R$) — vermelho acima do orçado · verde economia",
  });
}

// ---------- Movimentos de pessoal (fixo: acumulado) ----------
function renderPessoal() {
  const p = MiniChart.palette();
  // tabela
  const badge = { "Favorável": "badge-fav", "Atenção": "badge-att", "Monitorar": "badge-mon", "Pontual?": "badge-pon" };
  const tbody = document.querySelector("#tablePessoal tbody");
  tbody.innerHTML = "";
  PESSOAL.forEach((x) => {
    const cls = x.desvio > 0 ? "val-pos" : "val-neg";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${x.linha}</td>
      <td class="num ${cls}">${fmtSigned(x.desvio)}</td>
      <td class="num ${x.variacao == null ? "muted" : cls}">${x.variacao == null ? "sem orçamento" : fmtPct(x.variacao)}</td>
      <td><span class="badge ${badge[x.leitura] || "badge-mon"}">${x.leitura}</span></td>`;
    tbody.appendChild(tr);
  });
  // gráfico
  const items = PESSOAL
    .map((x) => ({ label: x.linha, value: x.desvio, color: x.desvio > 0 ? p.pos : p.neg }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  MiniChart.horizontalBar(document.getElementById("chartPessoal"), {
    items, fmt: fmtAxis, xTitle: "Desvio (R$) — verde economia · vermelho acima",
  });
}

// ---------- Insights ----------
function renderInsights(grupos, periodoLabel) {
  const ul = document.getElementById("insights");
  ul.innerHTML = "";
  const items = [];

  const comDesvio = grupos.filter((g) => g.desvio != null && g.desvio !== 0);
  const maior = comDesvio.slice().sort((a, b) => Math.abs(b.desvio) - Math.abs(a.desvio))[0];
  if (maior) {
    const acima = maior.desvio > 0;
    items.push({
      cls: acima ? "warn" : "good",
      html: `No período <strong>${periodoLabel}</strong>, o maior impacto é de <strong>${maior.grupo}</strong>: ${fmtSigned(maior.desvio)} ${acima ? "acima" : "abaixo"} do orçado${maior.pct != null ? ` (<strong>${fmtPct(maior.pct)}</strong>)` : ""}.`,
    });
  }
  const pessoal = grupos.find((g) => g.grupo === "Pessoal");
  if (pessoal && pessoal.desvio < 0) {
    items.push({ cls: "good", html: `<strong>Pessoal</strong> segue favorável (${fmtSigned(pessoal.desvio)}), puxado pela queda de <strong>salários PJ (−36%)</strong> no acumulado.` });
  }
  const tec = grupos.find((g) => g.grupo === "Tecnologia");
  if (tec && tec.desvio > 0) {
    items.push({ cls: "warn", html: `<strong>Tecnologia</strong> é a principal pressão de gasto: ${fmtSigned(tec.desvio)}${tec.pct != null ? ` (${fmtPct(tec.pct)})` : ""}.` });
  }
  items.push({ cls: "warn", html: `Em Pessoal há migração para CLT: <strong>Salários CLT +22%</strong>, <strong>INSS +44%</strong> e <strong>FGTS +50%</strong> sobem juntos.` });
  items.push({ cls: "", html: `<strong>Viagens</strong> e <strong>Rescisões</strong> surgiram sem orçamento previsto — avaliar se são eventos pontuais.` });

  items.forEach((i) => {
    const li = document.createElement("li");
    if (i.cls) li.classList.add(i.cls);
    li.innerHTML = i.html;
    ul.appendChild(li);
  });
}

// ---------- Tema claro/escuro ----------
(function themeToggle() {
  const btn = document.getElementById("btnTheme");
  const label = btn.querySelector(".hbtn-label");
  const icon = btn.querySelector(".hbtn-icon");
  const setTheme = (dark) => {
    document.documentElement.classList.toggle("dark", dark);
    btn.setAttribute("aria-pressed", String(dark));
    label.textContent = dark ? "Tema claro" : "Tema escuro";
    icon.textContent = dark ? "☀️" : "🌙";
    try { localStorage.setItem("theme", dark ? "dark" : "light"); } catch (e) {}
    // redesenha os gráficos para pegar as cores do tema
    if (window.__ready) { renderAll(); renderPessoal(); }
  };
  let saved = null;
  try { saved = localStorage.getItem("theme"); } catch (e) {}
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  btn.addEventListener("click", () => setTheme(!document.documentElement.classList.contains("dark")));
  // aplica sem redesenhar ainda (os gráficos vêm no boot)
  document.documentElement.classList.toggle("dark", saved ? saved === "dark" : prefersDark);
  const dark = document.documentElement.classList.contains("dark");
  btn.setAttribute("aria-pressed", String(dark));
  label.textContent = dark ? "Tema claro" : "Tema escuro";
  icon.textContent = dark ? "☀️" : "🌙";
})();

// ---------- Exportar PDF ----------
document.getElementById("btnPdf").addEventListener("click", () => window.print());

// ---------- Boot ----------
renderAll();
renderPessoal();
window.__ready = true;

// redesenha ao redimensionar (SVG recalcula posições)
let _rt;
window.addEventListener("resize", () => {
  clearTimeout(_rt);
  _rt = setTimeout(() => { renderAll(); renderPessoal(); }, 150);
});
