# Trello Agente Dashboard

Integração com o Trello (API REST oficial) para **listar boards**, **verificar prazos** e **gerar um dashboard HTML visual**. Sem dependências externas — usa apenas Node.js 20+ e `fetch` nativo.

## Rotas no deploy (Vercel)

| Rota          | Conteúdo                                                        |
| ------------- | -------------------------------------------------------------- |
| `/`           | Dashboard do Trello ao vivo (este projeto).                    |
| `/orcamento`  | Dashboard "Análise do Orçamento de TI" (conteúdo preservado).  |

## Pré-requisitos

- Node.js **20 ou superior**

## Configuração (uma vez)

1. Crie o arquivo de credenciais a partir do exemplo:

   ```bash
   cp .env.example .env
   ```

2. Edite o `.env` e preencha `TRELLO_API_KEY` e `TRELLO_TOKEN`.

   **Como obter (≈2 min):**
   - Acesse https://trello.com/power-ups/admin e crie um Power-Up (qualquer nome).
   - Abra o Power-Up → aba **API Key** → gere a **API Key**.
   - Ao lado da key, clique em **Token** (ou "manually generate a Token"), autorize e copie o **Token**.

   > ⚠️ API Key + Token dão acesso à sua conta. Trate como senha. O `.env` já está no `.gitignore`.

## Uso

```bash
# Gera o dashboard HTML visual (dashboard.html)
npm run dashboard

# Lista seus boards com os IDs
npm run boards

# Resumo rápido de prazos no terminal
npm run prazos
```

## Opções do .env

| Variável            | Descrição                                                        |
| ------------------- | ---------------------------------------------------------------- |
| `TRELLO_API_KEY`    | Sua API Key do Trello (obrigatória).                             |
| `TRELLO_TOKEN`      | Seu Token do Trello (obrigatório).                               |
| `TRELLO_BOARD_ID`   | (Opcional) Restringe a um board. Vazio = todos os boards.        |
| `PRAZO_ALERTA_DIAS` | (Opcional) Dias à frente que contam como "vencendo" (padrão: 3). |
| `DASHBOARD_SENHA`   | (Opcional) Senha para o dashboard no Vercel. Vazio = acesso livre.|

## Classificação de prazos

| Status            | Critério                                      |
| ----------------- | --------------------------------------------- |
| 🔴 Atrasado       | Data de vencimento já passou                  |
| 🟡 Vencendo       | Vence dentro de `PRAZO_ALERTA_DIAS` dias      |
| 🟢 No prazo       | Vence depois da janela de alerta              |
| ✅ Concluído      | Card marcado como concluído no Trello         |
| ⚪ Sem prazo      | Card sem data de vencimento                   |

## Deploy no Vercel (dashboard ao vivo)

O projeto já vem pronto para o Vercel. A cada acesso, uma serverless function
busca os dados do Trello **ao vivo** e renderiza o dashboard — nada fica
"congelado", e as credenciais ficam apenas nas variáveis de ambiente do Vercel.

### Passo a passo

1. Suba este repositório para o GitHub (já feito, se você está lendo isto lá).
2. Acesse https://vercel.com → **Add New → Project → Import** este repositório.
3. Em **Environment Variables**, adicione:
   - `TRELLO_API_KEY` → sua API Key
   - `TRELLO_TOKEN` → seu Token
   - (opcional) `TRELLO_BOARD_ID`, `PRAZO_ALERTA_DIAS`
   - (opcional) `DASHBOARD_SENHA` → se quiser proteger com senha
4. Clique em **Deploy**. Pronto — o dashboard fica na URL do projeto.

> ⚠️ **Atenção:** sem `DASHBOARD_SENHA`, a URL é pública (qualquer um com o link
> vê seus cards). Defina `DASHBOARD_SENHA` para exigir `?senha=VALOR` na URL.

### Testar localmente como no Vercel

```bash
npm run dev     # sobe em http://localhost:3000 usando o .env
```

## Estrutura

```
api/
  index.js          # Serverless function do Vercel (dashboard ao vivo)
src/
  config.js         # Credenciais via .env (local) ou env vars (Vercel)
  trelloClient.js   # Cliente da API REST do Trello
  prazoUtils.js     # Classificação de prazos
  dashboardHtml.js  # Geração do HTML
  buildDashboard.js # Lógica compartilhada (CLI + serverless)
  dashboard.js      # CLI: gera dashboard.html local
  prazos.js         # CLI: resumo de prazos no terminal
  listBoards.js     # CLI: lista boards + IDs
server.js           # Servidor local de dev (espelha a função do Vercel)
vercel.json         # Config de rota do Vercel
```
