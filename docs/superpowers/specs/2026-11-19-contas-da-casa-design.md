# Contas da casa — desenho

Data: 2026-11-19. O usuário delegou todas as decisões ("tome todas as decisões, não precisa me consultar") e pediu para publicar no fim.

## Por quê

Hoje o casal controla as contas da casa numa planilha do Excel (uma aba por ano). As contas do mês são divididas entre os dois **em proporção à renda**: quem ganha mais paga mais, e cada um paga a mesma fatia do próprio salário. O usuário quer esse controle **dentro do app, separado do planejador de aposentadoria**, com a tela mais fácil possível, porque a outra pessoa que vai usar tem receio de coisas complicadas.

## Como a planilha funciona (o que o app reproduz)

- Uma linha por mês. À esquerda ficam as contas (condomínio, água, luz, carro, cartão da casa, faxina, IPTU...) e o total. À direita, o salário de cada um.
- `% = salário ÷ (soma dos salários)`, `à pagar = total das contas × %` e `sobra = salário − à pagar`.
- Resumo do ano por pessoa: média e total do "à pagar", média da sobra, média do salário, a fatia da renda que vai para as contas e o peso de cada conta.
- Uma aba detalha o **cartão da casa**: as compras do mês, algumas parceladas ("[6x]"). O total do mês de compras vira a conta do cartão no **mês seguinte** (o mês em que a fatura é paga).
- Ela tem defeitos que o app não copia: `#REF!` no peso das contas, peso calculado só sobre parte das colunas e média de salário puxada para baixo por um mês com salário 0 digitado.

## Objetivos

1. Um **espaço "Contas da casa"** separado da aposentadoria, com menu próprio (**Mês**, **Ano**, **Ajustes**).
2. **Mês:** total das contas, quanto cada um paga e quanto sobra, a lista das contas e os dois salários. Tocar em qualquer valor abre uma folha com um campo só.
3. **Cartão da casa compra por compra:** anotar compras, inclusive parceladas (as parcelas aparecem sozinhas nos meses seguintes).
4. **Previsão:** um mês novo já mostra o total previsto com os últimos valores conhecidos, marcados "a confirmar", até alguém digitar o valor de verdade.
5. **Ano:** o resumo da planilha, sem os defeitos dela.
6. **Ajustes:** nomes das duas pessoas, contas (criar, renomear, ordenar, "não uso mais", compra por compra), sincronização e o caminho de volta para a aposentadoria.
7. **Histórico importado da planilha** (2021 a novembro de 2026, mais as compras parceladas já lançadas), para o app abrir com os mesmos números.
8. Funcionar no celular da outra pessoa: ela usa o mesmo app e só vê as contas da casa.

## Não objetivos

- A aba de gastos pessoais de uma das pessoas e o quadro de investimentos dela: o usuário mandou ignorar por enquanto.
- Mais de duas pessoas na divisão.
- Outras formas de dividir (meio a meio, valor fixo). A regra é a da planilha: proporcional à renda.
- Mudar o planejador de aposentadoria, o `dados.json` ou o app Android (o APK carrega o site; não precisa de APK novo).

## Anti-objetivos (seria fracasso mesmo funcionando)

- A outra pessoa abrir o app e cair em telas de aposentadoria, termos de investimento ou tabelas.
- Um valor digitado sumir porque outro aparelho gravou ao mesmo tempo.
- Dados pessoais no repositório público (código, testes, capturas).

## Restrições

- JavaScript puro em módulos, sem bibliotecas nem build. Elementos com `h()` e os componentes de `js/ui/dom.js`. Cores pelos tokens de `css/app.css`, nos temas claro e escuro, em celular de 412 px.
- Lógica pura em `js/core/` com testes `node --test`.
- Os dados ficam no repositório privado `Projeto_R-dados`, com a mesma chave do GitHub do app.
- `sw.js`: subir `VERSAO` (v6, igual a `js/versao.js`) e incluir os arquivos novos na casca, ou o celular continua com a versão antiga.
- Botão voltar do Android fecha a folha aberta (a folha vem do hash, como na aba Mês).

## Abordagens consideradas

1. **Arquivo próprio `casa.json` no mesmo repositório privado (escolhida).** O espaço da casa tem estado, cópia local e sincronização próprios, reaproveitando o armazém e o cliente do GitHub com outro caminho. Não mexe no `dados.json` nem nas migrações da aposentadoria. O celular da outra pessoa abre as contas sem precisar do assistente de aposentadoria.
2. **Uma chave `casa` dentro do `dados.json`.** Menos código, mas exige migração do esquema da aposentadoria, mistura dados que o usuário pediu para separar e obriga o celular da outra pessoa a ter um plano de aposentadoria para abrir o app.
3. **Um app separado (outro site ou APK).** Separação total, mas duplica conexão, atualização, service worker e APK, e o usuário teria de instalar outro app.

