// Lógica compartilhada: busca os dados do Trello e produz o HTML + resumo.
// Usado tanto pela CLI (dashboard.js) quanto pela serverless function (api/).
import { getMe, getBoards, getBoardData } from './trelloClient.js';
import { enriquecerCards, contarPorStatus } from './prazoUtils.js';
import { classificarLista, GRUPOS } from './grupos.js';
import { gerarDashboardHtml } from './dashboardHtml.js';

export async function coletarDados() {
  const me = await getMe();
  const boardsBasicos = await getBoards();

  const agora = new Date();
  const boards = [];
  const todosCards = [];

  // Acumula os cards por grupo de trabalho (urgente, andamento, fazer...).
  const porGrupo = {};
  for (const g of Object.keys(GRUPOS)) porGrupo[g] = [];

  for (const b of boardsBasicos) {
    if (b.closed) continue;
    const data = await getBoardData(b);
    const cardsEnriquecidos = enriquecerCards(data.cards, agora).map((c) => ({
      ...c,
      boardName: data.name,
    }));

    const mapById = new Map(cardsEnriquecidos.map((c) => [c.id, c]));

    // Atribui grupo a cada lista e repassa aos cards (enriquecidos).
    data.lists = data.lists.map((l) => {
      const grupo = classificarLista(l.name);
      const cards = l.cards.map((c) => {
        const card = mapById.get(c.id) ?? c;
        card.grupo = grupo;
        card.listaNome = l.name;
        porGrupo[grupo].push(card);
        return card;
      });
      return { ...l, grupo, cards };
    });

    // Substitui os cards "crus" do board pelos enriquecidos (com grupo).
    data.cards = cardsEnriquecidos;

    boards.push(data);
    todosCards.push(...cardsEnriquecidos);
  }

  const contagemGlobal = contarPorStatus(todosCards);

  // Estatísticas por board: total, finalizados, % concluído e grupos.
  const porBoard = boards.map((b) => {
    const cards = b.cards || [];
    const porGrupoBoard = {};
    for (const g of Object.keys(GRUPOS)) porGrupoBoard[g] = 0;
    for (const c of cards) porGrupoBoard[c.grupo] = (porGrupoBoard[c.grupo] || 0) + 1;
    const finalizados = porGrupoBoard.finalizado || 0;
    const total = cards.length || 0;
    const pct = total > 0 ? Math.round((finalizados / total) * 100) : 0;
    return {
      id: b.id,
      name: b.name,
      url: b.url,
      total,
      finalizados,
      pct,
      porGrupo: porGrupoBoard,
    };
  });

  return { me, boards, todosCards, contagemGlobal, porGrupo, porBoard };
}

export async function construirHtml() {
  const dados = await coletarDados();
  const html = gerarDashboardHtml(dados);
  return { html, ...dados };
}
