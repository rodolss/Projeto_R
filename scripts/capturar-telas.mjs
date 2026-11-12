// Fotografa telas do app em tamanho de celular (412 × 915), no tema claro e no escuro, com o Edge headless.
// Serve para conferir o visual sem dados reais: injeta scripts/dados-exemplo.json (números inventados).
//
// Uso: node scripts/capturar-telas.mjs <pasta-saida> [--rotas inicio,mes] [--festa] [--sem-dados] [--estado arquivo.json] [--reduzir] [--espera 1500]
// --estado usa um estado pronto (por exemplo, o de scripts/gerar-historico-falso.mjs) no lugar da amostra.
// Pressupõe `npm run servir` rodando em http://localhost:8080. Sai com código 1 se a página tiver erros.
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CARTEIRA_PADRAO } from '../js/core/alocacao.js';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const APP = 'http://localhost:8080/';
const PORTA = 9333;
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

const args = process.argv.slice(2);
const saida = args.find((a, k) => !a.startsWith('--') && !['--rotas', '--espera', '--estado'].includes(args[k - 1]));
if (!saida) {
  console.error('Uso: node scripts/capturar-telas.mjs <pasta-saida> [--rotas inicio,mes] [--festa] [--sem-dados] [--reduzir]');
  process.exit(2);
}
const opcao = (nome) => args.includes(`--${nome}`);
const iRotas = args.indexOf('--rotas');
const rotas = iRotas >= 0 ? args[iRotas + 1].split(',') : ['inicio', 'mes', 'simular', 'mais'];
const iEspera = args.indexOf('--espera');
const ESPERA_MS = iEspera >= 0 ? Number(args[iEspera + 1]) : 1500;
const iEstado = args.indexOf('--estado');

// ---------- amostra com datas de hoje ----------
const doisDigitos = (n) => String(n).padStart(2, '0');
const mesISO = (d) => `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}`;
const somarMeses = (mes, n) => {
  const [a, m] = mes.split('-').map(Number);
  const total = a * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${doisDigitos((total % 12) + 1)}`;
};
const diffMeses = (de, ate) => {
  const [a1, m1] = de.split('-').map(Number);
  const [a2, m2] = ate.split('-').map(Number);
  return (a2 * 12 + m2) - (a1 * 12 + m1);
};

function amostraDeHoje() {
  const pasta = dirname(fileURLToPath(import.meta.url));
  const e = JSON.parse(readFileSync(join(pasta, 'dados-exemplo.json'), 'utf8'));
  delete e._aviso;
  const agora = new Date();
  const hoje = `${mesISO(agora)}-${doisDigitos(agora.getDate())}`;
  const mesAnterior = somarMeses(mesISO(agora), -1);
  const desloc = diffMeses(e.config.mesInicio, mesAnterior);
  // Desloca toda data da amostra para que o "mês do lançamento" seja o mês passado.
  const mover = (v) => {
    if (typeof v !== 'string') return v;
    if (/^\d{4}-\d{2}$/.test(v)) return somarMeses(v, desloc);
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return `${somarMeses(v.slice(0, 7), desloc)}${v.slice(7)}`;
    return v;
  };
  const percorrer = (x) => (Array.isArray(x) ? x.map(percorrer)
    : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, percorrer(v)])) : mover(x));
  const estado = percorrer(e);
  for (const s of estado.saldos) s.data = hoje;
  estado.carteiraAlvo ??= structuredClone(CARTEIRA_PADRAO);
  estado.ipca = { serie: { [mesAnterior]: 0, [somarMeses(mesAnterior, -1)]: 0 }, atualizadoEm: agora.toISOString() };
  if (opcao('festa')) estado.marcos = {};
  return estado;
}

// ---------- CDP ----------
async function conectar(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((ok, erro) => { ws.onopen = ok; ws.onerror = erro; });
  let proximo = 0;
  const pendentes = new Map();
  const erros = [];
  ws.onmessage = (msg) => {
    const d = JSON.parse(msg.data);
    if (d.id && pendentes.has(d.id)) {
      const { ok, erro } = pendentes.get(d.id);
      pendentes.delete(d.id);
      if (d.error) erro(new Error(JSON.stringify(d.error))); else ok(d.result);
      return;
    }
    if (d.method === 'Runtime.exceptionThrown') erros.push(d.params.exceptionDetails?.exception?.description ?? d.params.exceptionDetails?.text);
    if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') erros.push(d.params.args.map((a) => a.value ?? a.description).join(' '));
    if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') erros.push(`${d.params.entry.text} ${d.params.entry.url ?? ''}`);
  };
  const enviar = (method, params = {}) => new Promise((ok, erro) => {
    const id = ++proximo;
    pendentes.set(id, { ok, erro });
    ws.send(JSON.stringify({ id, method, params }));
  });
  return { enviar, erros, fechar: () => ws.close() };
}

async function alvoDaPagina() {
  for (let k = 0; k < 50; k++) {
    try {
      const lista = await (await fetch(`http://127.0.0.1:${PORTA}/json/list`)).json();
      const pagina = lista.find((t) => t.type === 'page');
      if (pagina) return pagina.webSocketDebuggerUrl;
    } catch { /* o Edge ainda está subindo */ }
    await pausa(200);
  }
  throw new Error('O Edge não respondeu na porta de depuração.');
}

