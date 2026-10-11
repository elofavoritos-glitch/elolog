// ===== Helpers de formatação =====
// Os dados em data.js estão em R$ mil; aqui convertemos para reais cheios.
const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
// v em R$ mil -> string em reais cheios (ex.: 509.3 -> "R$ 509.300,00")
const fmtMil = (v) => {
  if (v === null || v === undefined) return "—";
  return brl.format(Math.abs(v) * 1000);
};
const fmtSigned = (v) => {
  if (v === null || v === undefined) return "—";
  const sign = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${sign}${fmtMil(Math.abs(v))}`;
};
const fmtPct = (v) => {
  if (v === null || v === undefined) return "n/a";
  const sign = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${sign}${Math.abs(v)}%`;
};

// ===== KPIs =====
(function renderKPIs() {
  const comOrcamento = GRUPOS.filter((g) => g.orcado !== null);
  const totalOrcado = comOrcamento.reduce((s, g) => s + g.orcado, 0);
  const totalRealizado = GRUPOS.reduce((s, g) => s + g.realizado, 0);
  const desvio = totalRealizado - totalOrcado;
  const pct = (desvio / totalOrcado) * 100;
  const emAtencao = GRUPOS.filter((g) => g.desvio > 0).length;

  document.getElementById("kpi-orcado").textContent = fmtMil(totalOrcado);
  document.getElementById("kpi-realizado").textContent = fmtMil(totalRealizado);

  const desvioEl = document.getElementById("kpi-desvio");
  desvioEl.textContent = fmtSigned(desvio);
  desvioEl.classList.add(desvio > 0 ? "val-pos" : "val-neg");

  document.getElementById("kpi-desvio-pct").textContent =
    `${fmtPct(Math.round(pct))} vs. orçado`;
  document.getElementById("kpi-atencao").textContent = `${emAtencao} de ${GRUPOS.length}`;
})();

// ===== Tabela de grupos =====
(function renderTableGrupos() {
  const tbody = document.querySelector("#tableGrupos tbody");
  GRUPOS.forEach((g) => {
    const tr = document.createElement("tr");
    const desvioCls = g.desvio > 0 ? "val-pos" : "val-neg";
    tr.innerHTML = `
      <td>${g.grupo}</td>
      <td class="num">${g.orcado === null ? '<span class="muted">—</span>' : fmtMil(g.orcado)}</td>
      <td class="num">${fmtMil(g.realizado)}</td>
      <td class="num ${desvioCls}">${fmtSigned(g.desvio)}</td>
      <td class="num ${g.pct === null ? "muted" : desvioCls}">${fmtPct(g.pct)}</td>
    `;
    tbody.appendChild(tr);
  });

  const comOrcamento = GRUPOS.filter((g) => g.orcado !== null);
  const totO = comOrcamento.reduce((s, g) => s + g.orcado, 0);
  const totR = GRUPOS.reduce((s, g) => s + g.realizado, 0);
  const totD = totR - totO;
  const tfoot = document.createElement("tfoot");
  tfoot.innerHTML = `
    <tr>
      <td>Total</td>
      <td class="num">${fmtMil(totO)}</td>
      <td class="num">${fmtMil(totR)}</td>
      <td class="num ${totD > 0 ? "val-pos" : "val-neg"}">${fmtSigned(totD)}</td>
      <td class="num ${totD > 0 ? "val-pos" : "val-neg"}">${fmtPct(Math.round((totD / totO) * 100))}</td>
    </tr>`;
  document.getElementById("tableGrupos").appendChild(tfoot);
})();

// ===== Tabela de pessoal =====
(function renderTablePessoal() {
  const badgeMap = {
    "Favorável": "badge-fav",
    "Atenção": "badge-att",
    "Monitorar": "badge-mon",
    "Pontual?": "badge-pon",
  };
  const tbody = document.querySelector("#tablePessoal tbody");
  PESSOAL.forEach((p) => {
    const tr = document.createElement("tr");
    const desvioCls = p.desvio > 0 ? "val-pos" : "val-neg";
    const badgeCls = badgeMap[p.leitura] || "badge-mon";
    tr.innerHTML = `
      <td>${p.linha}</td>
      <td class="num ${desvioCls}">${fmtSigned(p.desvio)}</td>
      <td class="num ${p.variacao === null ? "muted" : desvioCls}">${p.variacao === null ? "sem orçamento" : fmtPct(p.variacao)}</td>
      <td><span class="badge ${badgeCls}">${p.leitura}</span></td>
    `;
    tbody.appendChild(tr);
  });
})();

// ===== Gráficos =====
const RED = "#dc2626";
const GREEN = "#16a34a";
const INDIGO = "#4f46e5";
const SLATE = "#94a3b8";

Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
Chart.defaults.color = "#475569";

// Formatador compacto para os eixos (valores em R$ mil -> reais cheios, abreviado)
const brlCompact = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});
const fmtAxis = (vMil) => brlCompact.format(vMil * 1000);

