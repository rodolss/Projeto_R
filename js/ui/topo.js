// Perfis (desenho 2026-11-20-perfis): a foto redonda no canto de cima, como no YouTube, e a tela "Quem usa este
// celular?" (uma vez por chave do GitHub). Tocar na foto abre um menu: quem administra troca de perfil (só neste
// aparelho); todos trocam a foto do perfil que estão vendo; quem administra, no próprio perfil, vai para
// "Perfis e aparelhos".
import { h, cartao } from './dom.js';
import { trocarFoto, perfisParaEscolher } from '../core/perfis.js';

const CORES = ['#1d4ed8', '#047857', '#b45309', '#7c3aed', '#be123c', '#0e7490'];
const corDo = (texto) => CORES[[...String(texto)].reduce((s, c) => s + c.codePointAt(0), 0) % CORES.length];
export const inicial = (nome) => (String(nome ?? '').trim()[0] ?? '?').toUpperCase();

export function avatar(perfil, { grande = false } = {}) {
  const classe = `avatar${grande ? ' grande' : ''}`;
  return perfil?.foto
    ? h('img', { class: classe, src: perfil.foto, alt: '' })
    : h('span', { class: classe, style: `background:${corDo(perfil?.nome)}`, 'aria-hidden': 'true' }, inicial(perfil?.nome));
}

// Foto reduzida no aparelho: quadrado de 160 px, cortado no meio, em JPEG (fica com poucos KB no casa.json).
export async function reduzirFoto(arquivo, lado = 160) {
  const url = URL.createObjectURL(arquivo);
  try {
    const img = await new Promise((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = url; });
    const menor = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = lado;
    canvas.height = lado;
    canvas.getContext('2d').drawImage(img, (img.naturalWidth - menor) / 2, (img.naturalHeight - menor) / 2, menor, menor, 0, 0, lado, lado);
    return canvas.toDataURL('image/jpeg', 0.8);
  } finally {
    URL.revokeObjectURL(url);
  }
}

let fecharMenuAberto = null;

export function desenharTopo(el, ctx) {
  fecharMenuAberto?.();
  const { visto, vinculado, admin, perfis } = ctx.perfil ?? {};
  if (!visto) {
    el.hidden = true;
    el.replaceChildren();
    return;
  }
  el.hidden = false;
  const botao = h('button', { type: 'button', class: 'avatar-botao', 'aria-label': `Perfil de ${visto.nome}`, 'aria-haspopup': 'true' }, avatar(visto));
  el.replaceChildren(botao);

  botao.addEventListener('click', (e) => {
    e.stopPropagation();
    if (fecharMenuAberto) { fecharMenuAberto(); return; }
    const escolherFoto = h('input', {
      type: 'file', accept: 'image/*', hidden: true,
      onchange: async (ev) => {
        const arquivo = ev.target.files?.[0];
        if (!arquivo) return;
        try {
          const foto = await reduzirFoto(arquivo);
          await ctx.salvarCasa((c) => trocarFoto(c, visto.id, foto));
          ctx.aviso('Foto trocada.', 'ok', 2500);
          ctx.rerender();
        } catch {
          ctx.aviso('Não consegui usar essa foto. Tente outra.', 'atencao', 4000);
        }
      },
    });
    const menu = h('div', { class: 'menu-perfil', role: 'menu' },
      h('div', { class: 'menu-perfil-quem' }, avatar(visto, { grande: true }), h('b', {}, visto.nome)),
      admin && h('div', { class: 'menu-perfil-lista' },
        h('div', { class: 'rotulo' }, 'Trocar de perfil'),
        ...perfis.map((p) => h('button', {
          type: 'button', class: `menu-perfil-item${p.id === visto.id ? ' atual' : ''}`, role: 'menuitem',
          onclick: () => { fechar(); if (p.id !== visto.id) ctx.perfil.trocar(p.id); },
        }, avatar(p), h('span', {}, p.nome), p.id === visto.id && h('span', { class: 'menu-perfil-marca', 'aria-label': 'perfil atual' }, '✓')))),
      h('button', { type: 'button', class: 'menu-perfil-acao', role: 'menuitem', onclick: () => escolherFoto.click() }, visto.foto ? 'Trocar a foto' : 'Pôr uma foto'),
      visto.foto && h('button', {
        type: 'button', class: 'menu-perfil-acao', role: 'menuitem',
        onclick: async () => { fechar(); await ctx.salvarCasa((c) => trocarFoto(c, visto.id, null)); ctx.rerender(); },
      }, 'Tirar a foto'),
      admin && vinculado?.id === visto.id && h('button', {
        type: 'button', class: 'menu-perfil-acao', role: 'menuitem',
        onclick: () => { fechar(); ctx.navegar('#/casa-ajustes?secao=perfis'); },
      }, 'Perfis e aparelhos'),
      escolherFoto);
    const foraDoMenu = (ev) => { if (!menu.contains(ev.target)) fechar(); };
    function fechar() {
      menu.remove();
      document.removeEventListener('click', foraDoMenu);
      fecharMenuAberto = null;
    }
    fecharMenuAberto = fechar;
    el.append(menu);
    document.addEventListener('click', foraDoMenu);
  });
}

// Uma vez por chave: quem usa este aparelho. Só quem administra muda depois (Ajustes da casa › Perfis e aparelhos).
export function telaQuemUsa(container, ctx) {
  const botoes = perfisParaEscolher(ctx.casa).map((p) => h('button', {
    type: 'button', class: 'quem-usa-perfil',
    onclick: async (e) => {
      for (const b of container.querySelectorAll('.quem-usa-perfil')) b.disabled = true;
      e.currentTarget.classList.add('escolhido');
      await ctx.perfil.vincular(p.id);
    },
  }, avatar(p, { grande: true }), h('span', {}, p.nome)));
  container.replaceChildren(
    h('h1', {}, 'Quem usa este celular?'),
    cartao(
      h('p', {}, 'Escolha uma vez. Este celular vai abrir sempre no seu perfil, com os seus cartões.'),
      h('div', { class: 'quem-usa' }, ...botoes)));
}
