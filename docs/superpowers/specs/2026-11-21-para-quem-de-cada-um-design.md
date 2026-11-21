# "Para quem" de cada um — desenho curto

Data: 2026-11-21. Pedido do usuário: "sobre o 'para quem compro', cada um possui o seu, por exemplo o Pai é o dela,
não o meu". Até aqui as outras pessoas (`casa.outrasPessoas`) valiam para todos os cartões. Sem perguntas.

## Decisões (todas do executor)

- **Cada outra pessoa tem dona:** quem tem o cartão em que ela foi criada (`donaId`, gravado ao criar pelo "+ Outra
  pessoa" ao anotar uma compra).
- **As que já existiam (sem `donaId`)** são de quem já comprou para elas num cartão; se ninguém comprou ainda, ou os
  dois já compraram, continuam valendo para todos. Nada a migrar no casa.json: a dona se descobre pelas compras
  (`donaDaPessoa`, `pessoasDe` em `js/core/cartao.js`).
- **No Cartão**, "Para quem" mostra só as pessoas de quem tem o cartão. **Nos Ajustes**, "Para quem também compro"
  mostra só as do perfil visto (sem perfis: todas, com "para quem Ana compra").
- **Mesmo nome, outra pessoa:** o "Pai" dela e o "Pai" dele são pessoas diferentes; repetir o nome no próprio cartão
  devolve a mesma pessoa.
- As compras antigas continuam mostrando o nome de quem quer que seja (o nome não depende do cartão).
- Também: no "+ Outra pessoa" o Cancelar foi para a esquerda e o Adicionar para a direita. Versão do site 64.
