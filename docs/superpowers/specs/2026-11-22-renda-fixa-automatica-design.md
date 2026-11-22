# Renda fixa com valor automático

## Por quê

Depois da cotação automática das ações (desenho 2026-11-22-cotacoes-automaticas), o usuário quer o mesmo para a renda fixa:
escolher ou descrever o investimento e o app calcular o valor, sem copiar saldo da corretora.

## Decisões (entrevista de 2026-11-22; ele pediu para seguir sempre as recomendações)

- Q1. Tesouro Direto e CDB/LCI/LCA juntos.
- Q2. Tesouro: escolhe o título numa lista e digita a quantidade de títulos (pode ser quebrada, "0,47"); o total pago é
  opcional e dá o ganho.
- Q3. CDB/LCI/LCA: o total da carteira usa o valor bruto (o número principal da corretora); a folha mostra também o
  líquido estimado (IR regressivo no CDB; LCI e LCA isentas).
- Q4. O que já está cadastrado com saldo digitado fica como está.

## Fontes (testadas em 2026-11-22)

- Tesouro: o arquivo público `PrecoTaxaTesouroDireto.csv` do Tesouro Transparente (~15 MB, todos os dias desde 2002,
  o mais novo primeiro) só libera leitura pelo site do governo (CORS restrito); a API JSON antiga do Tesouro Direto saiu
  do ar (410). Uma tarefa agendada no GitHub (`.github/workflows/tesouro.yml`, dias úteis) baixa o arquivo, guarda só os
  títulos do último dia em `dados-publicos/tesouro.json` (nome, tipo, vencimento, preço de venda da manhã, taxa) e grava
  no repositório público; o app lê esse arquivo do próprio site. Dados públicos, iguais para todos.
- CDI: série 12 do SGS do Banco Central (taxa diária, só dias úteis), que aceita chamadas do navegador. Guardada no aparelho.
- IPCA: a série que o app já guarda (`estado.ipca.serie`).

Nomes dos títulos: `<tipo> <ano do vencimento>` ("Tesouro IPCA+ 2035"), menos Renda+ (ano do vencimento − 19,
"Tesouro Renda+ Aposentadoria Extra 2030") e Educa+ (− 4, "Tesouro Educa+ 2026"), como o Tesouro os chama.

## Abordagens

1. **Saldo do dia gravado, como nas ações (escolhida).** Tesouro = papel automático (`compras`, `fonte: 'tesouro'`) com o
   preço vindo do `tesouro.json`; CDB/LCI/LCA = título calculado (`aplicacoes` + `rendaFixa`) cujo valor do dia sai do CDI/IPCA.
   Em ambos, ao abrir a Carteira o app grava o saldo do dia; motor, gráficos e Dia de pagamento não mudam.
2. Ler o CSV do Tesouro direto no navegador: bloqueado (CORS) e pesado (15 MB).
3. Chave paga de uma API de renda fixa: custo e chave guardada no app.

## Como fica

Dados (sem versão nova do dados.json):
- Tesouro: `ativo.fonte = 'tesouro'`, `ticker`/`nome` = nome do título, `descricao` = "vence em dd/mm/aaaa", `compras` com
  quantidade decimal e preço por título (total pago ÷ quantidade).
- CDB/LCI/LCA: `ativo.rendaFixa = { tipo: 'cdb'|'lci'|'lca'|'outro', indexador: 'cdi'|'ipca'|'pre', taxa, vencimento|null }`
  (`taxa` em fração: 1,10 = 110% do CDI; 0,06 = IPCA + 6%; 0,12 = 12% ao ano) e `ativo.aplicacoes = [{ id, data, valor }]`
  (resgate = valor negativo).
- Cálculo: por aplicação, `valor × fator(data, hoje)`. % do CDI: produto de `1 + CDI do dia × taxa` nos dias úteis em
  [data, hoje). Prefixado: `(1 + taxa)^(dias úteis/252)` (dias úteis = dias com CDI publicado). IPCA+: IPCA acumulado dos
  meses depois do mês da aplicação até o último publicado × `(1 + taxa)^(dias úteis/252)`. Aportes do Dia de pagamento
  no mesmo ativo entram como aplicações. Valor estimado (não considera taxas nem marcação a mercado de CDB).
- Líquido estimado: IR de 22,5% / 20% / 17,5% / 15% (até 180 / 360 / 720 dias / mais) sobre o ganho de cada aplicação; LCI e LCA isentas.

Telas (Carteira › Ativos › Adicionar investimento › Renda fixa e outros): três escolhas grandes —
"Tesouro Direto" (busca na lista, quantidade de títulos, total pago opcional, onde entra: Selic sugere Reserva),
"CDB, LCI ou LCA" (tipo, nome, quanto aplicou, quando, rentabilidade % do CDI / IPCA + / Prefixado com a taxa,
vencimento opcional, onde entra) e "Outro" (o formulário de saldo digitado). Folhas: Tesouro como o papel automático
("títulos" no lugar de "cotas"); CDB com bruto, aplicado, ganho, líquido estimado e "Apliquei mais / Resgatei".
O passo de saldos do Dia de pagamento e "Atualizar saldos" pulam os que se atualizam sozinhos.

## Fora do escopo

Converter os ativos antigos, debêntures/CRI/CRA com preço de mercado, cupons semestrais como provento automático, custódia da B3.
