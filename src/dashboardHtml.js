// Gera o HTML do dashboard a partir dos dados dos boards.
import { STATUS, STATUS_META, formatarData } from './prazoUtils.js';

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Cores aproximadas das labels do Trello.
const CORES_LABEL = {
  green: '#61bd4f',
  yellow: '#f2d600',
  orange: '#ff9f1a',
  red: '#eb5a46',
  purple: '#c377e0',
  blue: '#0079bf',
  sky: '#00c2e0',
  lime: '#51e898',
  pink: '#ff78cb',
  black: '#344563',
  green_dark: '#519839',
  yellow_dark: '#d9b51c',
  orange_dark: '#cd8313',
  red_dark: '#b04632',
  purple_dark: '#89609e',
  blue_dark: '#055a8c',
};

// Ordem de prioridade na listagem de prazos.
const ORDEM_STATUS = [
  STATUS.ATRASADO,
  STATUS.VENCENDO,
  STATUS.NO_PRAZO,
  STATUS.CONCLUIDO,
];

function renderResumoCards(contagemGlobal) {
  const total = Object.values(contagemGlobal).reduce((a, b) => a + b, 0);
  const itens = Object.entries(STATUS_META)
    .map(([status, meta]) => {
      const qtd = contagemGlobal[status] ?? 0;
      return `
        <div class="stat-card" style="--cor:${meta.cor}">
          <div class="stat-emoji">${meta.emoji}</div>
          <div class="stat-num">${qtd}</div>
          <div class="stat-label">${meta.label}</div>
        </div>`;
    })
    .join('');
  return `
    <div class="stats">
      <div class="stat-card stat-total">
        <div class="stat-emoji">📋</div>
        <div class="stat-num">${total}</div>
        <div class="stat-label">Total de cards</div>
      </div>
      ${itens}
    </div>`;
}

function renderBarra(contagemGlobal) {
  const total = Object.values(contagemGlobal).reduce((a, b) => a + b, 0) || 1;
  const segs = Object.entries(STATUS_META)
    .map(([status, meta]) => {
      const pct = ((contagemGlobal[status] ?? 0) / total) * 100;
      if (pct === 0) return '';
      return `<div class="barra-seg" style="width:${pct}%;background:${meta.cor}" title="${meta.label}: ${contagemGlobal[status]}"></div>`;
    })
    .join('');
  return `<div class="barra">${segs}</div>`;
}

function renderTabelaPrazos(cards) {
  const comPrazo = cards
    .filter((c) => c.due)
    .sort((a, b) => new Date(a.due) - new Date(b.due))
    .sort(
      (a, b) => ORDEM_STATUS.indexOf(a.status) - ORDEM_STATUS.indexOf(b.status)
    );

  if (comPrazo.length === 0) {
    return '<p class="vazio">Nenhum card com data de vencimento encontrado.</p>';
  }

  const linhas = comPrazo
    .map((c) => {
      const meta = STATUS_META[c.status];
      let restante = '—';
      if (c.diasRestantes !== null && c.status !== STATUS.CONCLUIDO) {
        if (c.diasRestantes < 0)
          restante = `${Math.abs(c.diasRestantes)}d atrás`;
        else if (c.diasRestantes === 0) restante = 'hoje';
        else restante = `em ${c.diasRestantes}d`;
      }
      return `
        <tr>
          <td><span class="badge" style="background:${meta.cor}">${meta.emoji} ${meta.label}</span></td>
          <td><a href="${escapeHtml(c.url)}" target="_blank" rel="noopener">${escapeHtml(c.name)}</a></td>
          <td class="muted">${escapeHtml(c.boardName)}</td>
          <td>${formatarData(c.due)}</td>
          <td class="muted">${restante}</td>
        </tr>`;
    })
    .join('');

  return `
    <table class="tabela">
      <thead>
        <tr><th>Status</th><th>Card</th><th>Board</th><th>Vencimento</th><th>Restante</th></tr>
      </thead>
      <tbody>${linhas}</tbody>
    </table>`;
}

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

