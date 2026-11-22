# Quem divide as contas vem dos perfis

## Por quê

Em Ajustes › Casa, "Quem divide as contas" mostrava só as duas pessoas fixas da casa. Os perfis criados em
Aparelhos e perfis nunca podiam entrar na divisão. Quem administra quer um cadastro só: criou um perfil, pode
marcá-lo para dividir; as duas pessoas de hoje são os perfis que já existem (mesmo id).

## Decisões (entrevista de 2026-11-21)

- A divisão aceita duas pessoas ou mais.
- A escolha vale para a casa toda (não conta por conta): a divisão é do mês inteiro, pela renda.
  (A entrevista recomendou "conta por conta" e "partes iguais", supondo que a divisão fosse por conta; o código
  divide o mês todo pela renda, então a regra "quem ganha mais paga mais" continua.)
- Um cadastro só: criar e renomear perfis continua em Aparelhos e perfis; a lista "Quem divide as contas"
  espelha os perfis.
- Sem redistribuir o passado escondido: entrar ou sair da divisão vale do mês em foco em diante; os meses antes
  ficam como estavam. Ficam sempre pelo menos duas pessoas dividindo (sair abaixo disso é bloqueado com aviso).

## Abordagens

1. **`casa.pessoas` continua sendo quem divide, com períodos (escolhida).** Cada pessoa ganha `dentro`
   (opcional): os períodos em que divide (`{ de?, ate? }`, `ate` exclusivo). Sem `dentro`, divide sempre (as duas
   de hoje). O resto do app, que já lê `casa.pessoas`, muda pouco; nada de versão nova do arquivo.
2. Marca `divide` nos perfis e `pessoas` derivada: exige versão 5 do arquivo e migração nos dois celulares.
3. Lista de quem divide por mês dentro de cada registro do mês: duplica dados e não cobre os meses previstos.

## Como fica

- Núcleo: `divideNoMes(pessoa, mes)`, `pessoasNoMes(casa, mes)`; `resumoDoMes` divide entre quem divide no mês.
  `entrarNaDivisao` / `sairDaDivisao` (perfis.js) mexem nos períodos; desfazer no mesmo mês apaga o período.
  O resumo do ano junta cada pessoa pelo id (não pela posição).
- Ajustes › Casa: quem administra vê todos os perfis, na ordem deles, cada um com uma marca de selecionar; tocar
  marca ou desmarca e salva na hora (do mês em foco em diante). O nome não se muda aqui: nomes e perfis novos ficam
  em Aparelhos e perfis (pedido do usuário, versão 82). Quem não administra vê só quem divide, sem mexer.
- Mês: um card "X paga" por pessoa; com número ímpar de cards, o último ocupa a linha inteira; terceira cor.
- Balanço sem perfis: os chips são de quem divide no mês.
