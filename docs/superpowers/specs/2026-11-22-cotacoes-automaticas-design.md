# Carteira com cotação automática

## Por quê

Na Carteira, para uma ação ou um FII o usuário precisa copiar da corretora o saldo em reais. Ele quer só dizer
"comprei 12 ações de ITUB4" e ver o app calcular quanto vale, escolhendo o papel numa lista em vez de digitar o código.
(Ele é leigo e delegou o desenho: "faça do jeito que achar melhor".)

## Decisões (entrevista de 2026-11-22; todas as recomendações aceitas por delegação)

- Q1. Fonte: a API pública do brapi.dev, sem chave, só com o código dos papéis (nada de nome, quantidade ou valor). Testada:
  aceita consulta do navegador (CORS aberto), a lista (`/api/quote/list?search=`) devolve ações, FIIs e ETFs com o preço
  (`close`) e o tipo (`type`: stock, fund; `subType`: fii, etf), e funciona sem token. Limite do plano gratuito: 20 pedidos
  por minuto, um de cada vez. A cotação tem atraso (fechamento / ~15 min).
- Q2. A lista para escolher é a busca da própria API (código ou nome), com a classe preenchida sozinha (ação, FII, ETF → Ações BR
  ou Fundos imobiliários; o usuário pode mudar o grupo em Editar).
- Q3. Atualiza ao abrir a Carteira se a última consulta tem mais de 15 minutos; guarda no aparelho e mostra o último valor com a
  data se falhar ou estiver sem internet.
- Q4. Só os papéis novos usam o cálculo automático; os antigos continuam com saldo digitado.
- Q5. "Comprei mais" e "Vendi" (quantidade e preço pago opcional); o preço pago alimenta o ganho.

## Abordagens

1. **Gravar o saldo calculado (escolhida).** O papel automático tem `compras` (quantas cotas, a que preço). Ao abrir a
   Carteira, com a cotação do dia, o app grava um saldo do dia (`cotas × preço`, com as cotas) como qualquer outro. O motor
   do plano, o gráfico de evolução, o Dia de pagamento e a Carteira continuam lendo saldos: nada mais muda. O ganho vem do
   custo (`compras` + aportes) e não do primeiro saldo.
2. Calcular o valor só na tela, com o preço do cache: o motor e o gráfico não enxergariam o papel.
3. Guardar o preço em cada papel: mistura dado do mercado (que muda todo dia) com os dados pessoais e faz o GitHub receber
   uma gravação por consulta.

## Como fica

Dados (sem versão nova do dados.json; um app antigo ignora os campos novos):
- `ativo.compras`: `[{ id, data, cotas, preco|null }]` (cotas negativas = venda). Só os papéis automáticos têm.
- `ativo.ticker` = o código (já existia); `ativo.nome` = o código (casa com a carteira-alvo e o Dia de pagamento);
  `ativo.descricao` = o nome da empresa.
- Cotação: fica só no aparelho (`localStorage` `projetoR.cotacoes` = `{ CÓDIGO: { preco, em } }`), nunca no repositório.

Núcleo `js/core/cotacoes.js` (puro): `papelAutomatico`, `cotasDoPapel`, `custoDoPapel`, `grupoDoTipo`, `novoPapel`,
`registrarCompra`, `aplicarCotacoes`, `cotacoesAtuais` (cache velho?). Em `posicoes()`, um papel automático tem aplicado e
ganho pelo custo (só se todos os preços pagos são conhecidos).
Rede `js/dados/cotacoes-remoto.js`: `buscarSugestoes`, `buscarPreco`, `atualizarCotacoes` (um pedido por vez, para no 429).

Telas (Carteira › Ativos):
- "Adicionar investimento" abre com a busca ("Procure pelo código ou nome"), resultados com código, nome e preço; ao
  escolher: "Quantas cotas?" (obrigatória) e "Preço que pagou (opcional)", com o valor calculado na hora. O link "É outro
  tipo (Tesouro, CDB…)" mostra o formulário de antes.
- A folha de um papel automático mostra cotas, preço de hoje (com a data da cotação), valor e ganho; no lugar de "Atualizar
  o saldo" tem "Mudou a quantidade?" com Comprei mais / Vendi.
- Na folha de adicionar fica uma nota fixa: "O app pergunta o preço ao brapi.dev usando só o código do papel (ex.: ITUB4)."

## Fora do escopo

Converter os ativos antigos, gráfico de preço, dividendos automáticos, cotações em tempo real, chave própria do brapi.

## Deixado ao executor

Textos curtos, intervalo de espera entre pedidos, testes.
