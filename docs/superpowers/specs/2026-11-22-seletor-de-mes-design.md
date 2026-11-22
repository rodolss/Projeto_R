# Seletor de mês que não parece "Voltar"

## Por quê

Num teste de mesa, a pessoa tocava no "‹" do cabeçalho para voltar à tela anterior e o app voltava um mês. As
abas Balanço, Contas, Cartão e Ano tinham botões redondos grandes nas pontas, e o da esquerda ficava no canto de
cima, onde os apps põem o "Voltar". (A troca de mês já usa `location.replace`, então o voltar do celular não
volta mês: o problema era só o desenho.)

## Decisões (padrão de mercado; o usuário autorizou seguir o recomendado)

- Uma pílula no centro com setas pequenas coladas ao nome do período, como nos apps de finanças e no Google
  Agenda. Nada no canto de cima à esquerda.
- Tocar no nome abre, logo abaixo, a grade dos meses (4 × 3, com o ano e setas) para pular direto. No Ano, a
  grade mostra os anos. A grade abre na própria tela, sem folha: assim não entra no histórico e o voltar do
  celular continua saindo da tela.
- O atalho "Voltar para dezembro" vira "Ir para dezembro" ("Ir para a fatura aberta" no Cartão): a palavra
  "voltar" fica só para voltar de tela.
- Sem gesto de deslizar para trocar o mês: brigaria com o gesto de voltar do Android e trocaria o mês sem querer.

## Abordagens

1. **Pílula central com grade ao tocar no nome (escolhida).**
2. Manter as setas nas pontas, só menores e sem fundo: continua no lugar do "Voltar".
3. Só uma lista de meses rolando na horizontal (abas de meses): ocupa mais espaço e esconde o ano.

## Como fica

- `js/ui/seletor-periodo.js`: `seletorDePeriodo({ rotulo, anterior, proximo, grade, atalho })` e
  `mesesDaGrade(ano, { min, max, atual })` (pura, testada).
- As quatro abas usam o seletor no lugar de `.casa-mes`.
