# Cartão (dentro das Contas da casa) — desenho

Data: 2026-11-19. O usuário delegou todas as decisões ("pode seguir o recomendado sempre e não precisa me perguntar nada").
Exemplos com nomes e valores INVENTADOS (o repositório é público): Ana é a dona do cartão, Leo divide a casa com ela,
Mãe e Tio são outras pessoas para quem Ana compra.

## Por quê

A Ana usa **um cartão só** para ela, para a casa e para compras de outras pessoas. Hoje ela anota cada compra na planilha,
em duas abas: uma "da casa" (por mês da compra) e uma pessoal (por mês da fatura, com grupos: fixas, assinaturas,
parcelas e um grupo por pessoa). Ela precisa:

1. anotar cada compra quando compra, só com a **data** (o app descobre a fatura sozinho);
2. separar o que é dela, da casa e de cada outra pessoa;
3. saber **quanto é de cada pessoa** em cada fatura;
4. que a parte da casa entre sozinha nas contas da casa (a conta do cartão no mês da fatura).

Pensar como quem preenche a planilha todo mês: anotar compra por compra não é problema; o que dá para cortar é
redigitar assinaturas todo mês, contar parcelas, descobrir a fatura, somar por pessoa e copiar o total da casa.

## Objetivos

- Aba **Cartão** no menu da casa (Mês · Cartão · Ano · Ajustes).
- Configurar uma vez: de quem é o cartão, **melhor dia de compra** (o dia em que o cartão "vira") e **dia do vencimento**.
- Anotar compra: o que foi, valor, data (hoje por padrão), para quem, e se foi à vista, parcelada ou "todo mês".
- Ver cada fatura: total, quanto é de cada pessoa (a parte da casa "entra nas contas da casa"; a das outras pessoas
  "a devolver"), a lista de compras e as de todo mês.
- Corrigir ou apagar uma compra; mudar de fatura quando o banco colocou a compra em outra.
- Importar da planilha a aba pessoal e a aba da casa (faturas abertas e futuras, parcelas e assinaturas).

## Fora do escopo

- Mais de um cartão; marcar "já recebi" de cada pessoa; o quadro de investimentos/reembolso da aba pessoal.
- Dividir uma compra entre duas pessoas (anota-se duas compras).

## Anti-objetivos

- Tela complicada: nada de jargão, um botão grande "Anotar compra", poucas escolhas por vez.
- Compra caindo em fatura errada sem a Ana ver: o formulário diz "Vai para a fatura de dezembro".
- Mudar o passado: trocar o melhor dia de compra não move compras já anotadas.

## Abordagens

1. **Compras no casa.json, junto das compras do cartão da casa (escolhida).** Cada compra ganha `data` e `para`;
   a conta do cartão da casa soma só o que é `para: 'casa'`. Assinaturas ("todo mês") ficam numa lista própria no cartão.
   Reaproveita armazém, mescla de 3 vias, parcelas e telas; a parte da casa entra nas contas sem cópia.
2. Arquivo `cartao.json` separado. Isola as compras pessoais, mas pede outro armazém e uma ponte para levar a parte da
   casa às contas. A chave do GitHub dá acesso ao repositório inteiro de qualquer jeito: não protege nada a mais.
3. Calcular a fatura na hora (guardar só a data). Trocar o melhor dia de compra embaralharia faturas já pagas.

## Modelo (casa.json, schemaVersion 2)

```
cartao: null | {
  donaId: 'p1' | 'p2' | null,     // de quem é o cartão
  viraNoDia: 1..31 | null,        // melhor dia de compra: compra nesse dia ou depois cai na fatura seguinte
  venceNoDia: 1..31 | null,
  contaId,                        // conta da casa (compra por compra) que recebe a parte da casa
  pessoas: [{ id, nome, arquivada? }],                         // outras pessoas (Mãe, Tio)
  fixas: [{ id, nome, valor, para, desde: 'AAAA-MM', ate?: 'AAAA-MM' }],   // "todo mês"
}
compra (em meses[fatura].compras): { id, contaId, nome, valor, grupo?, parcela?, data?: 'AAAA-MM-DD', para? }
```

- `para`: `'casa'`, `'p1'`, `'p2'` ou o id de uma outra pessoa. Sem `para` = casa (compras antigas).
- A compra é guardada no mês da **fatura** (o mês em que é paga), como as compras do cartão da casa já eram.
- Migração v1 → v2: acrescenta `cartao: null`. App antigo recusa v2 (`versao-desconhecida`) em vez de somar compras
  pessoais nas contas da casa; a atualização automática resolve.

## Regras

- **Fatura de uma compra** (dia D do mês M; V = melhor dia, limitado ao tamanho do mês; T = vencimento):
  o ciclo fecha em M se D < V, senão em M+1; a fatura é o mês do fechamento se T ≥ V, senão o mês seguinte.
  Ex.: V=3, T=10: 19/11 → dezembro; 2/11 → novembro. V=26, T=5: 19/11 → dezembro; 27/11 → janeiro.
- **Período** mostrado: "compras de 3/11 a 2/12 · vence 10/12".
- **Fatura aberta** = a fatura de hoje. A tela abre nela.
- **Parcelada:** valor de cada parcela; parcelas seguintes nos meses seguintes (como já era), cada uma com a data da compra.
- **Todo mês:** aparece em toda fatura desde a primeira até ser parada. Mudar o valor numa fatura depois da primeira
  fecha a antiga no mês anterior e começa uma nova (o passado não muda). Parar = some desta fatura em diante.