## Desenho

### Dados (`casa.json`, `schemaVersion: 1`)

```
{
  schemaVersion: 1,
  pessoas: [{ id: 'p1', nome }, { id: 'p2', nome }],            // sempre duas
  contas:  [{ id, nome, compraPorCompra: bool, arquivada: bool }], // a ordem do array é a ordem na tela
  meses:   [{ mes: 'AAAA-MM',
              salarios: { [pessoaId]: número },
              valores:  { [contaId]: número },                      // valor digitado = confirmado
              compras:  [{ id, contaId, nome, valor, grupo?: id, parcela?: { n, de } }] }]
}
```

- O **mês** é o mês em que as contas são pagas. As compras do cartão ficam na fatura do mês em que ela é paga.
- **Valor de uma conta no mês:**
  - cartão (compra por compra) com compras no mês: a soma das compras;
  - senão, o valor digitado;
  - senão, a **previsão**: o último valor conhecido de um mês anterior, marcado "a confirmar";
  - conta "que não uso mais" (arquivada) nunca é prevista: só aparece com valor digitado diferente de zero.
- **Confirmado:** tem valor digitado no mês. No cartão, "Pronto, fatura conferida" grava a soma das compras como valor digitado; anotar ou apagar compra depois atualiza esse valor.
- **Salário no mês:** o digitado, senão o último conhecido ("a confirmar").
- **Divisão:** com a renda dos dois maior que zero, `fatia = salário ÷ renda`; a primeira pessoa paga `total × fatia` arredondado em centavos, a segunda paga o resto (as duas partes somam o total exato); `sobra = salário − paga`. Sem renda, não divide e pede os salários.
- **Parcelas:** anotar uma compra em N vezes cria uma compra em cada um dos N meses (`grupo` igual, `parcela: { n, de: N }`). Apagar uma compra apaga também as parcelas seguintes do mesmo grupo.
- **Resumo do ano:** meses do primeiro mês com dados até o mês atual (meses futuros ficam fora). Total e média das contas, renda, fatia da renda que foi para as contas, e por pessoa: total pago, média paga, média da sobra e média do salário. O peso de cada conta é calculado sobre o total de todas as contas.
- **Mescla entre aparelhos:** mescla em 3 vias campo a campo (listas por `id` ou `mes`). Duas pessoas mexendo em contas diferentes do mesmo mês não perdem nada.

### Sincronização e espaços

- `criarArmazem` ganha `prefixo`, `migrar` e `mesclar` como opções (os padrões continuam os da aposentadoria). A casa usa o prefixo `projetoR.casa`, o cliente do GitHub com `caminho: 'casa.json'` e a mescla própria.
- O `app.js` carrega a casa junto com a aposentadoria (local na hora, GitHub em segundo plano), conecta as duas ao conectar e reenvia as duas quando a internet volta.
- **Espaço lembrado por aparelho** (`projetoR.espaco`): abrir o app sem rota leva ao último espaço usado. O celular da outra pessoa sempre abre nas contas da casa.
- Rotas novas: `casa` (Mês), `casa-ano` e `casa-ajustes`. Elas funcionam sem plano de aposentadoria. As rotas da aposentadoria sem plano continuam levando ao assistente.
- Dois menus no rodapé: o da aposentadoria (Início, Mês, Simular, Mais) e o da casa (Mês, Ano, Ajustes). Aparece o do espaço atual.
- Entradas: **Mais › Contas da casa** na aposentadoria. **Ajustes da casa › Planejador de aposentadoria** na volta. No assistente de primeiro uso, um atalho "Só quer as contas da casa?".

### Telas (texto simples, sem jargão)

**Mês (`#/casa?mes=AAAA-MM`)**

```
 ‹   Novembro de 2026   ›
┌──────────────────────────────┐
│ CONTAS DA CASA               │
│ R$ 2.913,29                  │
│ 3 valores a confirmar        │
└──────────────────────────────┘
┌─────────────┐ ┌─────────────┐
│ Ana paga    │ │ Leo paga    │
│ R$ 1.881,50 │ │ R$ 1.031,79 │
│ sobra 4.318 │ │ sobra 2.368 │
└─────────────┘ └─────────────┘
 Quem ganha mais paga mais: cada um paga 30% do que ganha.
┌ Contas ──────────────────────┐
│ Condomínio        R$ 520,00 ›│
│ Luz   a confirmar R$ 176,34 ›│
│ Cartão da casa 4 compras  789›│
│ Ver 1 conta sem valor        │
└──────────────────────────────┘
┌ Salários ────────────────────┐
│ Ana             R$ 6.200,00 ›│
│ Leo             R$ 3.400,00 ›│
└──────────────────────────────┘
```