function renderMiniCard(c) {
  const meta = STATUS_META[c.status];
  let prazoHtml = '';
  if (c.due) {
    let restante = '';
    if (c.diasRestantes !== null && c.status !== STATUS.CONCLUIDO) {
      if (c.diasRestantes < 0) restante = ` · ${Math.abs(c.diasRestantes)}d atrás`;
      else if (c.diasRestantes === 0) restante = ' · hoje';
      else restante = ` · em ${c.diasRestantes}d`;
    }
    prazoHtml = `<span class="card-due" style="color:${meta.cor}">${meta.emoji} ${formatarData(c.due)}${restante}</span>`;
  }
  return `
    <a class="mini-card" href="${escapeHtml(c.url)}" target="_blank" rel="noopener"
       style="border-left-color:${meta.cor}" data-status="${c.status}">
      ${renderLabels(c.labels)}
      <span class="mini-card-nome">${escapeHtml(c.name)}</span>
      ${prazoHtml}
    </a>`;
}

function renderBoards(boards) {
  return boards
    .map((board) => {
      const totalBoard = board.lists.reduce((n, l) => n + l.cards.length, 0);
      const listas = board.lists
        .map((lista) => {
          const cards = lista.cards.map(renderMiniCard).join('');
          return `
            <div class="lista">
              <h4>${escapeHtml(lista.name)} <span class="count">${lista.cards.length}</span></h4>
              <div class="mini-cards">${cards || '<p class="vazio">Sem cards</p>'}</div>
            </div>`;
        })
        .join('');
      return `
        <section class="board">
          <h3>
            <a href="${escapeHtml(board.url)}" target="_blank" rel="noopener">${escapeHtml(board.name)}</a>
            <span class="count">${totalBoard} cards</span>
          </h3>
          <div class="listas">${listas}</div>
        </section>`;
    })
    .join('');
}

