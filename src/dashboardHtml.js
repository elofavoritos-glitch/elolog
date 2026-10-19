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

// Considera "sem título" cards cujo nome é vazio, "." ou só pontuação/espaços.
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
  return `
    <a class="card${atrasado}" href="${escapeHtml(c.url)}" target="_blank" rel="noopener">
      ${flag}${renderLabels(c.labels)}
      <span class="card-nome">${nome}</span>
      <span class="card-meta">
        <span class="tag tag--board">${escapeHtml(c.boardName)}</span>
        <span class="tag tag--lista">${escapeHtml(c.listaNome)}</span>
        ${textoPrazo(c)}
      </span>
    </a>`;
}

function renderLinhaSimples(c) {
  const prazo = c.due ? `<span class="simples-due">${formatarData(c.due)}</span>` : '';
  const nome = semTitulo(c) ? '<em class="sem-titulo">(sem título)</em>' : escapeHtml(c.name);
  return `<li><a href="${escapeHtml(c.url)}" target="_blank" rel="noopener">${nome}</a>
    <span class="simples-board">${escapeHtml(c.boardName)}</span>${prazo}</li>`;
}

// Card de número grande no painel de totais.
function kpi(num, label, cor, icone, destaque = false) {
  return `<div class="kpi${destaque ? ' kpi--hero' : ''}" style="--cor:${cor}">
    <div class="kpi-top"><span class="kpi-icone">${icone}</span><span class="kpi-num">${num}</span></div>
    <div class="kpi-label">${label}</div>
  </div>`;
}

