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
  // Grupo efetivo do card (urgente vira 'urgente' mesmo quando no painel A Fazer).
  const grupoCard = destaqueUrgente ? 'urgente' : (c.grupo || '');
  return `
    <a class="card${atrasado}" href="${escapeHtml(c.url)}" target="_blank" rel="noopener"
       data-membros="${escapeHtml(idsMembros)}" data-grupo="${escapeHtml(grupoCard)}">
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

function kpi(num, label, cor, icone, grupo, destaque = false) {
  return `<button type="button" class="kpi${destaque ? ' kpi--hero' : ''}" style="--cor:${cor}" data-filtro="${grupo}" title="Clique para filtrar por ${label}">
    <div class="kpi-top"><span class="kpi-icone">${icone}</span><span class="kpi-num">${num}</span></div>
    <div class="kpi-label">${label}</div>
  </button>`;
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
    ? `<section class="alerta" id="blocoAtraso">
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

  const recolhivel = (emoji, titulo, arr, grupo = '') => arr.length
    ? `<details class="recolhivel"${grupo ? ` data-bloco data-grupos="${grupo}"` : ''}>
         <summary>${emoji} ${titulo} <span class="cont cont--sm">${arr.length}</span></summary>
         <ul class="lista-simples">${arr.map(renderLinhaSimples).join('')}</ul>
       </details>` : '';

  const blocoProducao = producao.length
    ? `<section class="painel painel--producao" data-bloco data-grupos="producao">
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
    --bg: #eef1f7; --bg2: #e4e9f2; --surface: #ffffff; --surface2: #f8fafc; --ink: #0f172a; --muted: #64748b;
    --line: #e9edf3; --azul: #4f46e5; --azul-2: #7c3aed; --radius: 18px;
    --shadow: 0 1px 3px rgba(15,23,42,.05), 0 10px 30px -12px rgba(15,23,42,.12);
    --shadow-sm: 0 1px 2px rgba(15,23,42,.06);
    --shadow-hover: 0 14px 36px -12px rgba(79,70,229,.28);
    --track: #e8edf4;
  }
  html[data-tema="escuro"] {
    --bg: #0a0e1a; --bg2: #0e1424; --surface: #141b2e; --surface2: #1a2236; --ink: #eef2f9; --muted: #8b98b4;
    --line: #243049; --azul: #7c8cff; --azul-2: #a78bfa;
    --shadow: 0 1px 3px rgba(0,0,0,.4), 0 12px 32px -12px rgba(0,0,0,.6);
    --shadow-sm: 0 1px 2px rgba(0,0,0,.4);
    --shadow-hover: 0 16px 40px -12px rgba(0,0,0,.7);
    --track: #243049;
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
         margin: 0; color: var(--ink); -webkit-font-smoothing: antialiased; letter-spacing: -.01em;
         background: var(--bg);
         background-image: radial-gradient(1200px 600px at 100% -10%, color-mix(in srgb, var(--azul) 10%, transparent), transparent 60%),
                           radial-gradient(1000px 500px at -10% 0%, color-mix(in srgb, var(--azul-2) 9%, transparent), transparent 55%);
         background-attachment: fixed;
         transition: background-color .25s, color .25s; }
  a { text-decoration: none; color: inherit; }
  ::selection { background: color-mix(in srgb, var(--azul) 25%, transparent); }
  /* Scrollbar */
  ::-webkit-scrollbar { width: 12px; height: 12px; }
  ::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--muted) 35%, transparent); border-radius: 10px; border: 3px solid var(--bg); }
  ::-webkit-scrollbar-thumb:hover { background: color-mix(in srgb, var(--muted) 55%, transparent); }

  header { padding: 30px 24px 0; max-width: 1280px; margin: 0 auto;
           display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
  .brand { display: flex; align-items: center; gap: 13px; }
  .brand h1 { margin: 0; font-size: 27px; font-weight: 800; letter-spacing: -.03em;
              background: linear-gradient(120deg, var(--ink), color-mix(in srgb, var(--ink) 55%, var(--azul)));
              -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
  .brand .logo { width: 46px; height: 46px; border-radius: 14px;
                 background: linear-gradient(135deg, var(--azul), var(--azul-2));
                 display: grid; place-items: center; font-size: 22px;
                 box-shadow: 0 8px 20px -6px color-mix(in srgb, var(--azul) 55%, transparent); }
  .sub { color: var(--muted); font-size: 13px; margin: 9px 0 0 59px; font-weight: 500; }
  .toggle-tema { background: var(--surface); border: 1px solid var(--line); color: var(--ink);
                 border-radius: 12px; padding: 10px 15px; cursor: pointer; font-size: 14px;
                 font-weight: 600; box-shadow: var(--shadow-sm); display: flex; align-items: center; gap: 7px;
                 transition: border-color .15s, transform .1s, box-shadow .15s; }
  .toggle-tema:hover { border-color: var(--azul); transform: translateY(-1px); box-shadow: var(--shadow); }

  main { max-width: 1280px; margin: 0 auto; padding: 26px 24px 24px; }

  .kpis { display: grid; grid-template-columns: repeat(6, 1fr); gap: 14px; margin-bottom: 26px; }
  @media (max-width: 1000px) { .kpis { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 560px)  { .kpis { grid-template-columns: repeat(2, 1fr); } }
  .kpi { background: var(--surface); border-radius: var(--radius); padding: 18px 20px 16px;
         box-shadow: var(--shadow); position: relative; overflow: hidden;
         border: 1.5px solid var(--line); cursor: pointer; text-align: left; font-family: inherit;
         transition: transform .14s cubic-bezier(.2,.7,.3,1), box-shadow .14s, border-color .14s; }
  .kpi::after { content: ''; position: absolute; inset: auto 0 0 0; height: 3px;
                background: linear-gradient(90deg, var(--cor), color-mix(in srgb, var(--cor) 40%, transparent));
                transform: scaleX(0); transform-origin: left; transition: transform .2s ease; }
  .kpi:hover { transform: translateY(-3px); box-shadow: var(--shadow-hover); border-color: color-mix(in srgb, var(--cor) 45%, var(--line)); }
  .kpi:hover::after { transform: scaleX(1); }
  .kpi.ativo { border-color: var(--cor); box-shadow: 0 10px 28px -10px color-mix(in srgb, var(--cor) 50%, transparent); }
  .kpi.ativo::after { transform: scaleX(1); height: 4px; }
  .kpi.ativo::before { content: '✓ filtrando'; position: absolute; top: 9px; right: 11px;
                       font-size: 9px; font-weight: 800; color: var(--cor); text-transform: uppercase; letter-spacing: .05em; }
  .kpi-top { display: flex; align-items: center; justify-content: space-between; }
  .kpi-icone { font-size: 16px; width: 34px; height: 34px; display: grid; place-items: center; border-radius: 10px;
               background: color-mix(in srgb, var(--cor) 14%, transparent); }
  .kpi-num { font-size: 30px; font-weight: 800; line-height: 1; letter-spacing: -.03em; color: var(--ink); }
  .kpi-label { margin-top: 10px; font-size: 11.5px; color: var(--muted); font-weight: 700;
               text-transform: uppercase; letter-spacing: .05em; }
  .kpi--hero { background: linear-gradient(160deg, color-mix(in srgb, var(--cor) 7%, var(--surface)), var(--surface)); }
  .kpi--hero .kpi-num { font-size: 38px; color: var(--cor); }

  /* Estado filtrado por KPI: esconde blocos/cards que não batem */
  body.filtrando [data-bloco]:not(.bloco-visivel) { display: none; }
  body.filtrando .bloco-grupo:not(.bloco-visivel) { display: none; }
  body.filtrando #blocoAtraso { display: none; }
  body.filtrando .dois-paineis { display: none; }
  body.filtrando .secundaria > h2 { display: none; }
  .aviso-filtro { display: none; align-items: center; gap: 12px; background: var(--surface);
                  border-radius: var(--radius); padding: 12px 18px; margin-bottom: 20px; box-shadow: var(--shadow);
                  font-size: 14px; font-weight: 600; }
  body.filtrando .aviso-filtro { display: flex; }
  .aviso-filtro button { margin-left: auto; background: var(--azul); color: #fff; border: none;
                         border-radius: 9px; padding: 7px 14px; font-weight: 700; cursor: pointer; font-family: inherit; font-size: 13px; }

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
  .painel { background: var(--surface); border-radius: var(--radius); padding: 22px 24px; box-shadow: var(--shadow);
            border: 1px solid var(--line); }
  .painel--producao { grid-column: 1 / -1; margin-top: 20px; }
  .painel h2 { margin: 0 0 18px; font-size: 17px; font-weight: 700; display: flex; align-items: center; gap: 10px;
               letter-spacing: -.02em; padding-bottom: 14px; border-bottom: 1px solid var(--line); }
  .cont { background: var(--track); color: var(--muted); border-radius: 20px; padding: 2px 11px; font-size: 13px; font-weight: 700; }
  .cont--sm { font-size: 12px; padding: 1px 9px; }
  .painel--fazer h2 .cont { background: linear-gradient(135deg, var(--azul), var(--azul-2)); color: #fff; }

  .proj-grupo { margin-bottom: 20px; }
  .proj-head { display: flex; align-items: center; gap: 9px; margin: 18px 0 11px; font-size: 14px; font-weight: 700; }
  .proj-head--ideias { margin-top: 24px; }
  #listaProjetos.flash .proj-grupo { animation: flashProj .6s ease; }
  @keyframes flashProj {
    0%   { background: color-mix(in srgb, var(--azul) 12%, transparent); border-radius: 12px; }
    100% { background: transparent; }
  }
  .proj-nome { color: var(--ink); }
  .proj-grupo:first-child .proj-head { margin-top: 2px; }
  .sub-cont { background: var(--track); color: var(--muted); border-radius: 16px; padding: 1px 10px; font-size: 12px; }

  .cards { display: flex; flex-direction: column; gap: 10px; }
  .cards--grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px,1fr)); }

  .card { display: block; background: var(--surface2); border: 1px solid var(--line); border-radius: 13px;
          padding: 14px 16px; position: relative; overflow: hidden;
          transition: transform .13s cubic-bezier(.2,.7,.3,1), box-shadow .13s, border-color .13s; }
  .card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
                  background: var(--azul); opacity: 0; transition: opacity .13s; }
  .card:hover { border-color: color-mix(in srgb, var(--azul) 40%, var(--line)); box-shadow: var(--shadow-hover); transform: translateY(-2px); }
  .card:hover::before { opacity: .7; }
  .card.is-atrasado { border-color: #f1a8a8; background: color-mix(in srgb, #ef4444 5%, var(--surface2)); }
  .card.is-atrasado::before { background: #ef4444; opacity: .8; }
  .card-nome { display: block; font-size: 14px; font-weight: 600; margin: 2px 0 10px; line-height: 1.4; letter-spacing: -.01em; }
  .sem-titulo { color: var(--muted); font-weight: 500; }
  .card-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; font-size: 11.5px; }
  .tag { border-radius: 7px; padding: 3px 9px; font-weight: 600; }
  .tag--lista { background: color-mix(in srgb, var(--azul) 12%, transparent); color: var(--azul); }
  .due { font-weight: 700; margin-left: 2px; }
  .flag { display: inline-block; font-size: 9px; font-weight: 800; padding: 3px 9px;
          border-radius: 7px; letter-spacing: .07em; margin-bottom: 8px; }
  .flag--urgente { background: linear-gradient(135deg, #ef4444, #dc2626); color: #fff;
                   box-shadow: 0 3px 8px -2px rgba(239,68,68,.5); }
  .card-labels { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
  .chip { border-radius: 6px; padding: 2px 8px; font-size: 10px; font-weight: 700; color: #fff; letter-spacing: .02em; }
  .avatares { display: inline-flex; margin-left: auto; }
  .avatar { width: 24px; height: 24px; border-radius: 50%; color: #fff; font-size: 9.5px; font-weight: 800;
            display: grid; place-items: center; border: 2px solid var(--surface2); margin-left: -7px;
            box-shadow: 0 1px 3px rgba(0,0,0,.2); }
  .avatar:first-child { margin-left: 0; }
  .vazio { text-align: center; color: var(--muted); padding: 24px 10px; font-size: 14px; }

  /* Progresso */
  .progs { display: flex; flex-direction: column; gap: 16px; }
  .prog-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 7px; }
  .prog-nome { font-weight: 600; font-size: 14px; }
  .prog-pct { font-weight: 800; font-size: 14px; color: var(--azul); }
  .prog-bar { height: 10px; background: var(--track); border-radius: 8px; overflow: hidden; }
  .prog-fill { height: 100%; background: linear-gradient(90deg, #10b981, #34d399); border-radius: 8px;
               transition: width .6s cubic-bezier(.2,.7,.3,1); box-shadow: 0 1px 4px -1px rgba(16,185,129,.5); }
  .prog-sub { font-size: 11.5px; color: var(--muted); margin-top: 6px; font-weight: 500; }

  /* Gráfico */
  .grafico { display: flex; flex-direction: column; gap: 12px; }
  .graf-linha { display: grid; grid-template-columns: 130px 1fr 36px; align-items: center; gap: 12px; font-size: 13px; }
  .graf-label { color: var(--muted); font-weight: 600; }
  .graf-track { height: 16px; background: var(--track); border-radius: 8px; overflow: hidden; }
  .graf-bar { height: 100%; border-radius: 8px; transition: width .6s cubic-bezier(.2,.7,.3,1);
              background-image: linear-gradient(90deg, transparent, rgba(255,255,255,.15)); }
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
      ${kpi(totalFazer, 'A fazer', '#2563eb', '🔵', 'fazer', true)}
      ${kpi(ideias.length, 'Ideias', '#06b6d4', '💡', 'ideias', true)}
      ${kpi(andamento.length, 'Em andamento', '#f59e0b', '🟠', 'andamento')}
      ${kpi(urgente.length, 'Urgente', '#ef4444', '🔴', 'urgente')}
      ${kpi(producao.length, 'Produção', '#7c3aed', '🚀', 'producao')}
      ${kpi(finalizado.length, 'Finalizados', '#10b981', '✅', 'finalizado')}
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

    <div class="aviso-filtro" id="avisoFiltro">
      <span id="avisoFiltroTexto"></span>
      <button type="button" id="limparFiltroKpi">✕ Limpar filtro</button>
    </div>

    ${blocoAtraso}

    <div class="grid">
      <section class="painel painel--fazer" data-bloco data-grupos="fazer urgente ideias">
        <h2>📋 O que fazer agora — por projeto <span class="cont">${totalFazer}</span></h2>
        <div class="bloco-grupo" data-grupos="fazer urgente">
          <div id="listaProjetos">${blocosFazerPorProjeto || '<p class="vazio">🎉 Nada pendente a fazer!</p>'}</div>
        </div>
        <div class="bloco-grupo" data-grupos="ideias">
          <div class="proj-head proj-head--ideias">💡 <span class="proj-nome">Ideias</span><span class="sub-cont">${ideias.length}</span></div>
          <div class="cards">
            ${ideias.map((c) => renderCardFoco(c)).join('')}
            ${ideias.length === 0 ? '<p class="vazio">Sem ideias no backlog.</p>' : ''}
          </div>
        </div>
      </section>

      <section class="painel painel--andamento" data-bloco data-grupos="andamento">
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
      ${recolhivel('✅', 'Finalizados', finalizado, 'finalizado')}
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

    // Filtro por STATUS ao clicar nos KPIs
    (function () {
      const kpis = document.querySelectorAll('.kpi[data-filtro]');
      const aviso = document.getElementById('avisoFiltroTexto');
      const btnLimpar = document.getElementById('limparFiltroKpi');
      if (!kpis.length) return;
      let ativo = null;

      function temGrupo(el, grupo) {
        return (el.getAttribute('data-grupos') || '').split(' ').includes(grupo);
      }

      function aplicar(grupo) {
        ativo = grupo;
        kpis.forEach((k) => k.classList.toggle('ativo', k.dataset.filtro === grupo));
        if (!grupo) {
          document.body.classList.remove('filtrando');
          document.querySelectorAll('.bloco-visivel').forEach((e) => e.classList.remove('bloco-visivel'));
          // Reexibe cards/grupos (respeitando o filtro de responsável, se ativo).
          document.querySelectorAll('.card.oculto').forEach((c) => c.classList.remove('oculto'));
          document.querySelectorAll('.proj-grupo.oculto').forEach((p) => p.classList.remove('oculto'));
          const fr = document.getElementById('filtroResp');
          if (fr && fr.value) fr.dispatchEvent(new Event('change'));
          return;
        }
        document.body.classList.add('filtrando');
        // Marca blocos e sub-blocos que contêm o grupo.
        document.querySelectorAll('[data-bloco]').forEach((b) => {
          b.classList.toggle('bloco-visivel', temGrupo(b, grupo));
        });
        document.querySelectorAll('.bloco-grupo').forEach((b) => {
          b.classList.toggle('bloco-visivel', temGrupo(b, grupo));
        });
        // Abre o recolhível de finalizados ao filtrar por ele.
        document.querySelectorAll('details[data-bloco].bloco-visivel').forEach((d) => (d.open = true));
        // Dentro dos blocos visíveis, esconde cards que não são do grupo.
        document.querySelectorAll('.card').forEach((c) => {
          c.classList.toggle('oculto', c.getAttribute('data-grupo') !== grupo);
        });
        // Esconde grupos de projeto que ficaram sem cards visíveis.
        document.querySelectorAll('.proj-grupo').forEach((pg) => {
          const algum = [...pg.querySelectorAll('.card')].some((c) => !c.classList.contains('oculto'));
          pg.classList.toggle('oculto', !algum);
        });
        const label = [...kpis].find((k) => k.dataset.filtro === grupo).querySelector('.kpi-label').textContent;
        aviso.textContent = '🔎 Mostrando apenas: ' + label;
        document.querySelector('.aviso-filtro').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }

      kpis.forEach((k) => k.addEventListener('click', () => {
        const g = k.dataset.filtro;
        aplicar(ativo === g ? null : g); // clicar de novo no ativo limpa
      }));
      btnLimpar.addEventListener('click', () => aplicar(null));
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