// ---------- principal ----------
mkdirSync(saida, { recursive: true });
const perfil = mkdtempSync(join(tmpdir(), 'projeto-r-edge-'));
const edge = spawn(EDGE, [
  '--headless=new', `--remote-debugging-port=${PORTA}`, `--user-data-dir=${perfil}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions', 'about:blank',
], { stdio: 'ignore' });

let codigo = 0;
try {
  const cdp = await conectar(await alvoDaPagina());
  await cdp.enviar('Page.enable');
  await cdp.enviar('Runtime.enable');
  await cdp.enviar('Log.enable');
  await cdp.enviar('Emulation.setDeviceMetricsOverride', { width: 412, height: 915, deviceScaleFactor: 2, mobile: true });

  const estado = opcao('sem-dados') ? null : iEstado >= 0 ? JSON.parse(readFileSync(args[iEstado + 1], 'utf8')) : amostraDeHoje();
  for (const tema of ['claro', 'escuro']) {
    await cdp.enviar('Emulation.setEmulatedMedia', {
      features: [
        { name: 'prefers-color-scheme', value: tema === 'claro' ? 'light' : 'dark' },
        { name: 'prefers-reduced-motion', value: opcao('reduzir') ? 'reduce' : 'no-preference' },
      ],
    });
    await cdp.enviar('Page.navigate', { url: APP });
    await pausa(800);
    await cdp.enviar('Runtime.evaluate', {
      expression: `localStorage.clear(); ${estado ? `localStorage.setItem('projetoR.estado', ${JSON.stringify(JSON.stringify(estado))});` : ''}`,
    });
    for (const rota of rotas) {
      await cdp.enviar('Page.navigate', { url: `${APP}?c=${Date.now()}#/${rota}` });
      await pausa(ESPERA_MS);
      const { cssContentSize } = await cdp.enviar('Page.getLayoutMetrics');
      const altura = Math.max(915, Math.ceil(cssContentSize.height));
      // A janela cresce até a altura da página: assim o menu fixo aparece no rodapé da foto, não no meio.
      await cdp.enviar('Emulation.setDeviceMetricsOverride', { width: 412, height: altura, deviceScaleFactor: 2, mobile: true });
      await pausa(300);
      const { data } = await cdp.enviar('Page.captureScreenshot', { format: 'png' });
      await cdp.enviar('Emulation.setDeviceMetricsOverride', { width: 412, height: 915, deviceScaleFactor: 2, mobile: true });
      const arquivo = join(saida, `${rota.replace(/[?=/&]/g, "-")}-${tema}${opcao("reduzir") ? "-reduzido" : ""}.png`);
      writeFileSync(arquivo, Buffer.from(data, 'base64'));
      console.log(`ok  ${arquivo}`);
    }
  }
  if (cdp.erros.length) {
    codigo = 1;
    console.error('Erros na página:');
    for (const e of cdp.erros) console.error(`  - ${e}`);
  }
  cdp.fechar();
} catch (erro) {
  codigo = 1;
  console.error(erro.message);
} finally {
  edge.kill();
  await pausa(300);
  try { rmSync(perfil, { recursive: true, force: true }); } catch { /* arquivos presos pelo Edge */ }
}
process.exit(codigo);
