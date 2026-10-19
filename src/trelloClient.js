// Cliente mínimo da API REST do Trello usando fetch nativo (Node >= 18).
import { config } from './config.js';

const BASE_URL = 'https://api.trello.com/1';

async function trelloGet(endpoint, params = {}) {
  const url = new URL(BASE_URL + endpoint);
  url.searchParams.set('key', config.apiKey);
  url.searchParams.set('token', config.token);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  }

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    let hint = '';
    if (res.status === 401) {
      hint =
        ' → Credenciais inválidas. Confira TRELLO_API_KEY e TRELLO_TOKEN no .env.';
    }
    throw new Error(
      `Erro na API do Trello (${res.status} ${res.statusText}) em ${endpoint}${hint}\n${body}`
    );
  }
  return res.json();
}

// Dados do usuário autenticado (para validar credenciais e exibir nome).
export function getMe() {
  return trelloGet('/members/me', { fields: 'fullName,username' });
}

// Lista os boards do usuário (ou só o configurado em TRELLO_BOARD_ID).
export async function getBoards() {
  if (config.boardId) {
    const board = await trelloGet(`/boards/${config.boardId}`, {
      fields: 'name,url,closed',
    });
    return [board];
  }
  return trelloGet('/members/me/boards', {
    fields: 'name,url,closed',
    filter: 'open',
  });
}

export function getLists(boardId) {
  return trelloGet(`/boards/${boardId}/lists`, {
    fields: 'name',
    filter: 'open',
  });
}

export function getCards(boardId) {
  return trelloGet(`/boards/${boardId}/cards`, {
    fields: 'name,due,dueComplete,idList,url,labels,dateLastActivity',
    filter: 'open',
  });
}

// Monta a estrutura completa de um board: listas + cards agrupados.
export async function getBoardData(board) {
  const [lists, cards] = await Promise.all([
    getLists(board.id),
    getCards(board.id),
  ]);
  const listsById = new Map(lists.map((l) => [l.id, { ...l, cards: [] }]));
  for (const card of cards) {
    const list = listsById.get(card.idList);
    if (list) list.cards.push(card);
  }
  return {
    id: board.id,
    name: board.name,
    url: board.url,
    lists: [...listsById.values()],
    cards,
  };
}
