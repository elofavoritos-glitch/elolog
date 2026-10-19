// Servidor local para testar o app dinâmico (mesma lógica da função do Vercel).
// Uso: npm run dev   → http://localhost:3000
import http from 'node:http';
import handler from './api/index.js';

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  handler(req, res).catch((err) => {
    res.statusCode = 500;
    res.end('Erro interno: ' + err.message);
  });
});

server.listen(PORT, () => {
  console.log(`▶  Dashboard rodando em http://localhost:${PORT}`);
  console.log('   (Ctrl+C para parar)');
});
