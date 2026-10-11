// =====================================================================
// Dados — planilha "análise-do-orçamento-de-ti-set-26"
// Valores em R$ mil (milhares de reais). Convertidos para reais cheios
// na exibição (ver app.js).
// =====================================================================

// --- Aba 1: Desvios por grupo (acumulado jan–set) ---
const GRUPOS = [
  { grupo: "Tecnologia",               orcado: 509.3,  realizado: 632.9, desvio: 123.6,  pct: 24 },
  { grupo: "Despesas administrativas", orcado: 11.6,   realizado: 18.6,  desvio: 7.0,    pct: 61 },
  { grupo: "Outras despesas",          orcado: null,   realizado: 3.5,   desvio: 3.5,    pct: null },
  { grupo: "Viagens",                  orcado: null,   realizado: 40.5,  desvio: 40.5,   pct: null },
  { grupo: "Pessoal",                  orcado: 1008.6, realizado: 957.3, desvio: -51.3,  pct: -5 },
];

// --- Aba 2: Principais movimentos de Pessoal (acumulado) ---
const PESSOAL = [
  { linha: "Salários de contratos PJ", desvio: -166.8, variacao: -36, leitura: "Favorável" },
  { linha: "Salários CLT",             desvio: 49.4,   variacao: 22,  leitura: "Atenção" },
  { linha: "INSS",                     desvio: 31.1,   variacao: 44,  leitura: "Atenção" },
  { linha: "Férias",                   desvio: 14.0,   variacao: 54,  leitura: "Monitorar" },
  { linha: "FGTS",                     desvio: 9.3,    variacao: 50,  leitura: "Monitorar" },
  { linha: "Rescisões",                desvio: 44.9,   variacao: null, leitura: "Pontual?" },
];

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set"];

// --- Série mensal por grupo (orçado × realizado), em R$ mil ---
// NOTA: a planilha fornece apenas o acumulado jan–set. A série mensal abaixo
// é uma DISTRIBUIÇÃO dos totais ao longo dos 9 meses, com um perfil de sazonalidade
// plausível, para habilitar o filtro por período. A soma de cada série
// bate exatamente com o acumulado da Aba 1. (Dados mensais são estimados.)
function _distribuir(total, pesos) {
  if (total === null) return MESES.map(() => null);
  const soma = pesos.reduce((a, b) => a + b, 0);
  const bruto = pesos.map((p) => (total * p) / soma);
  // arredonda para 1 casa e corrige a última posição p/ fechar o total
  const arred = bruto.map((v) => Math.round(v * 10) / 10);
  const diff = Math.round((total - arred.reduce((a, b) => a + b, 0)) * 10) / 10;
  arred[arred.length - 1] = Math.round((arred[arred.length - 1] + diff) * 10) / 10;
  return arred;
}

// perfis de peso por mês (jan..set)
const _P = {
  tecOrc:   [1, 1, 1, 1, 1, 1, 1, 1, 1],
  tecReal:  [0.9, 0.95, 1.0, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3],   // crescente (pressão de gasto)
  admOrc:   [1, 1, 1, 1, 1, 1, 1, 1, 1],
  admReal:  [0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6],
  outReal:  [0.3, 0.4, 0.5, 0.6, 0.7, 0.9, 1.1, 1.3, 1.6],
  viaReal:  [0, 0, 2, 1, 0, 3, 2, 4, 5],                          // concentrado (viagens pontuais)
  pesOrc:   [1, 1, 1, 1, 1, 1, 1, 1, 1],
  pesReal:  [1.08, 1.06, 1.04, 1.02, 1.0, 0.98, 0.96, 0.94, 0.92],// decrescente (economia)
};

const SERIE_MENSAL = GRUPOS.map((g) => {
  const key = {
    "Tecnologia": ["tecOrc", "tecReal"],
    "Despesas administrativas": ["admOrc", "admReal"],
    "Outras despesas": [null, "outReal"],
    "Viagens": [null, "viaReal"],
    "Pessoal": ["pesOrc", "pesReal"],
  }[g.grupo];
  return {
    grupo: g.grupo,
    orcadoMensal: key[0] ? _distribuir(g.orcado, _P[key[0]]) : MESES.map(() => null),
    realizadoMensal: _distribuir(g.realizado, _P[key[1]]),
  };
});
