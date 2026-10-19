import { STATUS, STATUS_META, formatarData } from './prazoUtils.js';
import { GRUPOS } from './grupos.js';

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const CORES_LABEL = {
  green: '#61bd4f', yellow: '#f2d600', orange: '#ff9f1a', red: '#eb5a46',
  purple: '#c377e0', blue: '#0079bf', sky: '#00c2e0', lime: '#51e898',
  pink: '#ff78cb', black: '#344563', green_dark: '#519839', yellow_dark: '#d9b51c',
  orange_dark: '#cd8313', red_dark: '#b04632', purple_dark: '#89609e', blue_dark: '#055a8c',
};

// Cores estáveis para avatares de responsáveis (por iniciais).
const CORES_AVATAR = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#0891b2', '#16a34a', '#ca8a04', '#dc2626'];
function corAvatar(seed = '') {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % CORES_AVATAR.length;
  return CORES_AVATAR[h];
}

function semTitulo(c) {
  const n = (c.name || '').replace(/[.\s·•\-_]/g, '');
  return n.length === 0;
}

function renderLabels(labels = []) {
  const visiveis = labels.filter((l) => l && (l.name || l.color));
  if (visiveis.length === 0) return '';
  const chips = visiveis
    .map((l) => {
      const cor = CORES_LABEL[l.color] || '#b3bac5';
      return `<span class="chip" style="background:${cor}" title="${escapeHtml(l.name || l.color)}">${escapeHtml(l.name || '')}</span>`;
    })
    .join('');
  return `<div class="card-labels">${chips}</div>`;
}

function renderMembros(membros = []) {
  if (!membros.length) return '';
  const avatares = membros
    .map((m) => `<span class="avatar" style="background:${corAvatar(m.iniciais)}" title="${escapeHtml(m.nome)}">${escapeHtml(m.iniciais)}</span>`)
    .join('');
  return `<span class="avatares">${avatares}</span>`;
}

function prioridade(c) {
  if (c.grupo === 'urgente') return 0;
  if (c.status === STATUS.ATRASADO) return 1;
  if (c.status === STATUS.VENCENDO) return 2;
  if (c.due) return 3;
  return 4;
}

function textoPrazo(c) {
  if (!c.due) return '';
  const meta = STATUS_META[c.status];
  let restante = '';
  if (c.diasRestantes !== null && c.status !== STATUS.CONCLUIDO) {
    if (c.diasRestantes < 0) restante = ` · ${Math.abs(c.diasRestantes)}d atrás`;
    else if (c.diasRestantes === 0) restante = ' · hoje';
    else restante = ` · em ${c.diasRestantes}d`;
  }
  return `<span class="due" style="color:${meta.cor}">${meta.emoji} ${formatarData(c.due)}${restante}</span>`;
}

function renderCardFoco(c, destaqueUrgente = false) {
  const flag = destaqueUrgente || c.grupo === 'urgente'
    ? '<span class="flag flag--urgente">URGENTE</span>' : '';
  const atrasado = c.status === STATUS.ATRASADO ? ' is-atrasado' : '';
  const nome = semTitulo(c) ? '<em class="sem-titulo">(sem título)</em>' : escapeHtml(c.name);
  // IDs de membros para o filtro por responsável (client-side).
  const idsMembros = (c.membros || []).map((m) => m.id).join(' ');
  return `
    <a class="card${atrasado}" href="${escapeHtml(c.url)}" target="_blank" rel="noopener"
       data-membros="${escapeHtml(idsMembros)}">
      ${flag}${renderLabels(c.labels)}
      <span class="card-nome">${nome}</span>
      <span class="card-meta">
        <span class="tag tag--lista">${escapeHtml(c.listaNome)}</span>
        ${textoPrazo(c)}
        ${renderMembros(c.membros)}
      </span>
    </a>`;
}

function renderLinhaSimples(c) {
  const prazo = c.due ? `<span class="simples-due">${formatarData(c.due)}</span>` : '';
  const nome = semTitulo(c) ? '<em class="sem-titulo">(sem título)</em>' : escapeHtml(c.name);
  return `<li><a href="${escapeHtml(c.url)}" target="_blank" rel="noopener">${nome}</a>
    <span class="simples-board">${escapeHtml(c.boardName)}</span>${prazo}</li>`;
}

