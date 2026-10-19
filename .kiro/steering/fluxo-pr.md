---
inclusion: always
---

# Fluxo de trabalho deste repositório: sempre via Pull Request

Este projeto (dashboard do Trello, deploy no Vercel) adota um fluxo **baseado em
Pull Requests**. Siga estas regras em TODA mudança de código:

## Regras obrigatórias

1. **NUNCA commitar direto em `main`.** O `main` é a branch de produção (deploy
   automático no Vercel). Toda mudança passa por branch + PR.
2. **Criar uma branch** a partir do `main` atualizado antes de editar:
   - `feat/...` para funcionalidades, `fix/...` para correções, `chore/...` para
     manutenção, `docs/...` para documentação.
3. **Abrir o PR via API REST** (o `gh pr create` falha neste ambiente):
   ```bash
   gh api repos/elofavoritos-glitch/elolog/pulls \
     -f title="..." -f head="<branch>" -f base="main" -f body="..."
   ```
4. **Nunca commitar `.env`** (credenciais do Trello). Está no `.gitignore`.
5. Depois de aberto o PR, informar ao usuário a **URL do PR** e a **URL de
   Preview do Vercel** (quando disponível nos checks), para revisão.
6. **Só mesclar em `main` após o usuário aprovar.** O merge dispara o deploy de
   produção. Preferir `merge_method=squash`.

## Deploy

- `main` → produção: `https://trello-dashboard-theta.vercel.app`
  (acesso com `?senha=...`, protegido por `DASHBOARD_SENHA`).
- Branch de PR → Preview automático do Vercel.

## Validação antes do push

Rodar `npm run dashboard` (gera `dashboard.html` local) ou `npm run dev` e
conferir que não há erros antes de enviar.

Detalhes completos em `CONTRIBUTING.md` na raiz do repositório.