export function gerarDashboardHtml({ boards, porGrupo, todosCards, me }) {
  const geradoEm = new Date().toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const g = porGrupo || {};
  // Remove cards sem título dos grupos de foco (limpa a visão).
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

  // Todos os atrasados (de qualquer grupo não-finalizado), ordenados.
  const atrasados = ordenarPorPrazo(
    (todosCards || []).filter(
      (c) => c.status === STATUS.ATRASADO && c.grupo !== 'finalizado' && c.grupo !== 'outros' && !semTitulo(c)
    )
  );

  const blocoAtraso = atrasados.length
    ? `<section class="alerta">
         <div class="alerta-head">⚠️ <strong>${atrasados.length}</strong> ${atrasados.length === 1 ? 'tarefa atrasada' : 'tarefas atrasadas'} — resolver primeiro</div>
         <div class="alerta-cards">${atrasados.map((c) => renderCardFoco(c)).join('')}</div>
       </section>`
    : '';

  const blocoProducao = producao.length
    ? `<section class="painel painel--producao">
         <h2>${GRUPOS.producao.emoji} Indo pra produção <span class="cont">${producao.length}</span></h2>
         <div class="cards cards--grid">${producao.map((c) => renderCardFoco(c)).join('')}</div>
       </section>`
    : '';

  const recolhivel = (emoji, titulo, arr) => arr.length
    ? `<details class="recolhivel">
         <summary>${emoji} ${titulo} <span class="cont cont--sm">${arr.length}</span></summary>
         <ul class="lista-simples">${arr.map(renderLinhaSimples).join('')}</ul>
       </details>` : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Foco do Dia · Trello</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #f4f6fb; --surface: #ffffff; --ink: #1a2235; --muted: #6b7a90;
    --line: #eef1f6; --azul: #2563eb; --radius: 16px;
    --shadow: 0 1px 2px rgba(16,24,40,.04), 0 8px 24px rgba(16,24,40,.06);
  }
  * { box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
         margin: 0; background: var(--bg); color: var(--ink);
         -webkit-font-smoothing: antialiased; }
  a { text-decoration: none; color: inherit; }

  header { padding: 32px 24px 0; max-width: 1280px; margin: 0 auto; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand h1 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -.02em; }
  .brand .logo { width: 44px; height: 44px; border-radius: 12px;
                 background: linear-gradient(135deg, #2563eb, #7c3aed);
                 display: grid; place-items: center; font-size: 22px; box-shadow: var(--shadow); }
  header .sub { color: var(--muted); font-size: 13px; margin: 8px 0 0 56px; }

  main { max-width: 1280px; margin: 0 auto; padding: 24px; }

  /* KPIs */
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
  .kpi--hero { background: linear-gradient(135deg, #eff4ff, #ffffff); }
  .kpi--hero .kpi-num { font-size: 40px; color: var(--cor); }

  /* Alerta de atrasados */
  .alerta { background: linear-gradient(180deg, #fff1f1, #fff); border: 1px solid #fcd4d4;
            border-radius: var(--radius); padding: 18px 20px; margin-bottom: 28px; box-shadow: var(--shadow); }
  .alerta-head { font-size: 15px; color: #b42318; margin-bottom: 14px; }
  .alerta-head strong { font-size: 17px; }
  .alerta-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px,1fr)); gap: 10px; }

  /* Layout principal */
  .grid { display: grid; grid-template-columns: 1.7fr 1fr; gap: 20px; align-items: start; }
  @media (max-width: 880px) { .grid { grid-template-columns: 1fr; } }
  .painel { background: var(--surface); border-radius: var(--radius); padding: 20px 22px; box-shadow: var(--shadow); }
  .painel--producao { grid-column: 1 / -1; margin-top: 20px; }
  .painel h2 { margin: 0 0 16px; font-size: 18px; font-weight: 700; display: flex; align-items: center; gap: 10px; }
  .cont { background: #eef2f9; color: #475467; border-radius: 20px; padding: 2px 11px; font-size: 13px; font-weight: 700; }
  .cont--sm { font-size: 12px; padding: 1px 9px; }
  .painel--fazer h2 .cont { background: var(--azul); color: #fff; }

  .sub { }
  .sub-titulo { display: flex; align-items: center; gap: 9px; font-size: 14px; font-weight: 700;
                margin: 22px 0 12px; color: #344054; }
  .sub-titulo:first-of-type { margin-top: 4px; }
  .sub-cont { background: #eef2f9; color: #475467; border-radius: 16px; padding: 1px 10px; font-size: 12px; }

  .cards { display: flex; flex-direction: column; gap: 10px; }
  .cards--grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px,1fr)); }

  .card { display: block; background: #fbfcfe; border: 1px solid var(--line); border-radius: 12px;
          padding: 13px 15px; transition: all .12s ease; position: relative; }
  .card:hover { border-color: #d6e0f5; box-shadow: 0 6px 18px rgba(37,99,235,.12); transform: translateY(-2px); background: #fff; }
  .card.is-atrasado { border-color: #fbc5c5; background: #fff7f7; }
  .card-nome { display: block; font-size: 14.5px; font-weight: 600; margin: 2px 0 9px; line-height: 1.35; }
  .sem-titulo { color: #9aa7b8; font-weight: 500; }
  .card-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; font-size: 11.5px; }
  .tag { border-radius: 6px; padding: 2px 8px; font-weight: 600; }
  .tag--board { background: #eef2f9; color: #475467; }
  .tag--lista { background: #e7f0ff; color: #1d4ed8; }
  .due { font-weight: 700; margin-left: 2px; }
  .flag { display: inline-block; font-size: 9.5px; font-weight: 800; padding: 2px 8px;
          border-radius: 6px; letter-spacing: .06em; margin-bottom: 7px; }
  .flag--urgente { background: #ef4444; color: #fff; }
  .card-labels { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 7px; }
  .chip { border-radius: 5px; padding: 1px 7px; font-size: 10px; font-weight: 700; color: #fff; }
  .vazio { text-align: center; color: #98a2b3; padding: 24px 10px; font-size: 14px; }

  /* Recolhíveis */
  .secundaria { margin-top: 30px; }
  .secundaria > h2 { font-size: 13px; text-transform: uppercase; color: var(--muted);
                     letter-spacing: .06em; margin: 0 0 12px; font-weight: 700; }
  .recolhivel { background: var(--surface); border-radius: 12px; margin-bottom: 10px; box-shadow: var(--shadow); overflow: hidden; }
  .recolhivel > summary { cursor: pointer; padding: 14px 18px; font-weight: 600; font-size: 14px;
                          list-style: none; display: flex; align-items: center; gap: 10px; }
  .recolhivel > summary::-webkit-details-marker { display: none; }
  .recolhivel > summary::before { content: '▸'; color: #98a2b3; transition: transform .15s; }
  .recolhivel[open] > summary::before { transform: rotate(90deg); }
  .lista-simples { list-style: none; margin: 0; padding: 0 18px 14px; }
  .lista-simples li { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-top: 1px solid var(--line); font-size: 13px; }
  .lista-simples a { flex: 1; color: #344054; }
  .lista-simples a:hover { color: var(--azul); }
  .simples-board { background: #eef2f9; color: #667085; border-radius: 5px; padding: 1px 7px; font-size: 11px; }
  .simples-due { color: #98a2b3; font-size: 11px; }

  footer { text-align: center; color: #98a2b3; font-size: 12px; padding: 28px; }
  footer a { color: var(--azul); font-weight: 600; }
</style>
</head>
<body>
  <header>
    <div class="brand"><div class="logo">🎯</div><h1>Foco do Dia</h1></div>
    <div class="sub">${me ? escapeHtml(me.fullName || me.username) + ' · ' : ''}${totalGeral} cards no total · atualizado ${geradoEm}</div>
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

    ${blocoAtraso}

    <div class="grid">
      <section class="painel painel--fazer">
        <h2>📋 O que fazer agora <span class="cont">${totalHeroi}</span></h2>
        <div class="sub">
          <div class="sub-titulo">🔵 A Fazer <span class="sub-cont">${totalFazer}</span></div>
          <div class="cards">
            ${urgente.map((c) => renderCardFoco(c, true)).join('')}
            ${fazer.map((c) => renderCardFoco(c)).join('')}
            ${totalFazer === 0 ? '<p class="vazio">🎉 Nada pendente a fazer!</p>' : ''}
          </div>
          <div class="sub-titulo">💡 Ideias <span class="sub-cont">${ideias.length}</span></div>
          <div class="cards">
            ${ideias.map((c) => renderCardFoco(c)).join('')}
            ${ideias.length === 0 ? '<p class="vazio">Sem ideias no backlog.</p>' : ''}
          </div>
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

    <div class="secundaria">
      <h2>Concluído &amp; arquivado</h2>
      ${recolhivel('✅', 'Finalizados', finalizado)}
      ${recolhivel(GRUPOS.pausado.emoji, 'Pausados', pausado)}
      ${recolhivel(GRUPOS.outros.emoji, 'Outros / Cancelados', outros)}
    </div>
  </main>
  <footer>Gerado pelo agente Kiro · dados ao vivo do Trello · <a href="/orcamento">Orçamento de TI →</a></footer>
</body>
</html>`;
}