function kpi(num, label, cor, icone, destaque = false) {
  return `<div class="kpi${destaque ? ' kpi--hero' : ''}" style="--cor:${cor}">
    <div class="kpi-top"><span class="kpi-icone">${icone}</span><span class="kpi-num">${num}</span></div>
    <div class="kpi-label">${label}</div>
  </div>`;
}

// Barra de progresso de um projeto.
function renderProgresso(b) {
  return `
    <div class="prog">
      <div class="prog-head">
        <a href="${escapeHtml(b.url)}" target="_blank" rel="noopener" class="prog-nome">${escapeHtml(b.name)}</a>
        <span class="prog-pct">${b.pct}%</span>
      </div>
      <div class="prog-bar"><div class="prog-fill" style="width:${b.pct}%"></div></div>
      <div class="prog-sub">${b.finalizados} de ${b.total} concluídos</div>
    </div>`;
}

// Gráfico de distribuição (barras horizontais, puro CSS).
function renderGrafico(dist) {
  const max = Math.max(1, ...dist.map((d) => d.valor));
  return dist
    .map((d) => `
      <div class="graf-linha">
        <span class="graf-label">${d.emoji} ${d.label}</span>
        <div class="graf-track"><div class="graf-bar" style="width:${(d.valor / max) * 100}%;background:${d.cor}"></div></div>
        <span class="graf-val">${d.valor}</span>
      </div>`)
    .join('');
}

