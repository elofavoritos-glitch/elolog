import { STATUS, STATUS_META, formatarData } from './prazoUtils.js';
import { GRUPOS } from './grupos.js';

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Cores aproximadas das labels do Trello.
const CORES_LABEL = {
  green: '#61bd4f', yellow: '#f2d600', orange: '#ff9f1a', red: '#eb5a46',
  purple: '#c377e0', blue: '#0079bf', sky: '#00c2e0', lime: '#51e898',
  pink: '#ff78cb', black: '#344563', green_dark: '#519839', yellow_dark: '#d9b51c',
  orange_dark: '#cd8313', red_dark: '#b04632', purple_dark: '#89609e', blue_dark: '#055a8c',
};

function renderLabels(labels = []) {
  const visiveis = labels.filter((l) => l && (l.name || l.color));
  if (visiveis.length === 0) return '';
  const chips = visiveis
    .map((l) => {
      const cor = CORES_LABEL[l.color] || '#b3bac5';
      return `<span class="label-chip" style="background:${cor}" title="${escapeHtml(l.name || l.color)}">${escapeHtml(l.name || '')}</span>`;
    })
    .join('');
  return `<div class="card-labels">${chips}</div>`;
}

// "Peso" de prioridade de um card: urgente > atrasado > vencendo > prazo próximo > sem prazo.
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

// Card grande (herói "A Fazer" e "Em andamento").
function renderCardFoco(c, destaqueUrgente = false) {
  const flag = destaqueUrgente || c.grupo === 'urgente'
    ? '<span class="flag-urgente">URGENTE</span>'
    : '';
  const atrasado = c.status === STATUS.ATRASADO ? ' card-foco--atrasado' : '';
  return `
    <a class="card-foco${atrasado}" href="${escapeHtml(c.url)}" target="_blank" rel="noopener">
      ${flag}
      ${renderLabels(c.labels)}
      <span class="card-foco-nome">${escapeHtml(c.name)}</span>
      <span class="card-foco-meta">
        <span class="pill">${escapeHtml(c.boardName)}</span>
        <span class="pill pill-lista">${escapeHtml(c.listaNome)}</span>
        ${textoPrazo(c)}
      </span>
    </a>`;
}

// Lista enxuta (finalizados / outros).
function renderLinhaSimples(c) {
  const meta = STATUS_META[c.status];
  const prazo = c.due ? `<span class="simples-due">${formatarData(c.due)}</span>` : '';
  return `<li><a href="${escapeHtml(c.url)}" target="_blank" rel="noopener">${escapeHtml(c.name)}</a>
    <span class="simples-board">${escapeHtml(c.boardName)}</span>${prazo}</li>`;
}

function stat(num, label, cor, destaque = false) {
  return `<div class="stat${destaque ? ' stat--big' : ''}" style="--cor:${cor}">
    <div class="stat-num">${num}</div><div class="stat-label">${label}</div></div>`;
}

