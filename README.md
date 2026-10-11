# Análise do Orçamento de TI · Set/26

Dashboard **100% offline** (HTML + CSS + JS puro, sem dependências nem CDN) com a análise do orçamento de TI, gerado a partir da planilha `análise-do-orçamento-de-ti-set-26`.

## Recursos

- **Filtro por período** — selecione mês inicial/final ou use os presets (Jan–Set, 1º/2º/3º tri). Todos os KPIs, tabelas e gráficos recalculam na hora.
- **KPIs** — total orçado, total realizado, desvio total e **maior impacto** do período.
- **Gráficos variados (SVG nativo):**
  - **Barras agrupadas** — Orçado × Realizado por grupo.
  - **Cascata (waterfall)** — do orçado ao realizado, passando pelos desvios de cada grupo.
  - **Rosca (donut)** — composição do realizado.
  - **Linha** — evolução mensal do realizado por grupo.
  - **Ranking de impactos** — barras horizontais ordenadas pelo desvio (R$).
  - **Movimentos de Pessoal** — barras horizontais por sinal + tabela com badges.
- **Leitura rápida** — insights que se adaptam ao período filtrado.
- **Tema claro/escuro** — toggle com persistência (`localStorage`) e detecção da preferência do sistema; os gráficos trocam de cor junto.
- **Exportar PDF** — botão no cabeçalho (impressão do navegador) com folha de impressão otimizada.
- Valores em **reais cheios** (ex.: `R$ 509.300,00`).

## 100% offline

Não há `<script>`/`<link>` para CDNs. Os gráficos são desenhados por uma mini-biblioteca própria em **SVG** (`charts.js`). Basta abrir o `index.html` — funciona sem internet.

## Observação sobre os dados mensais

A planilha fornece apenas o **acumulado jan–set**. A série mensal (`SERIE_MENSAL` em `data.js`) é uma **distribuição estimada** desses totais ao longo dos 9 meses, com perfil de sazonalidade plausível; a soma de cada série **bate exatamente** com o acumulado da planilha. Isso habilita o filtro por período sem alterar os totais oficiais.

## Estrutura

| Arquivo | Conteúdo |
|---|---|
| `index.html` | Estrutura da página |
| `styles.css` | Estilos, tema escuro e folha de impressão |
| `data.js` | Dados da planilha + série mensal (R$ mil) |
| `charts.js` | Mini-biblioteca de gráficos em SVG (offline) |
| `app.js` | Filtro, agregações, tabelas, gráficos, tema e PDF |

> Fonte: planilha `análise-do-orçamento-de-ti-set-26`. Dados em **R$ mil** convertidos para reais cheios na exibição.