export function gerarDashboardHtml({ boards, porGrupo, porBoard, todosCards, me }) {
  const geradoEm = new Date().toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const g = porGrupo || {};
  const limpar = (arr) => (arr || []).filter((c) => !semTitulo(c));
  const ordenarPorPrazo = (arr) => [...arr].sort((a, b) => prioridade(a) - prioridade(b) ||
    (a.due ? new Date(a.due) : Infinity) - (b.due ? new Date(b.due) : Infinity));

  const fazer = ordenarPorPrazo(limpar(g.fazer));
  const ideias = ordenarPorPrazo(limpar(g.ideias));
  const andamento = ordenarPorPrazo(limpar(g.andamento));
  const urgente = limpar(g.urgente);
  const producao = limpar(g.producao);
  const pausado = limpar(g.pausado);
  const finalizado = limpar(g.finalizado);
  const outros = limpar(g.outros);

  const totalFazer = fazer.length + urgente.length;
  const totalHeroi = totalFazer + ideias.length;
  const totalGeral = todosCards ? todosCards.length : 0;

  const atrasados = ordenarPorPrazo(
    (todosCards || []).filter(
      (c) => c.status === STATUS.ATRASADO && c.grupo !== 'finalizado' && c.grupo !== 'outros' && !semTitulo(c)
    )
  );

  // Responsáveis únicos (para o filtro por pessoa).
  const membrosMap = new Map();
  for (const c of todosCards || []) {
    for (const m of c.membros || []) {
      if (!membrosMap.has(m.id)) membrosMap.set(m.id, m);
    }
  }
  const responsaveis = [...membrosMap.values()].sort((a, b) => a.nome.localeCompare(b.nome));

  // Texto do resumo de atrasados (pronto para copiar).
  const resumoAtrasoTexto = atrasados.length
    ? `⚠️ ${atrasados.length} tarefa(s) atrasada(s):\n\n` +
      atrasados
        .map((c) => {
          const resp = (c.membros || []).map((m) => m.nome).join(', ');
          const venc = c.due ? formatarData(c.due) : '—';
          const dias = c.diasRestantes !== null ? ` (${Math.abs(c.diasRestantes)}d atrás)` : '';
          return `• [${c.boardName}] ${c.name} — venceu ${venc}${dias}${resp ? ' · ' + resp : ''}`;
        })
        .join('\n')
    : '✅ Nenhuma tarefa atrasada!';

  const blocoAtraso = atrasados.length
    ? `<section class="alerta">
         <div class="alerta-head">
           <span>⚠️ <strong>${atrasados.length}</strong> ${atrasados.length === 1 ? 'tarefa atrasada' : 'tarefas atrasadas'} — resolver primeiro</span>
           <button class="btn-copiar" id="btnCopiarAtraso" data-resumo="${escapeHtml(resumoAtrasoTexto)}">📋 Copiar resumo</button>
         </div>
         <div class="alerta-cards">${atrasados.map((c) => renderCardFoco(c)).join('')}</div>
       </section>`
    : '';

  // "A Fazer" agrupado por board/projeto (urgentes incluídos aqui).
  const paraFazerTodos = [...urgente, ...fazer];
  const porBoardFazer = new Map();
  for (const c of paraFazerTodos) {
    if (!porBoardFazer.has(c.boardName)) porBoardFazer.set(c.boardName, []);
    porBoardFazer.get(c.boardName).push(c);
  }
  const blocosFazerPorProjeto = [...porBoardFazer.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([board, cards]) => {
      const atrasadosBoard = cards.filter((c) => c.status === STATUS.ATRASADO).length;
      return `
      <div class="proj-grupo" data-board="${escapeHtml(board)}" data-qtd="${cards.length}" data-atrasados="${atrasadosBoard}">
        <div class="proj-head"><span class="proj-nome">${escapeHtml(board)}</span><span class="sub-cont">${cards.length}</span>${atrasadosBoard ? `<span class="proj-atraso">${atrasadosBoard} atrasado(s)</span>` : ''}</div>
        <div class="cards">${cards.map((c) => renderCardFoco(c)).join('')}</div>
      </div>`;
    })
    .join('');

  // Barras de progresso por projeto (só boards com cards).
  const progressos = (porBoard || []).filter((b) => b.total > 0).sort((a, b) => b.total - a.total);
  const blocoProgresso = progressos.length
    ? `<section class="painel">
         <h2>📈 Progresso por projeto</h2>
         <div class="progs">${progressos.map(renderProgresso).join('')}</div>
       </section>`
    : '';

  // Gráfico de distribuição por grupo.
  const dist = [
    { label: 'A fazer', valor: fazer.length + urgente.length, cor: '#2563eb', emoji: '🔵' },
    { label: 'Ideias', valor: ideias.length, cor: '#06b6d4', emoji: '💡' },
    { label: 'Em andamento', valor: andamento.length, cor: '#f59e0b', emoji: '🟠' },
    { label: 'Produção', valor: producao.length, cor: '#7c3aed', emoji: '🚀' },
    { label: 'Pausado', valor: pausado.length, cor: '#94a3b8', emoji: '⏸️' },
    { label: 'Finalizados', valor: finalizado.length, cor: '#10b981', emoji: '✅' },
  ].filter((d) => d.valor > 0);
  const blocoGrafico = `
    <section class="painel">
      <h2>📊 Distribuição dos cards</h2>
      <div class="grafico">${renderGrafico(dist)}</div>
    </section>`;

  const recolhivel = (emoji, titulo, arr) => arr.length
    ? `<details class="recolhivel">
         <summary>${emoji} ${titulo} <span class="cont cont--sm">${arr.length}</span></summary>
         <ul class="lista-simples">${arr.map(renderLinhaSimples).join('')}</ul>
       </details>` : '';

  const blocoProducao = producao.length
    ? `<section class="painel painel--producao">
         <h2>${GRUPOS.producao.emoji} Indo pra produção <span class="cont">${producao.length}</span></h2>
         <div class="cards cards--grid">${producao.map((c) => renderCardFoco(c)).join('')}</div>
       </section>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR" data-tema="claro">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Foco do Dia · Trello</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #f4f6fb; --surface: #ffffff; --surface2: #fbfcfe; --ink: #1a2235; --muted: #6b7a90;
    --line: #eef1f6; --azul: #2563eb; --radius: 16px;
    --shadow: 0 1px 2px rgba(16,24,40,.04), 0 8px 24px rgba(16,24,40,.06);
    --track: #eceff4;
  }
  html[data-tema="escuro"] {
    --bg: #0f1420; --surface: #171d2b; --surface2: #1c2433; --ink: #e7ecf3; --muted: #93a1b5;
    --line: #26303f; --azul: #4f86ff;
    --shadow: 0 1px 2px rgba(0,0,0,.3), 0 8px 24px rgba(0,0,0,.35);
    --track: #26303f;
  }
  * { box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
         margin: 0; background: var(--bg); color: var(--ink);
         -webkit-font-smoothing: antialiased; transition: background .2s, color .2s; }
  a { text-decoration: none; color: inherit; }

  header { padding: 32px 24px 0; max-width: 1280px; margin: 0 auto;
           display: flex; align-items: flex-start; justify-content: space-between; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand h1 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -.02em; }
  .brand .logo { width: 44px; height: 44px; border-radius: 12px;
                 background: linear-gradient(135deg, #2563eb, #7c3aed);
                 display: grid; place-items: center; font-size: 22px; box-shadow: var(--shadow); }
  .sub { color: var(--muted); font-size: 13px; margin: 8px 0 0 56px; }
  .toggle-tema { background: var(--surface); border: 1px solid var(--line); color: var(--ink);
                 border-radius: 12px; padding: 9px 14px; cursor: pointer; font-size: 14px;
                 font-weight: 600; box-shadow: var(--shadow); display: flex; align-items: center; gap: 7px; }
  .toggle-tema:hover { border-color: var(--azul); }

  main { max-width: 1280px; margin: 0 auto; padding: 24px; }

  .kpis { display: grid; grid-template-columns: repeat(6, 1fr); gap: 14px; margin-bottom: 28px; }
  @media (max-width: 1000px) { .kpis { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 560px)  { .kpis { grid-template-columns: repeat(2, 1fr); } }
  .kpi { background: var(--surface); border-radius: var(--radius); padding: 18px 20px;
         box-shadow: var(--shadow); position: relative; overflow: hidden; }
  .kpi::after { content: ''; position: absolute; inset: 0 auto 0 0; width: 4px; background: var(--cor); }
  .kpi-top { display: flex; align-items: center; justify-content: space-between; }
  .kpi-icone { font-size: 18px; opacity: .9; }
  .kpi-num { font-size: 32px; font-weight: 800; line-height: 1; letter-spacing: -.02em; }
  .kpi-label { margin-top: 8px; font-size: 12px; color: var(--muted); font-weight: 600;
               text-transform: uppercase; letter-spacing: .04em; }
  .kpi--hero .kpi-num { font-size: 40px; color: var(--cor); }

  /* Controles (filtro + ordenação) */
  .controles { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end; margin-bottom: 24px;
               background: var(--surface); border-radius: var(--radius); padding: 16px 18px; box-shadow: var(--shadow); }
  .ctrl { display: flex; flex-direction: column; gap: 5px; }
  .ctrl-label { font-size: 11.5px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; }
  .ctrl select { background: var(--surface2); color: var(--ink); border: 1px solid var(--line);
                 border-radius: 10px; padding: 9px 13px; font-size: 14px; font-weight: 600; cursor: pointer; min-width: 190px;
                 font-family: inherit; }
  .ctrl select:focus { outline: none; border-color: var(--azul); }
  .ctrl-info { font-size: 13px; color: var(--muted); font-weight: 600; margin-left: auto; align-self: center; }

  .alerta { background: var(--surface); border: 1px solid #fcd4d4; border-left: 5px solid #ef4444;
            border-radius: var(--radius); padding: 18px 20px; margin-bottom: 28px; box-shadow: var(--shadow); }
  html[data-tema="escuro"] .alerta { border-color: #5b2626; }
  .alerta-head { font-size: 15px; color: #ef4444; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
  .alerta-head strong { font-size: 17px; }
  .btn-copiar { background: #ef4444; color: #fff; border: none; border-radius: 9px; padding: 7px 13px;
                font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; }
  .btn-copiar:hover { background: #dc2626; }
  .btn-copiar.ok { background: #10b981; }
  .proj-atraso { background: #fee2e2; color: #b42318; border-radius: 12px; padding: 1px 9px; font-size: 11px; font-weight: 700; }
  html[data-tema="escuro"] .proj-atraso { background: #4a1d1d; color: #fca5a5; }
  .card.oculto, .proj-grupo.oculto { display: none; }
  .alerta-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px,1fr)); gap: 10px; }

  .grid { display: grid; grid-template-columns: 1.7fr 1fr; gap: 20px; align-items: start; }
  @media (max-width: 880px) { .grid { grid-template-columns: 1fr; } }
  .painel { background: var(--surface); border-radius: var(--radius); padding: 20px 22px; box-shadow: var(--shadow); }
  .painel--producao { grid-column: 1 / -1; margin-top: 20px; }
  .painel h2 { margin: 0 0 16px; font-size: 18px; font-weight: 700; display: flex; align-items: center; gap: 10px; }
  .cont { background: var(--track); color: var(--muted); border-radius: 20px; padding: 2px 11px; font-size: 13px; font-weight: 700; }
  .cont--sm { font-size: 12px; padding: 1px 9px; }
  .painel--fazer h2 .cont { background: var(--azul); color: #fff; }

  .proj-grupo { margin-bottom: 20px; }
  .proj-head { display: flex; align-items: center; gap: 9px; margin: 18px 0 11px; font-size: 14px; font-weight: 700; }
  .proj-head--ideias { margin-top: 24px; }
  #listaProjetos.flash .proj-grupo { animation: flashProj .6s ease; }
  @keyframes flashProj {
    0%   { background: rgba(37,99,235,.10); border-radius: 10px; }
    100% { background: transparent; }
  }
  .proj-nome { color: var(--ink); }
  .proj-grupo:first-child .proj-head { margin-top: 2px; }
  .sub-cont { background: var(--track); color: var(--muted); border-radius: 16px; padding: 1px 10px; font-size: 12px; }

  .cards { display: flex; flex-direction: column; gap: 10px; }
  .cards--grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px,1fr)); }

  .card { display: block; background: var(--surface2); border: 1px solid var(--line); border-radius: 12px;
          padding: 13px 15px; transition: all .12s ease; }
  .card:hover { border-color: var(--azul); box-shadow: 0 6px 18px rgba(37,99,235,.14); transform: translateY(-2px); }
  .card.is-atrasado { border-color: #f1a8a8; }
  .card-nome { display: block; font-size: 14.5px; font-weight: 600; margin: 2px 0 9px; line-height: 1.35; }
  .sem-titulo { color: var(--muted); font-weight: 500; }
  .card-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; font-size: 11.5px; }
  .tag { border-radius: 6px; padding: 2px 8px; font-weight: 600; }
  .tag--lista { background: #e7f0ff; color: #1d4ed8; }
  html[data-tema="escuro"] .tag--lista { background: #1e2d4d; color: #8db4ff; }
  .due { font-weight: 700; margin-left: 2px; }
  .flag { display: inline-block; font-size: 9.5px; font-weight: 800; padding: 2px 8px;
          border-radius: 6px; letter-spacing: .06em; margin-bottom: 7px; }
  .flag--urgente { background: #ef4444; color: #fff; }
  .card-labels { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 7px; }
  .chip { border-radius: 5px; padding: 1px 7px; font-size: 10px; font-weight: 700; color: #fff; }
  .avatares { display: inline-flex; margin-left: auto; }
  .avatar { width: 22px; height: 22px; border-radius: 50%; color: #fff; font-size: 9.5px; font-weight: 800;
            display: grid; place-items: center; border: 2px solid var(--surface2); margin-left: -6px; }
  .avatar:first-child { margin-left: 0; }
  .vazio { text-align: center; color: var(--muted); padding: 24px 10px; font-size: 14px; }

  /* Progresso */
  .progs { display: flex; flex-direction: column; gap: 16px; }
  .prog-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 7px; }
  .prog-nome { font-weight: 600; font-size: 14px; }
  .prog-pct { font-weight: 800; font-size: 14px; color: var(--azul); }
  .prog-bar { height: 10px; background: var(--track); border-radius: 6px; overflow: hidden; }
  .prog-fill { height: 100%; background: linear-gradient(90deg, #10b981, #34d399); border-radius: 6px; transition: width .5s ease; }
  .prog-sub { font-size: 11.5px; color: var(--muted); margin-top: 5px; }

  /* Gráfico */
  .grafico { display: flex; flex-direction: column; gap: 11px; }
  .graf-linha { display: grid; grid-template-columns: 130px 1fr 36px; align-items: center; gap: 10px; font-size: 13px; }
  .graf-label { color: var(--muted); font-weight: 600; }
  .graf-track { height: 14px; background: var(--track); border-radius: 7px; overflow: hidden; }
  .graf-bar { height: 100%; border-radius: 7px; transition: width .5s ease; }
  .graf-val { font-weight: 800; text-align: right; }

  .dois-paineis { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 28px; }
  @media (max-width: 880px) { .dois-paineis { grid-template-columns: 1fr; } }

  .secundaria { margin-top: 30px; }
  .secundaria > h2 { font-size: 13px; text-transform: uppercase; color: var(--muted);
                     letter-spacing: .06em; margin: 0 0 12px; font-weight: 700; }
  .recolhivel { background: var(--surface); border-radius: 12px; margin-bottom: 10px; box-shadow: var(--shadow); overflow: hidden; }
  .recolhivel > summary { cursor: pointer; padding: 14px 18px; font-weight: 600; font-size: 14px;
                          list-style: none; display: flex; align-items: center; gap: 10px; }
  .recolhivel > summary::-webkit-details-marker { display: none; }
  .recolhivel > summary::before { content: '▸'; color: var(--muted); transition: transform .15s; }
  .recolhivel[open] > summary::before { transform: rotate(90deg); }
  .lista-simples { list-style: none; margin: 0; padding: 0 18px 14px; }
  .lista-simples li { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-top: 1px solid var(--line); font-size: 13px; }
  .lista-simples a { flex: 1; color: var(--ink); }
  .lista-simples a:hover { color: var(--azul); }
  .simples-board { background: var(--track); color: var(--muted); border-radius: 5px; padding: 1px 7px; font-size: 11px; }
  .simples-due { color: var(--muted); font-size: 11px; }

  footer { text-align: center; color: var(--muted); font-size: 12px; padding: 28px; }
  footer a { color: var(--azul); font-weight: 600; }
</style>
</head>
<body>
  <header>
    <div>
      <div class="brand"><div class="logo">🎯</div><h1>Foco do Dia</h1></div>
      <div class="sub">${me ? escapeHtml(me.fullName || me.username) + ' · ' : ''}${totalGeral} cards no total · atualizado ${geradoEm}</div>
    </div>
    <button class="toggle-tema" id="toggleTema" aria-label="Alternar tema"><span id="temaIcone">🌙</span> <span id="temaTexto">Escuro</span></button>
  </header>
  <main>
    <div class="kpis">
      ${kpi(totalFazer, 'A fazer', '#2563eb', '🔵', true)}
      ${kpi(ideias.length, 'Ideias', '#06b6d4', '💡', true)}
      ${kpi(andamento.length, 'Em andamento', '#f59e0b', '🟠')}
      ${kpi(urgente.length, 'Urgente', '#ef4444', '🔴')}
      ${kpi(producao.length, 'Produção', '#7c3aed', '🚀')}
      ${kpi(finalizado.length, 'Finalizados', '#10b981', '✅')}
    </div>

    <div class="controles">
      <label class="ctrl">
        <span class="ctrl-label">👤 Responsável</span>
        <select id="filtroResp">
          <option value="">Todos</option>
          <option value="__sem__">Sem responsável</option>
          ${responsaveis.map((m) => `<option value="${escapeHtml(m.id)}">${escapeHtml(m.nome)}</option>`).join('')}
        </select>
      </label>
      <label class="ctrl">
        <span class="ctrl-label">↕️ Ordenar projetos</span>
        <select id="ordenarProj">
          <option value="qtd">Mais cards primeiro</option>
          <option value="qtd-asc">Menos cards primeiro</option>
          <option value="alfa">Nome (A→Z)</option>
          <option value="atraso">Mais atrasados primeiro</option>
        </select>
      </label>
      <span class="ctrl-info" id="ctrlInfo"></span>
    </div>

    ${blocoAtraso}

    <div class="grid">
      <section class="painel painel--fazer">
        <h2>📋 O que fazer agora — por projeto <span class="cont">${totalFazer}</span></h2>
        <div id="listaProjetos">${blocosFazerPorProjeto || '<p class="vazio">🎉 Nada pendente a fazer!</p>'}</div>
        <div class="proj-head proj-head--ideias">💡 <span class="proj-nome">Ideias</span><span class="sub-cont">${ideias.length}</span></div>
        <div class="cards">
          ${ideias.map((c) => renderCardFoco(c)).join('')}
          ${ideias.length === 0 ? '<p class="vazio">Sem ideias no backlog.</p>' : ''}
        </div>
      </section>

      <section class="painel painel--andamento">
        <h2>🟠 Em andamento <span class="cont">${andamento.length}</span></h2>
        <div class="cards">
          ${andamento.map((c) => renderCardFoco(c)).join('')}
          ${andamento.length === 0 ? '<p class="vazio">Nada em andamento.</p>' : ''}
        </div>
      </section>

      ${blocoProducao}
    </div>

    <div class="dois-paineis">
      ${blocoProgresso}
      ${blocoGrafico}
    </div>

    <div class="secundaria">
      <h2>Concluído &amp; arquivado</h2>
      ${recolhivel('✅', 'Finalizados', finalizado)}
      ${recolhivel(GRUPOS.pausado.emoji, 'Pausados', pausado)}
      ${recolhivel(GRUPOS.outros.emoji, 'Outros / Cancelados', outros)}
    </div>
  </main>
  <footer>Gerado pelo agente Kiro · dados ao vivo do Trello · <a href="/orcamento">Orçamento de TI →</a></footer>
  <script>
    (function () {
      const html = document.documentElement;
      const btn = document.getElementById('toggleTema');
      const icone = document.getElementById('temaIcone');
      const texto = document.getElementById('temaTexto');
      function aplicar(tema) {
        html.setAttribute('data-tema', tema);
        const escuro = tema === 'escuro';
        icone.textContent = escuro ? '☀️' : '🌙';
        texto.textContent = escuro ? 'Claro' : 'Escuro';
        try { localStorage.setItem('tema', tema); } catch (e) {}
      }
      let salvo = 'claro';
      try { salvo = localStorage.getItem('tema') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'); } catch (e) {}
      aplicar(salvo);
      btn.addEventListener('click', () => aplicar(html.getAttribute('data-tema') === 'escuro' ? 'claro' : 'escuro'));
    })();

    // Filtro por responsável
    (function () {
      const sel = document.getElementById('filtroResp');
      const info = document.getElementById('ctrlInfo');
      if (!sel) return;
      sel.addEventListener('change', () => {
        const v = sel.value;
        let visiveis = 0;
        document.querySelectorAll('.card').forEach((card) => {
          const membros = (card.getAttribute('data-membros') || '').split(' ').filter(Boolean);
          let mostra = true;
          if (v === '__sem__') mostra = membros.length === 0;
          else if (v) mostra = membros.includes(v);
          card.classList.toggle('oculto', !mostra);
          if (mostra) visiveis++;
        });
        // Esconde grupos de projeto que ficaram sem cards visíveis.
        document.querySelectorAll('.proj-grupo').forEach((pg) => {
          const algum = [...pg.querySelectorAll('.card')].some((c) => !c.classList.contains('oculto'));
          pg.classList.toggle('oculto', !algum);
        });
        info.textContent = v ? visiveis + ' card(s) visível(is)' : '';
      });
    })();

    // Ordenar projetos no "A Fazer"
    (function () {
      const sel = document.getElementById('ordenarProj');
      const lista = document.getElementById('listaProjetos');
      if (!sel || !lista) return;

      function ordenar() {
        const grupos = [...lista.querySelectorAll(':scope > .proj-grupo')];
        if (grupos.length === 0) return;
        const modo = sel.value;
        grupos.sort((a, b) => {
          const qa = +a.dataset.qtd, qb = +b.dataset.qtd;
          const aa = +a.dataset.atrasados, ab = +b.dataset.atrasados;
          if (modo === 'qtd') return (qb - qa) || a.dataset.board.localeCompare(b.dataset.board);
          if (modo === 'qtd-asc') return (qa - qb) || a.dataset.board.localeCompare(b.dataset.board);
          if (modo === 'alfa') return a.dataset.board.localeCompare(b.dataset.board, 'pt');
          if (modo === 'atraso') return (ab - aa) || (qb - qa);
          return 0;
        });
        // Reanexa na nova ordem dentro do próprio container.
        grupos.forEach((gp) => lista.appendChild(gp));
        // Feedback visual: pisca rapidamente os grupos reordenados.
        lista.classList.remove('flash');
        void lista.offsetWidth; // força reflow para reiniciar a animação
        lista.classList.add('flash');
        // Texto de feedback com a ordem atual.
        const info = document.getElementById('ctrlInfo');
        if (info) {
          const label = sel.options[sel.selectedIndex].textContent;
          const ordem = grupos.map((g) => g.dataset.board).join(' → ');
          info.textContent = 'Ordenado: ' + label + ' (' + ordem + ')';
        }
      }

      sel.addEventListener('change', ordenar);
    })();

    // Copiar resumo de atrasados
    (function () {
      const btn = document.getElementById('btnCopiarAtraso');
      if (!btn) return;
      btn.addEventListener('click', async () => {
        const texto = btn.getAttribute('data-resumo') || '';
        try {
          await navigator.clipboard.writeText(texto);
        } catch (e) {
          const ta = document.createElement('textarea');
          ta.value = texto; document.body.appendChild(ta); ta.select();
          document.execCommand('copy'); document.body.removeChild(ta);
        }
        const orig = btn.textContent;
        btn.textContent = '✅ Copiado!'; btn.classList.add('ok');
        setTimeout(() => { btn.textContent = orig; btn.classList.remove('ok'); }, 1800);
      });
    })();
  </script>
</body>
</html>`;
}
