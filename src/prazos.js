// Verificação rápida de prazos direto no terminal (sem gerar HTML).
import { assertCredentials } from './config.js';
import { getBoards, getBoardData } from './trelloClient.js';
import { enriquecerCards, STATUS, STATUS_META, formatarData } from './prazoUtils.js';

async function main() {
  assertCredentials();

  const boards = await getBoards();
  const agora = new Date();
  const cards = [];

  for (const b of boards) {
    if (b.closed) continue;
    const data = await getBoardData(b);
    cards.push(
      ...enriquecerCards(data.cards, agora).map((c) => ({ ...c, boardName: data.name }))
    );
  }

  const ordem = [STATUS.ATRASADO, STATUS.VENCENDO, STATUS.NO_PRAZO];
  const relevantes = cards
    .filter((c) => ordem.includes(c.status))
    .sort((a, b) => ordem.indexOf(a.status) - ordem.indexOf(b.status) || new Date(a.due) - new Date(b.due));

  if (relevantes.length === 0) {
    console.log('✅ Nenhum card com prazo ativo. Tudo em dia!');
    return;
  }

  console.log('\n⏰ Cards por prazo:\n');
  for (const c of relevantes) {
    const meta = STATUS_META[c.status];
    console.log(
      `${meta.emoji} [${c.boardName}] ${c.name} — vence ${formatarData(c.due)}`
    );
  }
  console.log('');
}

main().catch((err) => {
  console.error('\n❌ Erro:\n' + err.message);
  process.exit(1);
});