export function gerarDashboardHtml({ boards, contagemGlobal, todosCards, me }) {
  const geradoEm = new Date().toLocaleString('pt-BR');
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Dashboard Trello</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    margin: 0; background: #f4f5f7; color: #172b4d; line-height: 1.5;
  }
  header {
    background: linear-gradient(135deg, #0079bf, #5067c5);
    color: #fff; padding: 28px 32px;
  }
  header h1 { margin: 0 0 4px; font-size: 24px; }
  header p { margin: 0; opacity: .9; font-size: 14px; }
  main { max-width: 1100px; margin: 0 auto; padding: 24px 16px 64px; }
  h2 { font-size: 16px; text-transform: uppercase; letter-spacing: .05em; color: #5e6c84; margin: 32px 0 12px; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
  .stat-card {
    background: #fff; border-radius: 10px; padding: 16px; text-align: center;
    border-left: 4px solid var(--cor, #ccc); box-shadow: 0 1px 2px rgba(0,0,0,.06);
  }
  .stat-total { --cor: #0079bf; }
  .stat-emoji { font-size: 20px; }
  .stat-num { font-size: 28px; font-weight: 700; }
  .stat-label { font-size: 12px; color: #5e6c84; }
  .barra { display: flex; height: 14px; border-radius: 7px; overflow: hidden; margin-top: 12px; background: #e1e4e8; }
  .barra-seg { height: 100%; }
  .tabela { width: 100%; border-collapse: collapse; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 2px rgba(0,0,0,.06); }
  .tabela th, .tabela td { text-align: left; padding: 10px 14px; border-bottom: 1px solid #ebecf0; font-size: 14px; }
  .tabela th { background: #fafbfc; font-size: 12px; text-transform: uppercase; color: #5e6c84; }
  .tabela a { color: #0079bf; text-decoration: none; }
  .tabela a:hover { text-decoration: underline; }
  .badge { color: #fff; padding: 2px 8px; border-radius: 12px; font-size: 12px; white-space: nowrap; }
  .muted { color: #5e6c84; font-size: 13px; }
  .board { background: #fff; border-radius: 10px; padding: 16px 20px; margin-bottom: 16px; box-shadow: 0 1px 2px rgba(0,0,0,.06); }
  .board h3 { margin: 0 0 12px; }
  .board h3 a { color: #172b4d; text-decoration: none; }
  .listas { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
  .board h3 .count { font-size: 12px; font-weight: 400; }
  .lista { background: #f4f5f7; border-radius: 10px; padding: 10px; }
  .lista h4 { margin: 0 0 10px; font-size: 14px; display: flex; justify-content: space-between; align-items: center; }
  .count { background: #ebecf0; border-radius: 10px; padding: 1px 9px; font-size: 12px; color: #5e6c84; }
  .mini-cards { display: flex; flex-direction: column; gap: 8px; }
  .mini-card {
    display: block; background: #fff; border-radius: 6px; padding: 8px 10px;
    border-left: 4px solid #ccc; text-decoration: none; color: #172b4d;
    box-shadow: 0 1px 1px rgba(9,30,66,.2); transition: transform .08s, box-shadow .08s;
  }
  .mini-card:hover { transform: translateY(-1px); box-shadow: 0 3px 6px rgba(9,30,66,.25); }
  .mini-card-nome { font-size: 13px; display: block; }
  .card-labels { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px; }
  .label-chip {
    min-height: 8px; min-width: 36px; border-radius: 4px; padding: 1px 6px;
    font-size: 10px; font-weight: 600; color: #fff; line-height: 1.4;
  }
  .card-due { display: inline-block; font-size: 11px; margin-top: 5px; font-weight: 600; }
  .vazio { color: #889096; font-style: italic; font-size: 12px; margin: 4px 0; }
  .filtros { display: flex; flex-wrap: wrap; gap: 8px; margin: 4px 0 8px; }
  .filtro-btn {
    border: 1px solid #dfe1e6; background: #fff; border-radius: 20px; padding: 5px 14px;
    font-size: 13px; cursor: pointer; color: #42526e;
  }
  .filtro-btn.ativo { background: #0079bf; color: #fff; border-color: #0079bf; }
  footer { text-align: center; color: #889096; font-size: 12px; padding: 24px; }
</style>
</head>
<body>
  <header>
    <h1>📊 Dashboard Trello</h1>
    <p>${me ? escapeHtml(me.fullName || me.username) + ' · ' : ''}Gerado em ${geradoEm}</p>
  </header>
  <main>
    <h2>Visão geral</h2>
    ${renderResumoCards(contagemGlobal)}
    ${renderBarra(contagemGlobal)}

    <h2>Prazos</h2>
    ${renderTabelaPrazos(todosCards)}

    <h2>Todos os cards</h2>
    <div class="filtros">
      <button class="filtro-btn ativo" data-filtro="todos">Todos</button>
      <button class="filtro-btn" data-filtro="${STATUS.ATRASADO}">🔴 Atrasados</button>
      <button class="filtro-btn" data-filtro="${STATUS.VENCENDO}">🟡 Vencendo</button>
      <button class="filtro-btn" data-filtro="${STATUS.NO_PRAZO}">🟢 No prazo</button>
      <button class="filtro-btn" data-filtro="${STATUS.CONCLUIDO}">✅ Concluídos</button>
      <button class="filtro-btn" data-filtro="${STATUS.SEM_PRAZO}">⚪ Sem prazo</button>
    </div>
    ${renderBoards(boards)}
  </main>
  <footer>Gerado pelo agente Kiro · dados ao vivo da API do Trello</footer>
  <script>
    const botoes = document.querySelectorAll('.filtro-btn');
    const cards = document.querySelectorAll('.mini-card');
    botoes.forEach((btn) => btn.addEventListener('click', () => {
      botoes.forEach((b) => b.classList.remove('ativo'));
      btn.classList.add('ativo');
      const f = btn.dataset.filtro;
      cards.forEach((c) => {
        c.style.display = (f === 'todos' || c.dataset.status === f) ? '' : 'none';
      });
      // Esconde listas que ficaram sem cards visíveis.
      document.querySelectorAll('.lista').forEach((lista) => {
        const visiveis = [...lista.querySelectorAll('.mini-card')].some((c) => c.style.display !== 'none');
        lista.style.display = visiveis ? '' : 'none';
      });
    }));
  </script>
</body>
</html>`;
}
