// Carrega as credenciais do ambiente.
// - Local (CLI): lê de um arquivo .env, se existir.
// - Vercel / produção: usa as variáveis de ambiente (process.env) direto.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Parser .env minimalista: KEY=VALUE por linha, ignora comentários e linhas vazias.
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

// Só tenta ler o arquivo .env fora do ambiente serverless.
if (!process.env.VERCEL) {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    loadEnvFile(path.resolve(__dirname, '..', '.env'));
  } catch {
    // Em ambientes sem filesystem local, apenas ignora.
  }
}

const PLACEHOLDERS = new Set([
  '',
  'cole_sua_api_key_aqui',
  'cole_seu_token_aqui',
]);

// Lê a config a cada chamada (lazy) — importante em serverless, onde as
// variáveis de ambiente estão disponíveis em runtime.
export function getConfig() {
  return {
    apiKey: process.env.TRELLO_API_KEY ?? '',
    token: process.env.TRELLO_TOKEN ?? '',
    boardId: (process.env.TRELLO_BOARD_ID ?? '').trim(),
    prazoAlertaDias: Number(process.env.PRAZO_ALERTA_DIAS ?? 3),
  };
}

// Compatibilidade: objeto config "ao vivo" via getters.
export const config = {
  get apiKey() {
    return getConfig().apiKey;
  },
  get token() {
    return getConfig().token;
  },
  get boardId() {
    return getConfig().boardId;
  },
  get prazoAlertaDias() {
    return getConfig().prazoAlertaDias;
  },
};

// Retorna a lista de credenciais ausentes (não lança nem encerra o processo).
export function getMissingCredentials() {
  const c = getConfig();
  const missing = [];
  if (PLACEHOLDERS.has(c.apiKey)) missing.push('TRELLO_API_KEY');
  if (PLACEHOLDERS.has(c.token)) missing.push('TRELLO_TOKEN');
  return missing;
}

// Para uso em scripts de CLI: encerra o processo com mensagem amigável.
export function assertCredentials() {
  const missing = getMissingCredentials();
  if (missing.length > 0) {
    console.error(
      '\n❌ Credenciais do Trello ausentes ou não preenchidas: ' +
        missing.join(', ') +
        '\n\n   1. Copie o arquivo:  cp .env.example .env' +
        '\n   2. Edite o .env e preencha a API Key e o Token.' +
        '\n      (Instruções de como obtê-los estão dentro do .env.example)\n'
    );
    process.exit(1);
  }
}
