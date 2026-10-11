# Análise do Orçamento de TI · Set/26

Dashboard estático (HTML + CSS + JS) com a análise do orçamento de TI do período **jan–set 2026**, gerado a partir da planilha `análise-do-orçamento-de-ti-set-26`.

## Recursos

- **KPIs** — total orçado, total realizado, desvio total e grupos em atenção.
- **Desvios por grupo** — gráfico Orçado × Realizado + tabela com total.
- **Movimentos de Pessoal** — barras de desvio (verde = economia, vermelho = acima) + tabela com badges de leitura.
- **Leitura rápida** — insights automáticos.
- **Tema claro/escuro** — toggle no cabeçalho, com persistência (`localStorage`) e detecção da preferência do sistema.
- **Exportar PDF** — botão no cabeçalho (usa a caixa de impressão do navegador → "Salvar como PDF"), com layout de impressão otimizado.
- Valores exibidos em **reais cheios** (ex.: `R$ 509.300,00`).

## Como usar

Abra o `index.html` em qualquer navegador. Os gráficos usam [Chart.js](https://www.chartjs.org/) via CDN.

## Estrutura

| Arquivo | Conteúdo |
|---|---|
| `index.html` | Estrutura da página |
| `styles.css` | Estilos, tema escuro e folha de impressão |
| `data.js` | Dados da planilha (valores em R$ mil) |
| `app.js` | Formatação, tabelas, gráficos, tema e PDF |

> Fonte: planilha `análise-do-orçamento-de-ti-set-26`. Os dados em `data.js` estão em **R$ mil** e são convertidos para reais cheios na exibição.