export function gerarDashboardHtml({ boards, porGrupo, todosCards, me }) {
  const geradoEm = new Date().toLocaleString('pt-BR');
  const g = porGrupo || {};
  const ordenarPorPrazo = (arr) => [...arr].sort((a, b) => prioridade(a) - prioridade(b) ||
    (a.due ? new Date(a.due) : Infinity) - (b.due ? new Date(b.due) : Infinity));

  const fazer = ordenarPorPrazo(g.fazer || []);
  const ideias = ordenarPorPrazo(g.ideias || []);
  const andamento = ordenarPorPrazo(g.andamento || []);
  const urgente = g.urgente || [];
  const producao = g.producao || [];
  const pausado = g.pausado || [];
  const finalizado = g.finalizado || [];
  const outros = g.outros || [];

  // Herói = Urgente + A Fazer + Ideias (o que priorizar).
  const totalFazer = fazer.length + urgente.length;
  const totalHeroi = totalFazer + ideias.length;

  const blocoProducao = producao.length
    ? `<section class="coluna coluna--producao">
         <h2>${GRUPOS.producao.emoji} Indo pra produção <span class="cont">${producao.length}</span></h2>
         <div class="cards-foco">${producao.map((c) => renderCardFoco(c)).join('')}</div>
       </section>`
    : '';

  const blocoPausado = pausado.length
    ? `<details class="recolhivel">
         <summary>${GRUPOS.pausado.emoji} Pausados (${pausado.length})</summary>
         <ul class="lista-simples">${pausado.map(renderLinhaSimples).join('')}</ul>
       </details>`
    : '';

  const blocoOutros = outros.length
    ? `<details class="recolhivel">
         <summary>${GRUPOS.outros.emoji} Outros / Cancelados (${outros.length})</summary>
         <ul class="lista-simples">${outros.map(renderLinhaSimples).join('')}</ul>
       </details>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Foco do Dia · Trello</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
         margin: 0; background: #f0f2f5; color: #1b2733; line-height: 1.45; }
  header { background: linear-gradient(135deg, #0079bf, #5067c5); color: #fff; padding: 22px 28px; }
  header h1 { margin: 0; font-size: 22px; }
  header p { margin: 4px 0 0; opacity: .9; font-size: 13px; }
  main { max-width: 1240px; margin: 0 auto; padding: 20px 16px 60px; }

  /* Barra de números */
  .stats { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 24px; }
  .stat { flex: 1 1 130px; background: #fff; border-radius: 12px; padding: 14px 18px;
          border-top: 4px solid var(--cor); box-shadow: 0 1px 3px rgba(0,0,0,.08); }
  .stat--big { flex: 2 1 220px; }
  .stat-num { font-size: 34px; font-weight: 800; line-height: 1; }
  .stat--big .stat-num { font-size: 46px; }
  .stat-label { font-size: 13px; color: #5e6c84; margin-top: 4px; text-transform: uppercase; letter-spacing: .03em; }

  /* Layout de colunas: A Fazer é o herói (mais largo) */
  .grid { display: grid; grid-template-columns: 1.6fr 1fr; gap: 20px; align-items: start; }
  @media (max-width: 860px) { .grid { grid-template-columns: 1fr; } }
  .coluna { background: #fff; border-radius: 14px; padding: 16px 18px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
  .coluna--fazer { border-top: 5px solid #0079bf; }
  .coluna--andamento { border-top: 5px solid #f5a623; }
  .coluna--producao { border-top: 5px solid #6e56cf; grid-column: 1 / -1; }
  .coluna h2 { margin: 0 0 14px; font-size: 18px; display: flex; align-items: center; gap: 10px; }
  .cont { background: #eef1f5; color: #42526e; border-radius: 20px; padding: 2px 12px; font-size: 14px; font-weight: 700; }
  .coluna--fazer .cont { background: #0079bf; color: #fff; }

  .sub-bloco { margin-bottom: 20px; }
  .sub-bloco:last-child { margin-bottom: 0; }
  .sub-titulo { display: flex; align-items: center; gap: 8px; font-size: 15px; margin: 0 0 10px;
                padding-bottom: 8px; border-bottom: 2px solid #eef1f5; }
  .sub-titulo--fazer { color: #0b5cab; }
  .sub-titulo--ideias { color: #0097b8; }
  .sub-cont { background: #eef1f5; color: #42526e; border-radius: 16px; padding: 1px 10px; font-size: 13px; font-weight: 700; }
  .cards-foco { display: flex; flex-direction: column; gap: 10px; }
  .coluna--producao .cards-foco { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px,1fr)); }
  .card-foco { display: block; background: #f7f9fb; border: 1px solid #e3e8ee; border-left: 5px solid #0079bf;
               border-radius: 10px; padding: 12px 14px; text-decoration: none; color: #1b2733;
               transition: transform .08s, box-shadow .08s, background .08s; }
  .card-foco:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(9,30,66,.15); background: #fff; }
  .card-foco--atrasado { border-left-color: #e5484d; background: #fff5f5; }
  .coluna--andamento .card-foco { border-left-color: #f5a623; }
  .card-foco-nome { display: block; font-size: 15px; font-weight: 600; margin: 2px 0 8px; }
  .card-foco-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-size: 12px; }
  .pill { background: #eef1f5; color: #42526e; border-radius: 6px; padding: 2px 8px; font-weight: 600; }
  .pill-lista { background: #e7f0fb; color: #0b5cab; }
  .due { font-weight: 700; }
  .flag-urgente { display: inline-block; background: #e5484d; color: #fff; font-size: 10px; font-weight: 800;
                  padding: 2px 8px; border-radius: 6px; letter-spacing: .05em; margin-bottom: 6px; }
  .card-labels { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px; }
  .label-chip { min-height: 8px; border-radius: 4px; padding: 1px 7px; font-size: 10px; font-weight: 700; color: #fff; }

  .vazio-foco { text-align: center; color: #7a8699; padding: 28px 10px; font-size: 14px; }

  /* Recolhíveis (finalizado / pausado / outros) */
  .secao-secundaria { margin-top: 28px; }
  .secao-secundaria h2 { font-size: 14px; text-transform: uppercase; color: #5e6c84; letter-spacing: .05em; margin: 0 0 10px; }
  .recolhivel { background: #fff; border-radius: 10px; margin-bottom: 10px; box-shadow: 0 1px 2px rgba(0,0,0,.06); overflow: hidden; }
  .recolhivel > summary { cursor: pointer; padding: 12px 16px; font-weight: 600; font-size: 14px; list-style: none; }
  .recolhivel > summary::-webkit-details-marker { display: none; }
  .recolhivel > summary::before { content: '▸ '; color: #7a8699; }
  .recolhivel[open] > summary::before { content: '▾ '; }
  .lista-simples { list-style: none; margin: 0; padding: 0 16px 12px; }
  .lista-simples li { display: flex; align-items: center; gap: 10px; padding: 7px 0; border-top: 1px solid #f0f2f5; font-size: 13px; }
  .lista-simples a { color: #1b2733; text-decoration: none; flex: 1; }
  .lista-simples a:hover { color: #0079bf; }
  .simples-board { background: #eef1f5; color: #5e6c84; border-radius: 5px; padding: 1px 7px; font-size: 11px; }
  .simples-due { color: #7a8699; font-size: 11px; }

  footer { text-align: center; color: #889096; font-size: 12px; padding: 24px; }
  footer a { color: #889096; }
</style>
</head>
<body>
  <header>
    <h1>🎯 Foco do Dia</h1>
    <p>${me ? escapeHtml(me.fullName || me.username) + ' · ' : ''}Atualizado em ${geradoEm}</p>
  </header>
  <main>
    <div class="stats">
      ${stat(totalFazer, '🔵 A fazer', '#0079bf', true)}
      ${stat(ideias.length, '💡 Ideias', '#00c2e0', true)}
      ${stat(andamento.length, '🟠 Em andamento', '#f5a623')}
      ${stat(urgente.length, '🔴 Urgente', '#e5484d')}
      ${stat(producao.length, '🚀 Produção', '#6e56cf')}
    </div>

    <div class="grid">
      <section class="coluna coluna--fazer">
        <h2>📋 O que fazer agora <span class="cont">${totalHeroi}</span></h2>

        <div class="sub-bloco">
          <h3 class="sub-titulo sub-titulo--fazer">🔵 A Fazer <span class="sub-cont">${totalFazer}</span></h3>
          <div class="cards-foco">
            ${urgente.map((c) => renderCardFoco(c, true)).join('')}
            ${fazer.map((c) => renderCardFoco(c)).join('')}
            ${totalFazer === 0 ? '<p class="vazio-foco">🎉 Nada pendente a fazer!</p>' : ''}
          </div>
        </div>

        <div class="sub-bloco">
          <h3 class="sub-titulo sub-titulo--ideias">💡 Ideias <span class="sub-cont">${ideias.length}</span></h3>
          <div class="cards-foco">
            ${ideias.map((c) => renderCardFoco(c)).join('')}
            ${ideias.length === 0 ? '<p class="vazio-foco">Sem ideias no backlog.</p>' : ''}
          </div>
        </div>
      </section>

      <section class="coluna coluna--andamento">
        <h2>🟠 Em andamento <span class="cont">${andamento.length}</span></h2>
        <div class="cards-foco">
          ${andamento.map((c) => renderCardFoco(c)).join('')}
          ${andamento.length === 0 ? '<p class="vazio-foco">Nada em andamento no momento.</p>' : ''}
        </div>
      </section>

      ${blocoProducao}
    </div>

    <div class="secao-secundaria">
      <h2>Concluído &amp; arquivado</h2>
      <details class="recolhivel">
        <summary>✅ Finalizados (${finalizado.length})</summary>
        <ul class="lista-simples">${finalizado.map(renderLinhaSimples).join('') || '<li>—</li>'}</ul>
      </details>
      ${blocoPausado}
      ${blocoOutros}
    </div>
  </main>
  <footer>Gerado pelo agente Kiro · dados ao vivo da API do Trello · <a href="/orcamento">Orçamento de TI →</a></footer>
</body>
</html>`;
}
