// Dados extraídos da planilha "análise-do-orçamento-de-ti-set-26"
// Valores numéricos em R$ mil (milhares de reais).

// Aba 1 — Desvios por grupo · jan–set
const GRUPOS = [
  { grupo: "Tecnologia",               orcado: 509.3,  realizado: 632.9, desvio: 123.6,  pct: 24 },
  { grupo: "Despesas administrativas", orcado: 11.6,   realizado: 18.6,  desvio: 7.0,    pct: 61 },
  { grupo: "Outras despesas",          orcado: null,   realizado: 3.5,   desvio: 3.5,    pct: null },
  { grupo: "Viagens",                  orcado: null,   realizado: 40.5,  desvio: 40.5,   pct: null },
  { grupo: "Pessoal",                  orcado: 1008.6, realizado: 957.3, desvio: -51.3,  pct: -5 },
];

// Aba 2 — Principais movimentos de Pessoal
const PESSOAL = [
  { linha: "Salários de contratos PJ", desvio: -166.8, variacao: -36, leitura: "Favorável" },
  { linha: "Salários CLT",             desvio: 49.4,   variacao: 22,  leitura: "Atenção" },
  { linha: "INSS",                     desvio: 31.1,   variacao: 44,  leitura: "Atenção" },
  { linha: "Férias",                   desvio: 14.0,   variacao: 54,  leitura: "Monitorar" },
  { linha: "FGTS",                     desvio: 9.3,    variacao: 50,  leitura: "Monitorar" },
  { linha: "Rescisões",                desvio: 44.9,   variacao: null, leitura: "Pontual?" },
];
