// Classifica as LISTAS do Trello em grupos de trabalho amigáveis,
// com base no nome da lista (case-insensitive, sem acento).
// Funciona para qualquer board, não só o Elo 360.

function normalizar(str = '') {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // remove acentos
}

// Ordem importa: a primeira regra que casar define o grupo.
const REGRAS = [
  { grupo: 'urgente', termos: ['urgente'] },
  { grupo: 'producao', termos: ['vai pra producao', 'vai para producao', 'na fila pra subir', 'na fila para subir', 'deploy', 'subir'] },
  { grupo: 'andamento', termos: ['em andamento', 'em teste', 'correc', 'doing', 'wip', 'em progresso'] },
  { grupo: 'pausado', termos: ['pausad', 'paused', 'bloquead', 'blocked', 'espera', 'hold'] },
  { grupo: 'ideias', termos: ['ideias', 'ideia', 'backlog', 'later', 'algum dia', 'someday'] },
  { grupo: 'fazer', termos: ['a fazer', 'para fazer', 'por fazer', 'fila', 'to do', 'todo', 'this week', 'today', 'proxim', 'planejad'] },
  { grupo: 'finalizado', termos: ['conclu', 'finaliz', 'historic', 'done', 'entregue', 'pronto'] },
  { grupo: 'outros', termos: ['cancelad', 'financeiro', 'arquiv'] },
];

export const GRUPOS = {
  urgente: { label: 'Urgente', emoji: '🔴', cor: '#e5484d', destaque: true },
  andamento: { label: 'Em andamento', emoji: '🟠', cor: '#f5a623', destaque: true },
  fazer: { label: 'A fazer', emoji: '🔵', cor: '#0079bf', destaque: true },
  ideias: { label: 'Ideias', emoji: '💡', cor: '#00c2e0', destaque: true },
  producao: { label: 'Indo pra produção', emoji: '🚀', cor: '#6e56cf', destaque: true },
  pausado: { label: 'Pausado', emoji: '⏸️', cor: '#889096', destaque: false },
  finalizado: { label: 'Finalizado', emoji: '✅', cor: '#30a46c', destaque: false },
  outros: { label: 'Outros', emoji: '📁', cor: '#b3bac5', destaque: false },
};

// Ordem de exibição dos grupos de destaque (foco na ação).
export const ORDEM_DESTAQUE = ['urgente', 'fazer', 'ideias', 'andamento', 'producao'];

export function classificarLista(nomeLista) {
  const n = normalizar(nomeLista);
  for (const regra of REGRAS) {
    if (regra.termos.some((t) => n.includes(t))) return regra.grupo;
  }
  // Sem correspondência: trata como "a fazer" (mais seguro p/ não esconder trabalho).
  return 'fazer';
}
