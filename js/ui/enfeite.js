// Enfeites das telas (desenho 2026-11-21-facelift), aplicados pelo app.js depois de cada desenho: o ícone de cada título
// de seção (pelo texto do título) e, só quando a tela abre (não a cada atualização), os valores do cartão herói contando.
import { icone } from './icones.js';
import { formatarBRL, parseBRL } from '../core/formato.js';
import { reduzMovimento } from './movimento.js';

// Título da seção → [ícone, categoria da cor]. A primeira que casa vence; título sem par fica como está.
const TITULOS = [
  [/^Entrou/, 'entrou', 'salario'],
  [/^Saiu/, 'saiu', 'saida'],
  [/^Contas$/, 'recibo'],
  [/^Salário/, 'carteira', 'salario'],
  [/^Compras/, 'sacola', 'compras'],
  [/^Todo mês/, 'repetir', 'assinatura'],
  [/^De quem é/, 'pessoas'],
  [/^Para outras pessoas/, 'presente', 'presente'],
  [/^Outras pessoas/, 'pessoas'],
  [/^Onde mais vai/, 'grafico'],
  [/^Para onde foi/, 'grafico'],
  [/^Mês a mês/, 'historico'],
  [/^Etiquetas/, 'etiqueta', 'assinatura'],
  [/^Para quem também compro/, 'pessoas'],
  [/^Quem divide/, 'pessoas'],
  [/^Quem ainda te deve/, 'pessoas', 'extra'],
  [/^Cart(ão|ões)$|^Cartão de /, 'cartao'],
  [/^De quais faturas/, 'cartao'],
  [/^(Nos dois celulares|Sincronização|Usar nos dois)/, 'nuvem'],
  [/^Chave nova/, 'chave'],
  [/^Como (a divisão|criar)/, 'info'],
  [/^Perfis e aparelhos/, 'celular'],
  [/^Perfis$/, 'pessoas'],
  [/^Aparelhos$/, 'celular'],
  [/^Premissas/, 'alvo'],
  [/^Carteira-alvo/, 'alvo'],
  [/^(Investimentos|Investir|Onde aplicar)/, 'investir', 'mercado'],
  [/^Renda/, 'carteira', 'salario'],
  [/^Inflação/, 'percentual'],
  [/^Backup/, 'escudo'],
  [/^Lembretes/, 'sino'],
  [/^(Atualizar saldos|Copie os saldos)/, 'moeda'],
  [/^Seu plano/, 'alvo'],
  [/^Divisão da carteira/, 'grafico'],
  [/^Plano de aposentadoria/, 'investir', 'mercado'],
  [/^De onde vem/, 'recibo'],
];

function enfeitarTitulos(tela) {
  for (const h2 of tela.querySelectorAll('.cartao > h2, section > h2')) {
    if (h2.classList.contains('com-icone')) continue;
    const texto = (h2.firstChild?.nodeType === Node.TEXT_NODE ? h2.firstChild.nodeValue : h2.textContent).trim();
    const par = TITULOS.find(([regra]) => regra.test(texto));
    if (!par) continue;
    const [, nome, cat] = par;
    const selo = document.createElement('span');
    selo.className = `titulo-icone${cat ? ` cat-${cat}` : ''}`;
    selo.setAttribute('aria-hidden', 'true');
    selo.append(icone(nome));
    h2.prepend(selo);
    h2.classList.add('com-icone');
  }
}

// "R$ 2.694,24" (ou "-R$ 12,00") conta de zero até o valor; só o texto do número muda (a seta ao lado fica).
function contarValor(el, duracaoMs = 900) {
  const no = [...el.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && /\d/.test(n.nodeValue));
  if (!no) return;
  const original = no.nodeValue;
  const negativo = /^\s*-/.test(original);
  const alvo = parseBRL(original.replace('-', ''));
  if (alvo == null || alvo === 0) return;
  const inicio = performance.now();
  const passo = (agora) => {
    if (!no.isConnected) return;
    const k = Math.min(1, (agora - inicio) / duracaoMs);
    if (k >= 1) { no.nodeValue = original; return; }
    const v = alvo * (1 - Math.pow(1 - k, 3));
    no.nodeValue = formatarBRL(negativo ? -v : v);
    requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}

export function enfeitar(tela, { abriu = false } = {}) {
  enfeitarTitulos(tela);
  if (abriu && !reduzMovimento()) {
    for (const el of tela.querySelectorAll('.heroi .valor-grande, .casa-pessoa .valor')) contarValor(el);
  }
}
