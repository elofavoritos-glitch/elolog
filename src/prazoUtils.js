// Lógica de classificação de prazos dos cards.
import { config } from './config.js';

export const STATUS = {
  ATRASADO: 'atrasado',
  VENCENDO: 'vencendo',
  NO_PRAZO: 'no_prazo',
  CONCLUIDO: 'concluido',
  SEM_PRAZO: 'sem_prazo',
};

export const STATUS_META = {
  [STATUS.ATRASADO]: { label: 'Atrasado', emoji: '🔴', cor: '#e5484d' },
  [STATUS.VENCENDO]: { label: 'Vencendo em breve', emoji: '🟡', cor: '#f5a623' },
  [STATUS.NO_PRAZO]: { label: 'No prazo', emoji: '🟢', cor: '#30a46c' },
  [STATUS.CONCLUIDO]: { label: 'Concluído', emoji: '✅', cor: '#6e56cf' },
  [STATUS.SEM_PRAZO]: { label: 'Sem prazo', emoji: '⚪', cor: '#889096' },
};

const MS_POR_DIA = 1000 * 60 * 60 * 24;

export function classificarCard(card, agora = new Date()) {
  if (!card.due) return STATUS.SEM_PRAZO;
  if (card.dueComplete) return STATUS.CONCLUIDO;

  const due = new Date(card.due);
  const diffDias = Math.ceil((due.getTime() - agora.getTime()) / MS_POR_DIA);

  if (diffDias < 0) return STATUS.ATRASADO;
  if (diffDias <= config.prazoAlertaDias) return STATUS.VENCENDO;
  return STATUS.NO_PRAZO;
}

// Enriquece cada card com status e dias restantes.
export function enriquecerCards(cards, agora = new Date()) {
  return cards.map((card) => {
    const status = classificarCard(card, agora);
    let diasRestantes = null;
    if (card.due) {
      diasRestantes = Math.ceil(
        (new Date(card.due).getTime() - agora.getTime()) / MS_POR_DIA
      );
    }
    return { ...card, status, diasRestantes };
  });
}

export function contarPorStatus(cardsEnriquecidos) {
  const contagem = {
    [STATUS.ATRASADO]: 0,
    [STATUS.VENCENDO]: 0,
    [STATUS.NO_PRAZO]: 0,
    [STATUS.CONCLUIDO]: 0,
    [STATUS.SEM_PRAZO]: 0,
  };
  for (const c of cardsEnriquecidos) contagem[c.status]++;
  return contagem;
}

export function formatarData(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