// Orçado vs Realizado por grupo
const chartGrupos = new Chart(document.getElementById("chartGrupos"), {
  type: "bar",
  data: {
    labels: GRUPOS.map((g) => g.grupo),
    datasets: [
      {
        label: "Orçado",
        data: GRUPOS.map((g) => g.orcado),
        backgroundColor: SLATE,
        borderRadius: 6,
      },
      {
        label: "Realizado",
        data: GRUPOS.map((g) => g.realizado),
        backgroundColor: INDIGO,
        borderRadius: 6,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${fmtMil(ctx.parsed.y)}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: (v) => fmtAxis(v) },
        title: { display: true, text: "Valor (R$)" },
      },
      x: { ticks: { maxRotation: 35, minRotation: 0 } },
    },
  },
});

// Desvios de pessoal (barra horizontal, cor por sinal)
const chartPessoal = new Chart(document.getElementById("chartPessoal"), {
  type: "bar",
  data: {
    labels: PESSOAL.map((p) => p.linha),
    datasets: [
      {
        label: "Desvio (R$)",
        data: PESSOAL.map((p) => p.desvio),
        backgroundColor: PESSOAL.map((p) => (p.desvio > 0 ? RED : GREEN)),
        borderRadius: 6,
      },
    ],
  },
  options: {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `Desvio: ${fmtSigned(ctx.parsed.x)}`,
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: "Valor (R$) — verde = economia, vermelho = acima" },
        ticks: { callback: (v) => fmtAxis(v) },
        grid: { color: (c) => (c.tick.value === 0 ? "#94a3b8" : "#e2e8f0") },
      },
    },
  },
});

// ===== Insights =====
(function renderInsights() {
  const items = [
    { cls: "warn", html: "<strong>Tecnologia</strong> estourou o orçado em <strong>+24%</strong> (+R$ 123.600,00) — maior pressão de gasto do período." },
    { cls: "good", html: "<strong>Pessoal</strong> ficou <strong>−5%</strong> abaixo do orçado (−R$ 51.300,00), puxado pela queda de <strong>salários PJ (−36%)</strong>." },
    { cls: "warn", html: "Dentro de Pessoal, há migração para CLT: <strong>Salários CLT +22%</strong>, <strong>INSS +44%</strong> e <strong>FGTS +50%</strong> sobem juntos." },
    { cls: "warn", html: "<strong>Despesas administrativas</strong> subiram <strong>+61%</strong> e <strong>Viagens</strong> (R$ 40.500,00) surgiram sem orçamento previsto." },
    { cls: "", html: "<strong>Rescisões</strong> de R$ 44.900,00 não tinham orçamento — avaliar se é evento pontual ou recorrente." },
  ];
  const ul = document.getElementById("insights");
  items.forEach((i) => {
    const li = document.createElement("li");
    if (i.cls) li.classList.add(i.cls);
    li.innerHTML = i.html;
    ul.appendChild(li);
  });
})();

// ===== Tema claro/escuro =====
(function themeToggle() {
  const btn = document.getElementById("btnTheme");
  const label = btn.querySelector(".hbtn-label");
  const icon = btn.querySelector(".hbtn-icon");
  const charts = [chartGrupos, chartPessoal];

  const applyChartTheme = (dark) => {
    const tick = dark ? "#cbd5e1" : "#475569";
    const grid = dark ? "rgba(148,163,184,.2)" : "#e2e8f0";
    const zeroGrid = dark ? "#64748b" : "#94a3b8";
    Chart.defaults.color = tick;
    charts.forEach((c) => {
      Object.values(c.options.scales || {}).forEach((sc) => {
        if (sc.ticks) sc.ticks.color = tick;
        if (sc.title) sc.title.color = tick;
        if (sc.grid) {
          sc.grid.color = (ctx) => (ctx.tick && ctx.tick.value === 0 ? zeroGrid : grid);
        }
      });
      if (c.options.plugins && c.options.plugins.legend && c.options.plugins.legend.labels) {
        c.options.plugins.legend.labels.color = tick;
      }
      c.update();
    });
  };

  const setTheme = (dark) => {
    document.documentElement.classList.toggle("dark", dark);
    btn.setAttribute("aria-pressed", String(dark));
    label.textContent = dark ? "Tema claro" : "Tema escuro";
    icon.textContent = dark ? "☀️" : "🌙";
    try { localStorage.setItem("theme", dark ? "dark" : "light"); } catch (e) {}
    applyChartTheme(dark);
  };

  // Preferência salva ou do sistema
  let saved = null;
  try { saved = localStorage.getItem("theme"); } catch (e) {}
  const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  setTheme(saved ? saved === "dark" : prefersDark);

  btn.addEventListener("click", () => {
    setTheme(!document.documentElement.classList.contains("dark"));
  });
})();

// ===== Exportar PDF =====
(function pdfExport() {
  const btn = document.getElementById("btnPdf");
  btn.addEventListener("click", () => {
    // Redimensiona os gráficos antes de imprimir para caber na página
    window.print();
  });
})();
