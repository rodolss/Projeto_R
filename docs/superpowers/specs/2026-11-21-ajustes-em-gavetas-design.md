# Ajustes em gavetas — desenho curto

Data: 2026-11-21. Pedido do usuário: "em Mais > Ajustes, consegue agrupar (exemplo: cartão, Casa…) algumas coisas e
criar uma espécie de gaveta que expande conforme eu seleciono o grupo com uma animação bacana". Sem perguntas.

## Decisões (todas do executor)

- **Quatro grupos** (para todos os perfis; o do plano só na visão única):
  - **Casa** — quem divide as contas, as contas e como a divisão funciona (resumo: "Ana e Leo · 9 contas");
  - **Cartões e compras** — os cartões, "Adicionar outro cartão", outras pessoas e as etiquetas compostas;
  - **Plano de aposentadoria** — o caminho para os Ajustes do plano;
  - **Aparelhos e perfis** — a sincronização (e trocar a chave) e os perfis e aparelhos.
- **Uma gaveta aberta por vez.** Abrir outra fecha a anterior; a aberta sobe para o topo da tela. Ela continua
  aberta depois de salvar (a tela se redesenha) e ao voltar para cá na mesma sessão. "Perfis e aparelhos" (o menu da
  foto) abre a gaveta deles.
- **Animação:** a altura cresce com `grid-template-rows` (0fr → 1fr), o conteúdo desce e aparece, a seta gira 180° e
  vira a pílula em degradê, o selo do grupo dá um giro com mola, e a gaveta aberta ganha sombra e borda de destaque.
  Com "reduzir movimento", abre sem animar. O conteúdo fechado fica `inert` (fora do teclado e do leitor de tela).
- Dentro da gaveta, cada bloco perde o cartão em volta e vira uma seção separada por uma linha. Versão do site 61.
