# Perfis e aparelhos em listas limpas

## Por quê

A gaveta "Aparelhos e perfis" dos Ajustes era a única com campos de texto soltos na lista, caixas de escolha cortadas
("Escolha o per…") e links vermelhos de "Tirar". O usuário achou "muito amadora" e pediu a UX que o mercado já
considera a melhor. As gavetas Casa e Cartões já seguem o padrão de Ajustes do iOS e do Material: lista limpa com
seta, e um toque abre uma folha simples.

## Decisões (entrevista de 2026-11-21: todas as recomendadas)

- Mesmo padrão das outras gavetas, sem protótipos.
- Criar perfil: só o nome, numa folha "Novo perfil" aberta pela linha "+ Adicionar perfil". Quem divide continua
  em Casa › Quem divide as contas.
- Aparelhos: cada um é uma linha. Tocar abre "De quem é este aparelho?", com os perfis em botões grandes com foto,
  e "Tirar este aparelho" (dois toques) no fim. Um pedido de aparelho novo aparece no topo, em destaque, com
  "Liberar".
- Apagar perfil: dois toques, no fim da folha do perfil. Só aparece se o perfil não administra, não tem cartão nem
  aparelho, e não está na lista de quem divide (nem com períodos passados).

## Abordagens

1. **Lista limpa e folhas, como Casa e Cartões (escolhida):** um padrão só no app inteiro.
2. Edição na própria lista (inline), como antes, com os controles arrumados: continua com muitos controles na tela.
3. Uma tela própria para Perfis: um nível a mais de navegação para três ou quatro itens.

## Como fica

- Núcleo (`js/core/perfis.js`): `detalheDoPerfil(casa, perfil, impressao)` dá a linha de explicação
  ("administra · este aparelho e mais 1", "1 aparelho", "sem aparelho ainda"); `podeApagarPerfil(casa, id)` e
  `apagarPerfil(casa, id)`.
- Tela (`js/ui/casa-ajustes.js`): folhas `perfil-<id>`, `novo-perfil` e `aparelho-<impressão>`, só para quem
  administra.
