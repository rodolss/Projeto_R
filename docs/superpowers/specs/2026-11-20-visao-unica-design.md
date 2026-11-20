# Visão única (aposentadoria + contas da casa) — desenho curto

Data: 2026-11-20. Pedido do usuário: "unifique as visões para mim de aposentadoria e esta nova em uma só, sem
impactar a [outra pessoa da casa], pode tomar todas as decisões" (sem entrevista). Exemplos INVENTADOS
(repositório público): Ana administra e tem o planejador; Leo divide a casa.

## Hoje

Dois espaços com dois menus: a aposentadoria (Início · Mês · Simular · Mais) e as contas da casa (Balanço · Mês ·
Cartão · Ano · Ajustes). Troca-se por Mais › Contas da casa e por Ajustes da casa › "Ir para o planejador". A foto
do perfil (trocar de perfil) só aparece nas telas da casa.

## Decisões (todas do executor)

- **Quem vê:** a visão única vale quando o perfil visto administra (`visto.admin`) e o planejador existe (há
  estado da aposentadoria). A outra pessoa, um aparelho sem perfil e quem administra vendo o perfil da outra pessoa
  continuam exatamente como hoje (dois espaços; a outra pessoa só tem a casa).
- **Um menu de 5 abas:** **Balanço · Contas · Cartão · Plano · Mais**.
  - Balanço (primeiro, como pedido antes), Contas (o Mês da casa; outro nome para não haver dois "Mês"), Cartão.
  - Plano = o Início da aposentadoria; a rotina do mês da aposentadoria (`#/mes`, "Dia de pagamento", aberta pelo
    Início e pelos lembretes) acende o Plano.
  - Mais = Simulador, Ano da casa, Orçamento, Histórico, Ajustes da casa, Ajustes do planejador (cada um acende o
    Mais).
- **A foto do perfil** aparece no topo em todas as telas da visão única (trocar de perfil de qualquer lugar).
- O botão "Ir para o planejador de aposentadoria" dos Ajustes da casa some na visão única (o Plano já está no menu).
- Nada muda nas contas: recomendações de investimento, contas da casa e balanço ficam como estão. A tela de
  abertura continua sendo a última usada.

## Abordagem

Funções puras em `js/ui/rotas.js` (`visaoUnica`, `abaDoMenu(rota, unica)`) e em `js/ui/mais.js` (`itensDoMais`);
um terceiro `<nav class="menu menu-unico">` no `index.html`, mostrado pela classe `espaco-unico` no `body`.
Alternativa descartada: fundir as telas (por exemplo, um Início com Balanço e Plano juntos) — muda telas que a outra
pessoa usa e mexe em contas; fica para depois, se o usuário quiser. Versão do site 17.
