// Lógica compartilhada: busca os dados do Trello e produz o HTML + resumo.
// Usado tanto pela CLI (dashboard.js) quanto pela serverless function (api/).
import { getMe, getBoards, getBoardData } from './trelloClient.js';
import { enriquecerCards, contarPorStatus } from './prazoUtils.js';
import { gerarDashboardHtml } from './dashboardHtml.js';

export async function coletarDados() {
  const me = await getMe();
  const boardsBasicos = await getBoards();

  const agora = new Date();
  const boards = [];
  const todosCards = [];

  for (const b of boardsBasicos) {
    if (b.closed) continue;
    const data = await getBoardData(b);
    const cardsEnriquecidos = enriquecerCards(data.cards, agora).map((c) => ({
      ...c,
      boardName: data.name,
    }));

    const mapById = new Map(cardsEnriquecidos.map((c) => [c.id, c]));
    data.lists = data.lists.map((l) => ({
      ...l,
      cards: l.cards.map((c) => mapById.get(c.id) ?? c),
    }));

    boards.push(data);
    todosCards.push(...cardsEnriquecidos);
  }

  const contagemGlobal = contarPorStatus(todosCards);
  return { me, boards, todosCards, contagemGlobal };
}

export async function construirHtml() {
  const dados = await coletarDados();
  const html = gerarDashboardHtml(dados);
  return { html, ...dados };
}