- **Conta da casa:** a conta ligada ao cartão soma as compras `para: 'casa'` e as de todo mês da casa. Mês sem nada
  da casa continua com a previsão de antes. "Pronto, fatura conferida" continua valendo (marca o valor como certo).
- **Quanto é de cada um:** soma por `para`, na ordem Casa, dona, a outra pessoa da casa, outras pessoas.
- **Editar:** compra à vista muda tudo (data nova recalcula a fatura; dá para mudar a fatura à mão). Parcela muda
  nome, valor e para quem desta parcela em diante. Todo mês muda desta fatura em diante.
- **Sugestões:** "O que foi" sugere nomes já usados; escolher um nome conhecido marca para quem foi da última vez.
  Para quem não tem padrão escondido: sem escolha, o app pede.

## Telas

- **Cartão (#/casa-cartao?fatura=AAAA-MM):** sem configuração, só o cartão "Configurar o cartão" (de quem é, melhor
  dia de compra, vencimento; a conta da casa é escolhida sozinha quando só há uma). Configurado:
  ‹ Fatura de dezembro › · período · botão grande "+ Anotar compra" · total da fatura com selo · "De quem é" ·
  "Compras" (mais nova primeiro: data, para quem, "2 de 6") · "Todo mês" · "Pronto, fatura conferida".
  As setas vão da primeira fatura com compras (ou a aberta) até 12 meses depois.
- **Folha "Anotar compra":** O que foi · Valor · Data · "Vai para a fatura de dezembro" · Para quem (chips, com
  "+ Outra pessoa") · À vista / Parcelado (− 2 vezes +, total) / Todo mês · Anotar. Depois de anotar, a folha fica
  aberta e limpa para a próxima (mantém a data).
- **Folha de uma compra:** os mesmos campos preenchidos, "Mudar de fatura ‹ ›" (à vista), Salvar, Apagar (dois toques).
  Todo mês: "Parar de repetir a partir desta fatura" (dois toques).
- **Mês da casa:** tocar na conta ligada ao cartão abre o Cartão naquela fatura.
- **Ajustes da casa:** cartão "Cartão" com os três campos, a conta da casa e as outras pessoas (renomear, não uso mais).
- O app abre na última tela entre Mês e Cartão usada no aparelho.

## Importação da planilha

- Aba com o nome de uma das pessoas = aba pessoal (colunas = meses da **fatura**). Aba com o nome da conta do cartão =
  aba da casa (colunas = meses da **compra**: fatura no mês seguinte). Ano: o mais perto do mês atual.
- Grupos na coluna A: "fixas"/"assinaturas" e "parcelas" são da dona (na aba da casa, tudo é da casa); qualquer outro
  rótulo é uma outra pessoa (nome com inicial maiúscula).
- Valores de uma linha: só a sequência a partir do primeiro mês com valor; número com texto logo à esquerda é de um
  quadro ao lado, não da linha.
- "[Nx]" no nome = parcelas, numeradas a partir do fim (a última coluna com valor é a parcela N). Grupos fixas/
  assinaturas, ou linha que vai até a última coluna da aba = todo mês (valor que muda abre um novo trecho).
  Outra sequência = parcelas 1 a N. Valor só num mês = compra à vista (sem data).
- Sobre um casa.json existente: substitui as compras da conta do cartão a partir da primeira fatura importada,
  confere com o valor digitado do mês (avisa se não bater) e tira o valor digitado dos meses ainda previstos.
- Os dois dias do cartão não estão na planilha: o app pede na primeira vez.

## Deixado para quem implementa

Nomes de funções, estilo dos chips e da lista, textos de ajuda curtos no mesmo tom das telas da casa.

## Vários cartões (adendo, versão 8)

Cada pessoa da casa tem o seu cartão (a Ana anota o dela com o que veio da planilha; o Leo começa o dele do
zero). O usuário escolheu "de quem é o cartão" esperando criar o próprio e caiu no cartão da outra pessoa.

- **Modelo (schemaVersion 3):** `cartoes: [{ id, contaId, donaId, viraNoDia, venceNoDia, fixas }]`, com
  `id === contaId` (um cartão por conta da casa; a migração fica igual nos dois celulares, e a mescla junta
  cartão por cartão) e `outrasPessoas: [{ id, nome, arquivada? }]`, valendo para todos os cartões.
  Migração 2 → 3: o `cartao` vira o primeiro da lista e as `pessoas` dele viram `outrasPessoas`.
- **Cartão novo:** de quem é, nome (como aparece nas contas da casa; padrão "Cartão Leo"), os dois dias. Cria a
  conta compra por compra com esse nome. O primeiro cartão de uma casa sem cartões continua ligado à conta
  compra por compra que já existe (se houver só uma).
- **Tela do Cartão (#/casa-cartao?cartao=<id>&fatura=…):** com dois ou mais cartões, botões no topo para
  trocar (o nome de quem é o cartão; o nome da conta se a pessoa tiver mais de um). Cada aparelho lembra o
  último cartão aberto. "Adicionar outro cartão" no fim da tela e nos Ajustes.
- **Ajustes:** um bloco por cartão (de quem é, dias) e "Tirar este cartão" só para cartão sem compras.
- **Mês da casa:** cada conta ligada a um cartão abre aquele cartão.
- **Correção dos dados reais (uma vez):** o cartão importado volta a ser da dona da aba pessoal, sem os dias
  (que eram do outro cartão); o outro cartão é criado no app.
