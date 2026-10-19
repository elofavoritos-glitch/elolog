// Serverless function do Vercel: gera o dashboard do Trello AO VIVO a cada acesso.
// As credenciais vêm das variáveis de ambiente configuradas no painel do Vercel.
import { getMissingCredentials } from '../src/config.js';
import { construirHtml } from '../src/buildDashboard.js';

function paginaErro(titulo, mensagem) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${titulo}</title>
<style>
  body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; background:#f4f5f7;
         color:#172b4d; display:flex; min-height:100vh; align-items:center; justify-content:center; margin:0; }
  .box { background:#fff; border-radius:12px; padding:32px 40px; max-width:520px;
         box-shadow:0 2px 8px rgba(0,0,0,.1); border-top:4px solid #e5484d; }
  h1 { margin:0 0 12px; font-size:20px; }
  p { line-height:1.6; color:#42526e; }
  code { background:#f4f5f7; padding:2px 6px; border-radius:4px; font-size:13px; }
</style></head>
<body><div class="box"><h1>⚠️ ${titulo}</h1><p>${mensagem}</p></div></body></html>`;
}

export default async function handler(req, res) {
  // Gate de senha opcional (só ativa se DASHBOARD_SENHA estiver definida).
  const senhaEsperada = process.env.DASHBOARD_SENHA;
  if (senhaEsperada) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const senhaRecebida = url.searchParams.get('senha');
    if (senhaRecebida !== senhaEsperada) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(
        paginaErro(
          'Acesso protegido',
          'Este dashboard exige senha. Adicione <code>?senha=SUA_SENHA</code> ao final da URL.'
        )
      );
      return;
    }
  }

  // Valida credenciais.
  const missing = getMissingCredentials();
  if (missing.length > 0) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(
      paginaErro(
        'Configuração incompleta',
        `As variáveis de ambiente ausentes são: <code>${missing.join(
          ', '
        )}</code>. Configure-as no painel do Vercel em Settings → Environment Variables.`
      )
    );
    return;
  }

  try {
    const { html } = await construirHtml();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // Cache leve na borda: 60s, revalida em background por mais 5min.
    res.setHeader(
      'Cache-Control',
      's-maxage=60, stale-while-revalidate=300'
    );
    res.end(html);
  } catch (err) {
    res.statusCode = 502;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(
      paginaErro(
        'Falha ao buscar dados do Trello',
        `Verifique se a API Key e o Token são válidos e pertencem ao mesmo app. Detalhe: <code>${String(
          err.message
        ).replace(/</g, '&lt;')}</code>`
      )
    );
  }
}
