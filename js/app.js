// Inicialização, roteador por hash e contexto compartilhado entre as telas.
import { criarArmazem } from './dados/armazem.js';
import { criarClienteGitHub, donoPadrao } from './dados/github.js';
import { buscarSerieIpca, precisaAtualizarIpca } from './dados/ipca-remoto.js';
import { dataISO, somarMeses } from './core/meses.js';
import { h, cartao, aviso, textoConexao } from './ui/dom.js';

const TELAS = ['inicio', 'mes', 'painel', 'orcamento', 'historico', 'config'];
const CHAVE_TOKEN = 'projetoR.token';
const CHAVE_DONO = 'projetoR.dono';
const app = { estado: null, armazem: null, conexao: null };
const fetchGlobal = (...args) => globalThis.fetch(...args);

function lerConexao() {
  const token = localStorage.getItem(CHAVE_TOKEN);
  const dono = localStorage.getItem(CHAVE_DONO) || donoPadrao(location.hostname);
  return token && dono ? { token, dono } : null;
}

function montarArmazem() {
  app.conexao = lerConexao();
  const cliente = app.conexao ? criarClienteGitHub({ ...app.conexao, fetch: fetchGlobal }) : null;
  app.armazem = criarArmazem({ armazenamento: localStorage, cliente });
}

export function mostrarAviso(texto, nivel = 'info', duracao = 7000) {
  const caixa = document.getElementById('avisos');
  const el = aviso(nivel, texto);
  caixa.append(el);
  if (duracao) setTimeout(() => el.remove(), duracao);
}

async function salvar(mutacao) {
  const r = await app.armazem.salvar(mutacao);
  app.estado = r.estado;
  if (r.aviso) mostrarAviso(textoConexao(r.aviso), r.aviso === 'conflito-resolvido' ? 'info' : 'atencao');
  return r;
}

async function conectar({ token, dono }) {
  localStorage.setItem(CHAVE_TOKEN, token);
  localStorage.setItem(CHAVE_DONO, dono);
  montarArmazem();
  const r = await app.armazem.carregar();
  if (r.estado) app.estado = r.estado;
  return r;
}

function desconectar() {
  localStorage.removeItem(CHAVE_TOKEN);
  localStorage.removeItem(CHAVE_DONO);
  montarArmazem();
}

const navegar = (hash) => { location.hash = hash; };

function contexto() {
  return {
    estado: app.estado,
    hoje: dataISO(new Date()),
    salvar,
    navegar,
    aviso: mostrarAviso,
    conexao: app.conexao,
    conectar,
    desconectar,
    fetch: fetchGlobal,
    donoSugerido: donoPadrao(location.hostname),
    rerender: () => renderizar(),
  };
}

async function renderizar() {
  const rota = (location.hash.replace(/^#\/?/, '').split('?')[0]) || 'mes';
  if (!app.estado && rota !== 'inicio') { navegar('#/inicio'); return; }
  const nome = TELAS.includes(rota) ? rota : 'mes';
  document.body.classList.toggle('sem-abas', nome === 'inicio');
  for (const a of document.querySelectorAll('#abas a')) a.classList.toggle('ativa', a.dataset.rota === nome);

  const tela = document.getElementById('tela');
  try {
    const modulo = await import(`./ui/${nome}.js`);
    tela.replaceChildren();
    modulo.render(tela, contexto());
    window.scrollTo(0, 0);
  } catch (erro) {
    console.error(erro);
    tela.replaceChildren(cartao(h('p', {}, 'Esta tela ainda não está pronta.')));
  }
}

async function atualizarIpca() {
  if (!app.estado || !precisaAtualizarIpca(app.estado.ipca, new Date())) return;
  try {
    const serie = await buscarSerieIpca({ fetch: fetchGlobal, desde: somarMeses(app.estado.config.mesInicio, -1) });
    await salvar((e) => ({ ...e, ipca: { serie: { ...e.ipca.serie, ...serie }, atualizadoEm: new Date().toISOString() } }));
  } catch (erro) {
    console.warn('IPCA indisponível', erro);
  }
}

async function iniciar() {
  const tema = new URLSearchParams(location.search).get('tema');
  if (tema === 'escuro' || tema === 'claro') document.documentElement.dataset.tema = tema;

  montarArmazem();
  const r = await app.armazem.carregar();
  app.estado = r.estado;
  if (r.aviso) mostrarAviso(textoConexao(r.aviso), 'atencao');

  window.addEventListener('hashchange', renderizar);
  window.addEventListener('online', async () => {
    const s = await app.armazem.sincronizarPendentes();
    if (s.sincronizado) mostrarAviso('Conexão de volta: dados sincronizados.', 'ok', 4000);
  });
  await renderizar();
  atualizarIpca();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch((erro) => console.warn('Sem modo offline', erro));
}

iniciar();