- **Folha de uma conta:** "Luz de novembro", um campo grande, a dica "Em outubro: R$ 176,34", Salvar e Cancelar. Com valor digitado, um link "Tirar o valor deste mês" volta para a previsão.
- **Folha do cartão:** total, a lista de compras ("2 de 6" nas parceladas, × para apagar), "Anotar uma compra" (o que foi, valor de cada parcela e o número de parcelas com − e +), "Pronto, fatura conferida" e "Fechar". Sem compras, há também "Digitar só o total da fatura" (serve para os meses importados).
- **Folha do salário:** "Salário de Ana em novembro", um campo, a dica com o mês anterior.
- Mês sem nenhum dado antes (primeiro uso): a tela de começo pede os dois nomes. Se o aparelho ainda não está conectado, oferece conectar com a chave do GitHub, para ver as mesmas contas do outro celular.

**Ano (`#/casa-ano?ano=AAAA`)**

- ‹ 2026 › e "até novembro" no ano corrente.
- Cartão: contas no ano, média por mês e "X% da renda dos dois foi para as contas".
- Um cartão por pessoa: pagou no ano, média por mês e sobra média por mês.
- "Mês a mês": uma linha por mês com o total e uma barra. Tocar abre o mês.
- "Para onde foi o dinheiro": cada conta com o total, uma barra e o %.

**Ajustes da casa (`#/casa-ajustes`)**

- Quem divide as contas: os dois nomes.
- Contas: nome editável, compra por compra, subir e descer, "Não uso mais". Abaixo, as contas que não usa mais, com "Voltar a usar", e "Adicionar conta".
- Sincronização: estado da conexão e, se não estiver conectado, os campos para conectar.
- "Ir para o planejador de aposentadoria".
- "Como a divisão funciona", em duas frases.

### Importação da planilha (uma vez)

- `scripts/importar-planilha.mjs <planilha.xlsx> <saida.json> [--hoje AAAA-MM-DD]` lê o xlsx (zip + XML, sem bibliotecas) e gera o `casa.json`.
  - **Abas de ano até o ano atual.** A de 2027 é uma cópia de 2026 ainda não preenchida e fica fora. A previsão do app faz esse papel.
  - **Cabeçalhos da linha 3:** as contas ficam entre a coluna C e "Total", e as pessoas são os nomes com "Salario" logo abaixo.
  - **Nomes:** "Apê" e "Apartamento" viram a mesma conta. Nomes todos em maiúsculas com mais de 4 letras viram "Primeira Maiúscula" (siglas como IPTU continuam).
  - **Contas ativas e arquivadas:** as que aparecem na aba mais recente ficam ativas. As outras ficam como "não uso mais".
  - **Mês com algum salário (mês real):** todos os valores entram, inclusive zero, e as contas ativas que não existiam naquela aba entram como 0, para a previsão não inventar valor no passado. Salários maiores que zero entram.
  - **Mês sem salário (dezembro de 2026, ainda previsto):** só entram os valores diferentes de zero, menos o do cartão quando há compras anotadas.
  - **Aba de compras do cartão** (meses na linha 1 e itens na coluna B): a coluna de um mês de compras vira a fatura do mês seguinte, e o ano é inferido pelo mês atual. Itens com o mesmo nome em colunas seguidas formam um grupo de parcelas. O total da primeira coluna é conferido com o valor da conta no mês da fatura e, se não bater, o script avisa.
- O arquivo gerado vai direto para o repositório privado (via `gh`), **antes** de publicar o app. Nada da planilha entra no repositório público. Os testes usam uma planilha falsa montada no próprio teste.

## Decisões que tomei (o usuário delegou)

- Nome do espaço: "Contas da casa". Menu da casa com 3 botões: Mês, Ano e Ajustes.
- "a confirmar" em vez de "previsto" ou "estimado", por ser mais claro para quem não é da área.
- Cada valor salva ao tocar em Salvar, sem "fechar o mês". A planilha também não tem isso.
- Contas com valor zero no mês ficam recolhidas em "Ver N contas sem valor", para a lista mostrar só o que importa.
- Sem apagar contas, só "não uso mais", para não perder o histórico.
- Conexão do celular da outra pessoa: a mesma do app (uma chave do GitHub por aparelho, criada pelo usuário).

## Para quem for construir

- O texto exato dos rótulos segue este documento. O resto do tom segue as telas atuais.
- Conferência visual com `node scripts/capturar-telas.mjs <pasta> --rotas casa,casa-ano,casa-ajustes --local <arquivo>`, com dados inventados da casa em `projetoR.casa.estado`.
