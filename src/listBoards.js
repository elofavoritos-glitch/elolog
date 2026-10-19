// Lista seus boards com os respectivos IDs (útil para preencher TRELLO_BOARD_ID).
import { assertCredentials } from './config.js';
import { getMe, getBoards } from './trelloClient.js';

async function main() {
  assertCredentials();
  const me = await getMe();
  console.log(`\n👤 ${me.fullName || me.username}\n`);

  const boards = await getBoards();
  console.log('📋 Seus boards:\n');
  for (const b of boards) {
    console.log(`  • ${b.name}`);
    console.log(`    id:  ${b.id}`);
    console.log(`    url: ${b.url}\n`);
  }
  console.log('Dica: copie um "id" para TRELLO_BOARD_ID no .env para focar o dashboard nele.\n');
}

main().catch((err) => {
  console.error('\n❌ Erro:\n' + err.message);
  process.exit(1);
});
