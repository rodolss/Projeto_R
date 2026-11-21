# Anotar sem rolar e a data da parcelada — desenho curto

Data: 2026-11-21. Pedido do usuário: "adicione uma opção para editar a compra parcelada ao abrir ela (alterar a data
de compra e o número de parcelas), e faça com que a pessoa não precise rolar a tela toda vez que for adicionar uma
compra nova: a Tag está ocupando muito espaço na tela". Sem perguntas.

## Decisões (todas do executor)

- **Compra parcelada, ao abrir:** além de "Parcelas" (versão 65), agora também **Data da compra**. A 1ª parcela vai
  para a fatura da data nova e as outras andam junto (todas com a data nova). Nunca para uma fatura anterior, nem
  tirando parcela de uma fatura travada ou levando para uma (`mudarDataDaParcelada` em `js/core/cartao.js`).
- **Etiqueta compacta:** sai a linha "Etiquetas:" (as etiquetas são as palavras do nome, que já está no campo); os
  balões ficam numa linha só, que desliza; e o meio da palavra só conta a partir de 3 letras ("ra" não sugere mais
  "Água Mineral" nem "Suco de Laranja").
- **Anotar compra cabe na tela:** valor e data lado a lado (a fatura embaixo), a dica "o valor é o de cada parcela" só
  aparece em "Parcelado", e "Para quem" e "Como foi" numa linha que desliza.
- **Botões presos no pé da folha** (anotar, editar compra e editar a de todo mês): Fechar | Salvar sempre à vista.
  Versão do site 66.
