// Script de CLI: busca os dados do Trello e gera o arquivo dashboard.html local.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertCredentials } from './config.js';
import { construirHtml } from './buildDashboard.js';
import { STATUS } from './prazoUtils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.resolve(__dirname, '..', 'dashboard.html');

async function main() {
  assertCredentials();

  console.log('🔗 Conectando ao Trello...');
  const { html, me, boards, contagemGlobal } = await construirHtml();
  console.log(`✔  Autenticado como ${me.fullName || me.username}`);
  console.log(`✔  ${boards.length} board(s) processado(s).`);

  fs.writeFileSync(OUT_PATH, html, 'utf8');

  console.log('\n📊 Resumo de prazos:');
  console.log(`   🔴 Atrasados:         ${contagemGlobal[STATUS.ATRASADO]}`);
  console.log(`   🟡 Vencendo em breve: ${contagemGlobal[STATUS.VENCENDO]}`);
  console.log(`   🟢 No prazo:          ${contagemGlobal[STATUS.NO_PRAZO]}`);
  console.log(`   ✅ Concluídos:        ${contagemGlobal[STATUS.CONCLUIDO]}`);
  console.log(`   ⚪ Sem prazo:         ${contagemGlobal[STATUS.SEM_PRAZO]}`);
  console.log(`\n✅ Dashboard gerado: ${OUT_PATH}`);
}

main().catch((err) => {
  console.error('\n❌ Falha ao gerar o dashboard:\n' + err.message);
  process.exit(1);
});
