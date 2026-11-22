# Carteira: a aba do plano como os apps de investimento consagrados

## Por quê

O controle mensal das contas e do cartão evoluiu; a parte dos investimentos ficou pobre. A aba Plano mostra a
meta (anel da renda plena, marcos) e um "Ver detalhes", mas não mostra a carteira: quanto há em cada investimento,
quanto foi aplicado, quanto rendeu, como está a divisão contra a meta, a evolução e os proventos. Os investimentos
só aparecem como caixas de seleção nos Ajustes do plano. O usuário pediu para se inspirar em carteiras consagradas
(Kinvo, Investidor10, Status Invest, a área de investimentos dos bancos digitais), seguir o recomendado e a melhor
UX, e autorizou mudar a aba Plano.

## O que os apps consagrados têm em comum (e entra aqui)

1. Um número principal: o patrimônio total, com o ganho ao lado.
2. Três vistas em abas no topo: **Resumo**, **Ativos** e **Proventos**.
3. Resumo: evolução do patrimônio contra o total aplicado, a divisão por classe contra a meta (rebalanceamento) e a
   meta de longo prazo.
4. Ativos: lista agrupada por classe; cada ativo com saldo, fatia da carteira e ganho; tocar abre o detalhe do ativo
   (posição, aplicado, ganho, cotas, histórico) com a ação de atualizar o saldo.
5. Proventos: colunas mês a mês, total de 12 meses, média por mês e rendimento (yield).

## Decisões (todas as recomendadas; o usuário autorizou)

- A aba "Plano" vira **"Carteira"** (mesmo endereço `#/inicio`, mesmo ícone). Fora da visão única, o menu continua
  "Início", com a mesma tela.
- Abas no topo da tela (controle segmentado): Resumo · Ativos · Proventos. A aba fica no endereço (`?aba=`) com
  `location.replace`: trocar de aba não entra no histórico.
- **Sem cotações automáticas.** Os saldos continuam sendo copiados da corretora no Dia de pagamento (ou no detalhe
  do ativo). Buscar cotações mandaria a lista dos investimentos para um serviço de fora, pediria chave e falharia
  fora do horário do pregão: vai contra a privacidade que o usuário preza. Fica para quando ele pedir.
- **Proventos só no total do mês**, como hoje (o Dia de pagamento pede um valor só). Proventos por ativo ficam fora.
- **Valores da carteira em reais do dia (nominais)**, como a corretora mostra, para o usuário conferir com o extrato.
  A meta (renda plena) continua em "reais de hoje", como sempre; o cartão da meta diz quanto conta para ela.
- O cadastro dos investimentos sai dos Ajustes do plano e vai para Carteira › Ativos (adicionar, editar, tirar). A
  carteira-alvo (os percentuais) continua nos Ajustes do plano, com um atalho a partir da divisão por classe.

## Abordagens

1. **Reorganizar a aba em Resumo · Ativos · Proventos, com o detalhe do ativo numa folha (escolhida).** É o padrão
   de mercado e reaproveita o motor (metas, projeção) e os dados que já existem (saldos, aportes, proventos).
2. Uma tela nova "Carteira" no menu Mais, deixando o Plano como está: a carteira fica escondida a dois toques e o
   Plano continua pobre.
3. Uma página longa sem abas: mistura meta, lista de ativos e proventos numa rolagem só; difícil achar as coisas.

## Como fica

### Topo (as três abas)
Cartão principal (degradê, como nas outras abas): **Total investido** (todos os investimentos, menos o FGTS, que é só
informativo), o ganho desde o primeiro saldo ("+R$ 3.210 (2,8%)"), e a data da última atualização dos saldos, com
"Atualizar saldos" (abre a folha que já existe no Dia de pagamento).

### Resumo
- **Sua meta**: o anel da renda plena (menor), "faltam X anos", "você já juntou R$ X de R$ Y" e os três marcos.
- **Dia de pagamento** (o cartão que já existe).
- **Evolução**: linha do patrimônio com área suave, e o total aplicado em linha cinza; filtro 6M · 1A · Tudo; toque
  mostra o mês e os dois valores. Com menos de 2 meses, explica que o gráfico aparece depois.
- **Divisão da carteira**: barra fina segmentada pelas quatro classes e, embaixo, uma linha por classe com a cor, o
  nome, o atual (%) e a meta, uma barra com a marca da meta e "abaixo da meta: o próximo aporte vai para cá". Reserva,
  caixa e fora do plano aparecem à parte ("Fora da carteira"). Atalho "Mudar a meta" para os Ajustes do plano.
- **Projeção e check-up**: o "Ver detalhes" de hoje (gráfico até a renda plena e o check-up), recolhido.

### Ativos
- Grupos na ordem: Renda fixa, Fundos imobiliários, Ações BR, Exterior, Reserva de emergência, Caixa de oportunidade,
  Fora do plano, FGTS. Cabeçalho do grupo com o total e a fatia; cada ativo com um selo colorido (iniciais), o nome,
  "N cotas · atualizado em dd/mm" e, à direita, o saldo e o ganho em %.
- "+ Adicionar investimento" (folha: nome, onde ele entra em botões grandes com exemplo, saldo de hoje e cotas).
- Folha do ativo: saldo, aplicado, ganho (R$ e %), cotas e valor da cota; "Atualizar saldo" (valor e cotas) ali
  mesmo; o histórico (saldos e aportes); "Editar" (nome e onde entra) e "Tirar este investimento" (dois toques).

### Proventos
- Três números: por mês (média, a mesma do motor), últimos 12 meses e rendimento de 12 meses sobre a carteira.
- Colunas dos últimos 12 meses (uma cor só; toque mostra o valor); tabela por baixo.
- A barra "rumo ao custo de vida e ao salário" que hoje está no Início.

### Cores
Classes em ordem fixa (validado com o script do dataviz nos dois temas): Renda fixa azul, Fundos imobiliários
laranja, Ações BR verde-água, Exterior amarelo (claro `#2a78d6 #eb6834 #1baf7a #eda100`; escuro `#3987e5 #d95926
#199e70 #c98500`). Reserva, caixa, fora do plano e FGTS em cinza. Texto nunca na cor da série; nomes sempre ao lado.

## Regras de cálculo (núcleo `js/core/carteira.js`, testado)

- Saldo de um ativo = último saldo digitado + aportes com data >= a dele (a mesma regra do motor, sem estimar
  rendimento). Sem saldo: a soma dos aportes.
- Aplicado = primeiro saldo digitado + aportes com data >= a dele (o que veio antes já está no primeiro saldo). Sem
  saldo: a soma dos aportes.
- Ganho = saldo − aplicado; % sobre o aplicado. Com um saldo só, não há ganho para mostrar ("—").
- Cotas = cotas do último saldo + cotas dos aportes depois; valor da cota = valor ÷ cotas do último saldo.
- Evolução: fim de cada mês, do primeiro mês com saldo ou aporte até hoje.
- Proventos: o campo `proventos` de cada mês registrado.

## Fora deste trabalho
Cotações automáticas, proventos por ativo, preço médio por cota, comparação com CDI/Ibovespa (não há séries desses
índices no app), importação de notas de corretagem.
