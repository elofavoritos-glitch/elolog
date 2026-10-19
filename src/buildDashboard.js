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

    // Atribui grupo a cada lista e repassa aos cards.
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

    boards.push(data);
    todosCards.push(...cardsEnriquecidos);
  }

  const contagemGlobal = contarPorStatus(todosCards);
  return { me, boards, todosCards, contagemGlobal, porGrupo };
}

export async function construirHtml() {
  const dados = await coletarDados();
  const html = gerarDashboardHtml(dados);
  return { html, ...dados };
}
