# Contas pessoais

## Por quê

Toda conta da aba Contas é da casa e é dividida pela renda. Quem administra tem uma conta só dele, que se repete
todo mês e não passa pelo cartão (um empréstimo). Cadastrada como conta da casa, a outra pessoa pagaria uma parte;
sem cadastrar, ela fica fora do Balanço, a sobra aparece maior do que é e o Dia de pagamento manda investir o
dinheiro da parcela.

## Decisões (entrevista de 2026-11-22; o usuário aceitou todas as recomendações)

- Q1. Qualquer perfil pode ter contas pessoais; cada um vê só as próprias (como os cartões). Quem administra vê as
  da outra pessoa ao trocar para o perfil dela. A separação é só no app (os dados ficam no mesmo arquivo).
- Q2. Na aba Contas, o quadro de cima continua só da casa. Abaixo da lista "Contas" entra a lista "Contas
  pessoais", com o total no título e "+ Adicionar conta pessoal" no fim. Tocar abre a folha do valor (Salvar, Pago).
- Q3. Entram no Balanço, em "Saiu" (linha "Contas pessoais"): diminuem a sobra e o que o Dia de pagamento investe.
- Q4. Ao criar, dá para dizer quantas parcelas faltam (opcional). O app mostra "faltam N parcelas", para de prever
  depois da última, e a conta com fim não entra no custo de vida do plano. As sem fim (academia, celular) entram.
- Q5. Só "um valor por mês" (compra por compra é o cartão).
- Q6. Têm o botão "Pago" e contam para o "Tudo pago" (mês fechado, mês em foco) de quem é dono.
- Q7. A aba Ano continua só da casa. Em Ajustes, uma lista "Contas pessoais" para renomear, mudar a ordem, mudar as
  parcelas e parar de usar. Uma conta não troca entre casa e pessoal depois de criada.

## Abordagens

1. **Lista própria `casa.contasPessoais`, valores em `meses[].valores` (escolhida).** Tudo o que é da casa
   (`resumoDoMes`, Ano, média, divisão, marcas das contas da casa) continua lendo só `casa.contas`: nada da casa
   muda. Um app antigo aberto noutro celular ignora a lista nova (não divide uma conta pessoal) e preserva os
   valores (`comMes` guarda `valores` inteiro; a mescla em 3 vias junta listas com `id`). Sem versão nova do arquivo.
2. `donoId` dentro de `casa.contas`: cada leitor de `casa.contas` teria de filtrar, e um app antigo dividiria a
   conta pessoal entre os dois.
3. Mapa à parte para os valores (`casa.pessoais[mes][id]`, como `extras`): repetiria a previsão e o salvar que
   `meses[].valores` já dá.

## Como fica

Dados (sem versão nova do arquivo):

```
contasPessoais: [{ id, nome, donoId, arquivada, desde: 'AAAA-MM', ultimoMes?: 'AAAA-MM' }]
meses[].valores[id]   valor confirmado do mês (o mesmo lugar das contas da casa)
pagamentos[mes][id]   "Pago" (a marca é o id da conta)
```

- `desde`: o mês em que a conta foi criada (ou voltou a ser usada). Antes dele, a conta não aparece nem é prevista
  (um valor confirmado sempre aparece).
- `ultimoMes`: a última parcela (incluída). Depois dele, não aparece nem é prevista. Sem ele, a conta não tem fim.
- Valor: confirmado = digitado no mês; sem ele, previsão "a confirmar" pelo último valor confirmado antes do mês
  (como as contas da casa). Arquivada: só os valores confirmados.
- "Pago" numa conta pessoal "a confirmar" também confirma o valor previsto (a parcela fixa não precisa ser
  redigitada todo mês). Escolha do executor: nas contas da casa o "Pago" continua só marcando.

Núcleo `js/core/contas-pessoais.js`: `contasPessoaisDe`, `valorDaContaPessoal`, `faltamParcelas`,
`contasPessoaisDoMes` (contas com valor, sem valor, total, quantas a confirmar), `adicionarContaPessoal` (com o
valor do mês, opcional), `editarContaPessoal`, `moverContaPessoal`, `confirmarPrevisao`, `ultimoMesDasParcelas`.

- Balanço: `b.pessoais` (total, a confirmar, contas); `saiu` soma o total; um valor a confirmar põe o selo
  "Previsão". A linha "Contas pessoais" leva à aba Contas.
- Custo de vida do plano: soma as contas pessoais sem fim de cada mês fechado (`pessoais`); o Orçamento mostra a
  parte "Contas pessoais" quando houver e diz que conta com fim não entra.
- "Tudo pago" (`tudoPago`, e com ele o mês fechado e o mês em foco): inclui as contas pessoais do dono com valor no
  mês. O selo "Pago" das contas da casa no Balanço (`contasPagas`) continua só da casa.
- Perfil com conta pessoal não pode ser apagado.
- Aba Contas: a lista só aparece com perfil (aparelho sem perfil não tem dono para as contas). Linhas: nome, "Pago ✓",
  "a confirmar · igual a <mês>", "faltam N parcelas" / "última parcela", valor. Sem valor no mês: "sem valor neste
  mês". Folhas `pessoal-<id>` (valor, Salvar, Tirar o valor, Pago) e `nova-pessoal` (nome, valor do mês opcional,
  "Todo mês, sem fim" × "Tem fim" com contador de parcelas "contando a de <mês>" e "a última em <mês de ano>").
  Mês travado: as folhas não abrem (o mesmo aviso das contas da casa).
- Ajustes: lista "Contas pessoais" de quem vê (ícone, nome, "todo mês" / "até <mês de ano>") com "Adicionar conta
  pessoal"; folha com nome, fim (o mesmo contador, a partir do mês em foco), posição, "Parar de usar esta conta"
  (dois toques); "Contas pessoais que não usa mais" com "Voltar a usar" (volta do mês atual em diante).
- Versão 92 (sw.js e js/versao.js); os dois módulos novos no cache do service worker.

## Fora do escopo

- A aba Ano e a média das contas da casa (continuam só da casa).
- Contas pessoais compra por compra, valor pessoal dentro de uma conta da casa, trocar uma conta entre casa e pessoal.

## Deixado ao executor

Textos curtos, ícone (a categoria pelo nome, como nas contas da casa), ordem das linhas no Balanço (depois das contas
da casa, antes dos cartões), testes.
