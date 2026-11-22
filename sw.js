// Service worker: o app abre na hora e sem internet. Estratégia cache-first por versão: cada versão do site tem o
// seu cache, baixado inteiro na instalação; a página abre dele e a versão nova chega com o próximo service worker.
// APIs externas (GitHub, IPCA) nunca passam pelo cache.
const VERSAO = 'projeto-r-v93'; // igual a js/versao.js (um teste confere)
const CASCA = [
  './', './index.html', './css/app.css', './manifest.webmanifest',
  './icones/icone-192.png', './icones/icone-512.png', './icones/icone-maskable-512.png',
  './fontes/inter-latin.woff2', './fontes/sora-latin.woff2',
  './js/app.js', './js/versao.js',
  './js/core/alocacao.js', './js/core/aporte.js', './js/core/balanco.js', './js/core/cartao.js', './js/core/casa.js', './js/core/casa-ano.js', './js/core/carteira.js', './js/core/recomendacao.js', './js/core/checkup.js', './js/core/desempenho.js',
  './js/core/esquema.js', './js/core/financas.js', './js/core/formato.js', './js/core/investir-sobra.js', './js/core/ipca.js',
  './js/core/lembretes.js', './js/core/lista-mes.js', './js/core/marcos.js', './js/core/meses.js', './js/core/perfis.js', './js/core/metas.js', './js/core/motor.js', './js/core/projecao.js',
  './js/core/pagamentos.js', './js/core/media-contas.js', './js/core/protecao.js', './js/core/salario.js', './js/core/simulador.js', './js/core/tags.js', './js/core/ortografia.js', './js/core/gastos-por-etiqueta.js', './js/core/categorias.js', './js/core/custo-de-vida.js', './js/core/contas-pessoais.js', './js/core/cotacoes.js',
  './js/dados/armazem.js', './js/dados/github.js', './js/dados/ipca-remoto.js', './js/dados/cotacoes-remoto.js', './js/dados/mesclar.js', './js/dados/mesclar-casa.js',
  './js/ui/atualizacao.js', './js/ui/boas-vindas.js', './js/ui/casa.js', './js/ui/casa-balanco.js', './js/ui/casa-cartao.js', './js/ui/casa-cofrinho.js', './js/ui/casa-etiquetas.js', './js/ui/icones.js', './js/ui/enfeite.js', './js/ui/casa-ajustes.js', './js/ui/casa-ano.js', './js/ui/conta-pessoal.js', './js/ui/seletor-periodo.js', './js/ui/carteira-graficos.js', './js/ui/carteira-ativos.js', './js/ui/config.js', './js/ui/conectar.js', './js/ui/detalhes.js', './js/ui/dom.js', './js/ui/festa.js', './js/ui/grafico.js', './js/ui/historico.js',
  './js/ui/inicio.js', './js/ui/mais.js', './js/ui/mes.js', './js/ui/mes-rascunho.js', './js/ui/movimento.js', './js/ui/nativo.js', './js/ui/fechado.js', './js/ui/orcamento.js', './js/ui/rotas.js', './js/ui/simular.js', './js/ui/topo.js',
];

self.addEventListener('install', (evento) => {
  // cache: 'reload' pula a cópia guardada pelo aparelho (o GitHub Pages manda guardar por 10 minutos).
  const pedidos = CASCA.map((u) => new Request(u, { cache: 'reload' }));
  evento.waitUntil(caches.open(VERSAO).then((c) => c.addAll(pedidos)).then(() => self.skipWaiting()));
});

// A página pergunta a versão deste service worker: se for a mesma dela, não precisa recarregar.
self.addEventListener('message', (evento) => {
  if (evento.data?.tipo === 'versao') evento.ports[0]?.postMessage({ versao: VERSAO });
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(chaves.filter((k) => k !== VERSAO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Abre na hora, sem esperar a rede: a casca vem do cache desta versão (instalado inteiro, já confirmado com o servidor).
// A versão nova chega por um service worker novo (o navegador confere o sw.js a cada abertura e a página pede
// `update()` ao voltar): ele baixa tudo de novo, assume, e o atualizacao.js recarrega numa tela segura. O que não está
// no cache vai à rede (confirmando com o servidor, sem a cópia de 10 minutos do aparelho) e fica guardado.
self.addEventListener('fetch', (evento) => {
  const req = evento.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  const navegacao = req.mode === 'navigate';
  evento.respondWith((async () => {
    const guardada = await caches.match(navegacao ? './index.html' : req, { ignoreSearch: true });
    if (guardada) return guardada;
    try {
      // Pedido de navegação não aceita opções: vai pela URL, com redirecionamento "manual" (uma navegação não pode
      // ser respondida com uma resposta já redirecionada).
      const resposta = navegacao
        ? await fetch(req.url, { cache: 'no-cache', credentials: 'same-origin', redirect: 'manual' })
        : await fetch(req, { cache: 'no-cache' });
      if (resposta.ok) {
        const copia = resposta.clone();
        caches.open(VERSAO).then((c) => c.put(req, copia));
      }
      return resposta;
    } catch {
      return (await caches.match('./index.html')) ?? Response.error();
    }
  })());
});
