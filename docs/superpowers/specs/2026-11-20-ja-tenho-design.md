# "Já tenho" no cartão — desenho

Data: 2026-11-20. Entrevista Q1–Q14 com o usuário; visual escolhido em protótipo clicável (versão D: compras e
"De quem é" da versão A, tela do Cofrinho da versão C com o botão no fim da fatura, interruptor da A).
Exemplos com nomes e valores INVENTADOS (o repositório é público): Ana é a dona do cartão, Leo divide a casa com
ela, Mãe e Tio são outras pessoas para quem Ana compra.

## Por quê

A Ana às vezes passa no crédito uma compra que já tem o dinheiro na mão, como se fosse no débito, só para juntar
milhas, e guarda o dinheiro no cofrinho do banco. Faz o mesmo com compras para outras pessoas: passa a compra,
recebe o dinheiro (na hora ou uns 13 dias depois) e guarda. Na planilha ela pinta essas compras de amarelo e soma
as amarelas à mão num quadro "JÁ TENHO". O app precisa dessa marca, editável, e da soma automática.

## Objetivos

- Marca **"Já tenho"** por compra: liga ao anotar ou depois, na folha da compra; desliga quando quiser.
- Na fatura: etiqueta amarela "Já tenho" na linha da compra; em "De quem é", para cada pessoa (e para a dona):
  total em cima, barrinha amarela, "Já tenho X" e "Falta Y" (ou "Já tenho tudo ✓") embaixo.
- Tela do **Cofrinho**: quanto deve ter no cofrinho (para conferir com o banco), de quais faturas, e quem ainda
  te deve, compra por compra.

## Fora do escopo

- Compras para a **Casa** (a parte da casa é dividida nas contas da casa).
- Marcar tudo de uma pessoa de uma vez; toque direto na lista para marcar (risco de toque sem querer).
- O "reembolso" do quadro da planilha.
- Valor parcial numa compra (anota-se duas compras).

## Anti-objetivos

- Mudar o total da fatura ou a parte da casa: a marca só mostra o que já está garantido.
- Dívida de uma fatura aparecendo dentro de outra fatura: fica só na fatura dela e na tela do Cofrinho.
- Tela complicada: uma palavra só ("Já tenho") para tudo, inclusive o que outras pessoas já pagaram.

## Abordagens

1. **A marca dentro da própria compra (escolhida).** A compra ganha `jaTenho: true`; a de todo mês ganha
   `jaTenhoEm: { 'AAAA-MM': true }` (as faturas marcadas). Cada parcela já é uma compra separada em cada fatura,
   então "só esta parcela" sai de graça. A mescla de 3 vias junta campo a campo (e objeto chave a chave), então
   marcar no celular dela e editar no outro não se perdem. Sem versão nova do casa.json: app antigo ignora a
   marca e a preserva (`{ ...alvo, ...mudanca }`).
2. Lista de marcas à parte no cartão (`{ compraId: true }`): marcas soltas quando a compra é apagada; mais
   buscas. Sem vantagem.
3. Caderno de "entradas no cofrinho" separado das compras: não é o jeito da planilha (marca por compra) e não diz
   quem ainda deve o quê.

## Regras

- **Quem pode ter a marca:** toda compra e toda de todo mês cujo `para` não é Casa, em qualquer cartão.
- **Parcela:** a marca vale só para aquela parcela. Ao anotar parcelada com "Já tenho", só a 1ª parcela sai marcada.
- **Todo mês:** a marca vale só para aquela fatura. Ao anotar "todo mês" com "Já tenho", só a primeira fatura.
  Mudar uma de todo mês numa fatura depois da primeira (novo trecho) mantém as marcas: vale a do trecho que cobre a
  fatura.
- **Editar:** mudar para Casa tira a marca (compra; de todo mês: o trecho que passa a ser da Casa fica sem
  marcas). Mudar de fatura mantém a marca. Editar parcela "desta em diante" não mexe na marca de nenhuma.
- **De quem é:** para cada `para` que não é Casa: total, já tenho (soma das marcadas), falta (total − já tenho).
- **Cofrinho deve ter** (por cartão): soma do "já tenho" das faturas que ainda não venceram (vencimento ≥ hoje: a
  fatura conta até o dia do vencimento, inclusive). Separado por fatura, da mais antiga para a mais nova.
- **Quem ainda te deve** (por cartão): compras e de todo mês sem marca, para alguém que não é a Casa nem a dona do
  cartão, de faturas desde dezembro de 2026 até a fatura aberta (as futuras ainda não foram cobradas). Por pessoa,
  na ordem do "De quem é", com o total e as compras (fatura, data ou "todo mês", valor).

## Telas

- **Fatura (#/casa-cartao?cartao=…&fatura=…):** igual a hoje, mais:
  - linha da compra marcada: etiqueta amarela "Já tenho" depois do detalhe;
  - "De quem é": a Casa como hoje; cada outra linha com total, barrinha amarela (já tenho ÷ total), "Já tenho X"
    à esquerda e "Falta Y" à direita ("Já tenho tudo ✓" quando falta 0);
  - botão **Cofrinho** no fim, depois de "Todo mês" e antes de "Pronto, fatura conferida": "Deve ter R$ N" e
    "2 pessoas te devem" / "Ninguém te deve".
- **Cofrinho (#/casa-cartao?cartao=…&fatura=…&tela=cofrinho):** "‹ Voltar para a fatura"; "Deve ter no
  cofrinho R$ N" com "Confira com o saldo do cofrinho no app do banco. Se não bater, alguma compra ficou sem
  marcar."; "De quais faturas" (fatura, vencimento, valor; "Quando uma fatura vence, o valor dela sai daqui: foi
  usado para pagar."); "Quem ainda te deve" (pessoa + total; compras embaixo, tocar abre a folha da compra).
- **Folha "Anotar compra":** depois de "Para quem" e "Como foi", com uma pessoa que não é a Casa escolhida:
  interruptor "Já tenho o dinheiro" (desligado de começo), com a dica: à vista "Já guardou no cofrinho, ou a pessoa
  já te pagou."; parcelado "Vale só para a 1ª parcela (a desta fatura)."; todo mês "Vale só para a fatura de
  {mês}.". Escolher Casa desliga e esconde.
- **Folha de uma compra / de todo mês:** o mesmo interruptor (não aparece para Casa), com a dica da parcela ou da
  fatura e "Salva na hora.". Tocar salva só a marca, sem fechar a folha e sem perder o que já foi digitado nos
  outros campos; aviso "Marcado: já tenho." / "Desmarcado.".
- Perfis: cada um vê o Cofrinho dos cartões que vê; quem administra, vendo o perfil da outra pessoa, vê igual a
  ela. O cartão alheio no Mês continua só com a parte da casa.

## Dados reais (uma vez)

As 17 compras amarelas da fatura de dezembro de 2026 na aba pessoal da planilha ganham `jaTenho` no casa.json do
repositório privado: script local (lê a planilha e o casa.json, procura pelo nome e valor na fatura de dezembro do
cartão da dona da aba, respeitando repetições; avisa o que não achar). Roda depois que o app novo estiver publicado.
Nada da planilha entra no repositório público.

## Deixado para quem implementa

Nomes das funções, onde fica cada conta (núcleo testável em `js/core/cartao.js`), o amarelo nos dois temas, a
ordem exata das faturas no Cofrinho, textos curtos no mesmo tom das telas da casa.
