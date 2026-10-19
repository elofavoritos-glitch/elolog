# Fluxo de contribuição (PR-based)

Este projeto usa um fluxo baseado em **Pull Requests**. Nada vai direto para
`main` — toda mudança passa por uma branch de trabalho e um PR revisável.

O Vercel faz deploy automático:

- **`main`** → ambiente de **produção** (URL pública oficial).
- **Branch de PR** → ambiente de **Preview** (URL temporária gerada pelo Vercel
  em cada PR, para revisar antes de ir pro ar).

## Fluxo em 5 passos

```
main ──┐
       │  1. cria branch a partir de main
       └─▶ feat/minha-mudanca ──┐
                                │  2. commits
                                │  3. push
                                └─▶ 4. abre PR (base: main)
                                        │  (Vercel cria Preview)
                                        │  5. revisa → merge
main ◀──────────────────────────────────┘  (Vercel faz deploy de produção)
```

### 1. Criar a branch

Sempre a partir do `main` atualizado:

```bash
git checkout main
git pull origin main
git checkout -b feat/descricao-curta
```

Convenção de nomes:

| Prefixo     | Uso                                  |
| ----------- | ------------------------------------ |
| `feat/`     | Nova funcionalidade                  |
| `fix/`      | Correção de bug                      |
| `chore/`    | Manutenção, configs, deps            |
| `docs/`     | Documentação                         |

### 2–3. Commitar e enviar

```bash
git add <arquivos>
git commit -m "Mensagem clara no imperativo"
git push -u origin feat/descricao-curta
```

### 4. Abrir o PR

> Neste ambiente, use a API REST (o `gh pr create` não funciona aqui):

```bash
gh api repos/elofavoritos-glitch/elolog/pulls \
  -f title="Título do PR" \
  -f head="feat/descricao-curta" \
  -f base="main" \
  -f body="O que muda e por quê."
```

O Vercel detecta o PR e publica uma **URL de Preview** (aparece nos checks do
PR). Use-a para revisar a mudança isolada, sem afetar produção.

### 5. Revisar e mesclar

Depois de revisar o Preview:

```bash
gh api -X PUT repos/elofavoritos-glitch/elolog/pulls/<N>/merge \
  -f merge_method=squash
```

O merge em `main` dispara o **deploy de produção** no Vercel automaticamente.

## Regras

- ❌ Nunca commitar direto em `main`.
- ❌ Nunca commitar o arquivo `.env` (está no `.gitignore`).
- ✅ Uma branch/PR por mudança lógica.
- ✅ Validar localmente antes do push: `npm run dashboard` (ou `npm run dev`).
