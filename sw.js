// Service worker: o app abre sem internet. Estratégia network-first: com conexão, sempre busca a
// versão nova (e atualiza o cache); sem conexão, usa o cache. APIs externas nunca passam pelo cache.
const VERSAO = 'projeto-r-v5'; // igual a js/versao.js (um teste confere)
const CASCA = [
  './', './index.html', './css/app.css', './manifest.webmanifest',
  './icones/icone-192.png', './icones/icone-512.png', './icones/icone-maskable-512.png',
  './fontes/inter-latin.woff2', './fontes/sora-latin.woff2',
  './js/app.js', './js/versao.js',
  './js/core/alocacao.js', './js/core/aporte.js', './js/core/checkup.js', './js/core/desempenho.js',
  './js/core/esquema.js', './js/core/financas.js', './js/core/formato.js', './js/core/ipca.js',
  './js/core/lembretes.js', './js/core/lista-mes.js', './js/core/marcos.js', './js/core/meses.js', './js/core/metas.js', './js/core/motor.js', './js/core/projecao.js',
  './js/core/protecao.js', './js/core/simulador.js',
  './js/dados/armazem.js', './js/dados/github.js', './js/dados/ipca-remoto.js', './js/dados/mesclar.js',
  './js/ui/atualizacao.js', './js/ui/boas-vindas.js', './js/ui/config.js', './js/ui/detalhes.js', './js/ui/dom.js', './js/ui/festa.js', './js/ui/grafico.js', './js/ui/historico.js',
  './js/ui/inicio.js', './js/ui/mais.js', './js/ui/mes.js', './js/ui/mes-rascunho.js', './js/ui/movimento.js', './js/ui/nativo.js', './js/ui/orcamento.js', './js/ui/rotas.js', './js/ui/simular.js',
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

self.addEventListener('fetch', (evento) => {
  const req = evento.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // no-cache: confirma com o servidor se o arquivo mudou (a resposta 304 é pequena), em vez de usar a cópia
  // de até 10 minutos. Pedido de navegação não aceita opções: vai pela URL, com redirecionamento "manual"
  // (uma navegação não pode ser respondida com uma resposta já redirecionada).
  const buscar = req.mode === 'navigate'
    ? fetch(req.url, { cache: 'no-cache', credentials: 'same-origin', redirect: 'manual' })
    : fetch(req, { cache: 'no-cache' });
  evento.respondWith(
    buscar
      .then((resposta) => {
        if (resposta.ok) {
          const copia = resposta.clone();
          caches.open(VERSAO).then((c) => c.put(req, copia));
        }
        return resposta;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r ?? caches.match('./index.html'))),
  );
});
