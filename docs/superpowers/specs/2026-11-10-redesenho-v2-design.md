# Projeto R — Redesenho v2: "quanto falta" (design)

- **Data:** 2026-11-10
- **Status:** aprovado pelo usuário em 2026-11-10.
- **Base:** a v1 descrita em `2026-11-09-planejador-aposentadoria-design.md`. Tudo o que este documento não muda continua valendo como lá.
- **Protótipo de referência:** ramo `prototipo/redesenho-v2`, arquivo `prototipos/redesenho-v2.html` (abrir no navegador; `#d-inicio` é o Início aprovado e `#d-simular` o Simulador aprovado). As variantes A, B e C ficam lá só como registro. Todos os números do protótipo são inventados.
- **Aviso:** este repositório é público. Nenhum dado pessoal do usuário entra no código, nos testes ou nos documentos.

## 1. Intenção e o porquê

O usuário usou a v1 pela primeira vez e não a achou intuitiva. O que ele quer acompanhar é **o quanto está perto ou longe da sua "pseudo aposentadoria"**, que ele definiu como a **renda plena**: os investimentos pagando o salário inteiro. Ele é leigo em investimentos, em design e em programação.

O que o incomodou na v1, nas palavras da entrevista:
- a tela de abertura pedia "quanto caiu na sua conta" em vez de mostrar o progresso;
- havia abas demais (Mês, Painel, Orçamento, Histórico e Ajustes);
- havia números e termos demais (faixa provável, renda plena, check-up, rendimento real);
- o visual era sem graça.

O registro mensal **não** foi uma queixa: ele não se importa de lançar o mês.

Ele quer abrir o app e ver **"faltam X anos e Y meses"**, ver esse tempo **diminuir ou aumentar** conforme aporta, e ter um simulador para descobrir **quanto precisa aumentar**. Gosta de animação ("movimento cria vida e personalidade") e prefere **azul puxado para o marinho**.

Um fato que ele conhece e aceitou: começando do zero, a renda plena (300 salários) em 10 anos exige investir cerca de 2 salários por mês, o que é impossível só com o salário. Por isso o alvo de 10 anos vira uma **referência tranquila**, e o centro da tela é a contagem.

## 2. Objetivos, não-objetivos e anti-objetivos

### Objetivos
1. Abrir o app e saber, numa olhada, **quanto falta para a renda plena** (anos e meses, no ritmo atual) e se isso melhorou ou piorou desde o mês passado.
2. Ver na mesma tela os **marcos** do caminho e **quanto os investimentos já pagam** por mês.
3. Ter um **simulador** com 3 alavancas (quanto investe, salário e custo de vida) que mostre os **4 cenários de mercado ao mesmo tempo** e quanto seria preciso investir para chegar no alvo.
4. Dar ao app inteiro um **visual novo em azul-marinho, com animações**, e reduzir a navegação a **4 botões embaixo**.

### Não-objetivos
- Mudar as regras de "quanto investir e onde" além da troca da meta que o plano persegue (seção 4.2).
- Mudar as premissas padrão (retirada de 4% ao ano, rendimento real de 5% ao ano).
- Funções novas fora do que está aqui (notificações, cotações automáticas, etc.).
- Os 15 pontos menores adiados da revisão da v1 ficam fora. Só se resolvem os que somem naturalmente com o redesenho, como o "5% a.a." escrito fixo no painel, já que o painel deixa de existir e os cenários passam a usar a premissa.

### Anti-objetivos (seria um fracasso mesmo que funcionasse)
- Dar bronca: status vermelho, "atrasado" ou alarme por causa do alvo de 10 anos.
- Fingir que o alvo é viável: quando não fecha, o simulador diz isso com todas as letras.
- Mostrar **duas porcentagens de progresso diferentes** na mesma tela.
- Usar jargão sem explicação, ou números sem uma frase simples ao lado.
- Deixar o simulador alterar os dados do usuário.
- Fazer animação que atrapalhe: que atrase o uso, que ignore o pedido de "reduzir movimento" do aparelho ou que deixe a tela incompleta sem ela.
- Colocar dados pessoais no repositório público.

## 3. Restrições

- As mesmas da v1: HTML, CSS e JavaScript puros, sem build; PWA que abre sem internet; GitHub Pages; dados no repositório privado; testes com `node --test`.
- **Fontes guardadas no próprio app** (arquivos `woff2` no repositório, com a licença OFL ao lado e no cache do service worker). Nada de buscar fontes na internet com o app aberto.
- O `dados.json` que já existe (schemaVersion 1) tem que continuar abrindo, com migração automática (seção 8).
- Pensado primeiro para o celular (cerca de 400 px de largura), e funcionando bem no computador.

## 4. O que muda nas contas

### 4.1 A meta principal passa a ser a renda plena
`M2 = salário × 12 / taxa de retirada` (com 4%, são 300 salários), como já calculado na v1. A **Independência** (`M1`, ligada ao custo de vida) continua calculada, mas vira um **marco** no caminho.

### 4.2 O plano passa a mirar a renda plena
Tudo o que na v1 usava `M1` como alvo do plano passa a usar `M2`, com o mesmo prazo (`config.prazoMeses`, padrão de 120 meses a partir do início):
- o aporte necessário (`pmtNec`), que decide entre carteira e caixa de oportunidade;
- a trajetória planejada (o gráfico do plano e o "planejado para hoje").

Consequência aceita pelo usuário: como o plano quase sempre estará atrás, praticamente todo o excedente vai para a carteira, e a caixa de oportunidade só recebe dinheiro se ele estiver adiantado. As regras de queda (usar a caixa quando o mercado cai) não mudam.

### 4.3 A contagem "faltam X anos e Y meses"
É a distância entre o mês atual e o mês projetado para atingir `M2`, usando a mesma projeção da v1 (ritmo de aportes, premissa de rendimento e a reserva completada primeiro). Ela usa sempre o **cenário normal** (a premissa). Casos especiais:
- **Sem data dentro de 50 anos:** mostra "mais de 50 anos" e um convite para o simulador.
- **Renda plena alcançada:** o anel fica completo, a tela diz "Você chegou" e a comemoração do marco aparece (seção 7).

### 4.4 A setinha "desde o mês passado"
A setinha compara o **tempo que falta**, que é o número grande da tela, e não a data prevista. É o que o usuário aprovou: "Faltam 12 anos e 3 meses · ▼ 2 meses a menos que no mês passado".
- Ao **registrar um mês** (o "Já apliquei" ou "Registrar este mês"), o app guarda junto do lançamento o mês projetado para a renda plena, calculado com os dados já atualizados pelo registro. Assim, "quanto faltava" naquele mês = meses entre o mês do lançamento e o mês projetado.
- O Início compara o "faltam" de agora com o "faltava" do **último lançamento de um mês anterior ao atual**. Mostra "▼ N meses a menos que no mês passado" (verde), "▲ N meses a mais que no mês passado" (tom de atenção suave) ou "igual ao mês passado".
- Quem segue no ritmo vê "▼ 1 mês a menos" todo mês. Esse é o efeito desejado: ver o tempo diminuir conforme aporta.
- Entre a virada do mês e o lançamento, a previsão ao vivo ainda não tem o aporte do mês e costuma piorar um mês. Comparando o tempo que falta, isso aparece como "igual ao mês passado", sem alarme falso.
- Se o lançamento de comparação não for do mês imediatamente anterior, o texto diz o mês: "que em ago/2027".
- Sem nenhum lançamento anterior com previsão guardada, a setinha não aparece.

### 4.5 Os quatro cenários
São definidos **em relação à premissa de rendimento real** (configurável em Ajustes): ruim = premissa − 2 pontos percentuais, moderado = premissa − 1, normal = a premissa, bom = premissa + 2. Com a premissa padrão de 5%, ficam **3%, 4%, 5% e 7% ao ano acima da inflação**, como o usuário aprovou. A "faixa provável" dos detalhes passa a ser o intervalo entre o cenário ruim e o bom (o que já era, com a premissa padrão).

### 4.6 Sem status e sem "ação sugerida"
Os selos adiantado / no caminho / atenção / atrasado e a frase "aporte R$ X a mais" saem da interface. O alvo aparece como **frase de referência**: "Seu alvo é nov/2036. No seu ritmo, a renda plena chega N anos e M meses depois." (ou "antes", ou "no alvo"). Quem quiser saber quanto falta aportar encontra a resposta no simulador.

### 4.7 Marcos
Três marcos, em ordem:
1. **Reserva de emergência:** conquistada quando a reserva chega ao alvo (6 × custo de vida). Enquanto não chega, mostra quanto falta em R$.
2. **🥇 Independência:** conquistada quando o patrimônio para as metas chega a `M1`. Antes disso, mostra "em X anos e Y meses" (cenário normal).
3. **🏆 Renda plena:** conquistada quando o patrimônio chega a `M2`. Antes disso, mostra o mês/ano previsto.

**Atingido de verdade, não só pela estimativa:**
- A **reserva** pode ser considerada atingida com o saldo estimado, porque ela é formada pelos depósitos registrados e quase não oscila.
- **Independência** e **Renda plena** só contam como atingidas, e só são comemoradas, quando os saldos da carteira foram atualizados de verdade nos últimos 35 dias (o mesmo limite de "saldos desatualizados" da v1). Enquanto o valor estimado passar da meta sem atualização, o marco aparece como "quase lá: atualize seus saldos para confirmar".

Quando o app percebe, ao abrir o Início, que um marco foi atingido e ainda não foi comemorado, mostra a comemoração (seção 7) e registra a data em `marcos` nos dados (seção 8). Como os dados sincronizam, **cada marco é comemorado uma vez só**, não uma vez por aparelho. Se um marco deixar de valer (por exemplo, o usuário usou a reserva), ele volta a aparecer como não conquistado, mas não é comemorado de novo. Um marco já atingido na hora da atualização para a v2 é comemorado na primeira abertura.

### 4.8 "Seus investimentos já te pagam"
Valor: a média mensal dos proventos registrados (a mesma da v1: últimos 12 meses ou desde o início). Barra de 0 até o salário, com uma marca 🥇 no custo de vida e 🏆 no fim (salário). Valores acima do salário enchem a barra toda. **Sem porcentagem escrita**, para não competir com o anel. Enquanto os proventos forem zero, o cartão mostra a barra vazia e um convite: "Quando seus investimentos pagarem proventos, informe na tela do Mês e eles aparecem aqui."

### 4.9 O simulador
- **Abre com os números reais:** salário, custo de vida total e "quanto invisto por mês" igual ao ritmo atual de aportes.
- **Alavancas ligadas:** subir o salário em R$ X sobe o investimento em R$ X; subir o custo de vida em R$ X baixa o investimento em R$ X (nunca abaixo de zero). O investimento também pode ser arrastado sozinho.
- **Contas:** as metas e o alvo da reserva são recalculados com o salário e o custo simulados. Cada cenário projeta a renda plena com a mesma regra da seção 4.3 (incluindo completar a reserva primeiro).
- **"Para chegar no seu alvo":** o aporte mensal necessário para atingir `M2` no mês-alvo (cenário normal), além de dois prazos maiores para comparação: alvo + 5 anos e alvo + 10 anos (por exemplo nov/2041 e nov/2046). Mensagens:
  - se no cenário normal a renda plena já chega até o alvo: "Você chega antes do alvo" e a data;
  - se o necessário cabe no que você consegue investir (definido logo abaixo): "Invista R$ X por mês", mais "São R$ Y a mais do que agora";
  - se não cabe: "Seriam R$ X por mês… É mais do que você consegue investir hoje (R$ S), então até <alvo> não fecha", com os dois prazos maiores logo abaixo.
- **"O quanto você consegue investir"** é o **maior** valor entre o excedente esperado da v1 (salário − custo mensal − provisão das despesas anuais) e o ritmo real de aportes. O ritmo real entra porque já inclui, na média, o que sobra do 13º, das férias e da PLR. Assim, o simulador nunca abre dizendo que o usuário investe mais do que pode. As alavancas movem esse valor junto: + R$ X de salário dá + R$ X; + R$ X de custo dá − R$ X. É ele que decide entre "cabe" e "não fecha" no cartão do alvo, e o texto mostra o valor ("É mais do que você consegue investir hoje (R$ S)…"). Se o investimento arrastado passar dele, aparece o aviso "Você está investindo mais do que consegue hoje".
- **Nada é salvo.** Ao sair e voltar, o simulador recomeça dos números reais. O botão "Voltar aos meus números" desfaz tudo na hora.

## 5. Telas

### 5.1 Navegação
Um menu fixo embaixo, com 4 botões (ícone e texto, com o botão ativo destacado e animado): **Início** (abre por padrão), **Mês**, **Simular** e **Mais**. O "Mais" é uma lista que leva a **Orçamento**, **Histórico** e **Ajustes**. A aba Painel deixa de existir, e quem abrir o endereço antigo cai no Início. As abas do topo da v1 saem. O assistente de primeiro uso continua sem menu. Os avisos de sincronização continuam aparecendo no topo, por cima do conteúdo.

### 5.2 Início (protótipo D)
De cima para baixo:
1. **Anel.** O preenchimento é o patrimônio para as metas ÷ `M2`. No centro: "Faltam", "X anos", "e Y meses" e "no seu ritmo de hoje".
2. **Setinha** (seção 4.4).
3. **"Você já juntou R$ A de R$ B"**, em valores abreviados (R$ 260 mil, R$ 1,8 mi) e sem porcentagem.
4. **Cartão "Seus investimentos já te pagam"** (seção 4.8).
5. **Marcos em fila:** ✓ Reserva, 🥇 Independência e 🏆 Renda plena (seção 4.7).
6. **Frase do alvo** (seção 4.6), com o link "Veja o que muda no simulador".
7. **Cartão "Dia de pagamento?"**, com um botão que leva ao Mês.
8. **Avisos** quando houver: revisar o orçamento (a cada 6 meses, como na v1), inflação indisponível e saldos estimados.
9. **"Ver detalhes"**, fechado por padrão. Dentro dele, com frases simples:
   - investido hoje, reserva, as duas metas com a explicação de cada uma, o ritmo de aportes (e de onde ele vem), os proventos, o rendimento real desde o início e o necessário para o alvo;
   - o gráfico "até a meta" (plano rumo a `M2`, o real, a projeção normal e a faixa do ruim ao bom);
   - o gráfico dos últimos meses (real × plano) e o check-up da carteira.

### 5.3 Simular (protótipo A)
Título "E se…?" e a frase "Mexa à vontade: nada aqui muda os seus dados". Abaixo vêm:
- o cartão "Para chegar no seu alvo" (seção 4.9);
- um cartão com os três controles de arrastar ("Quanto invisto por mês", "Meu salário líquido" e "Meu custo de vida"), cada um com o valor ao lado, a frase sobre o quanto você consegue investir e o botão "Voltar aos meus números";
- os **4 cenários em cartões 2 × 2**, cada um com a carinha e o nome (😟 Ruim, 😐 Moderado, 🙂 Normal, 😄 Bom), a taxa, o tempo até a renda plena ("21 anos e 3 meses"), a data e, quando diferente dos números reais, "▼ N a menos" ou "▲ N a mais". O normal fica destacado;
- uma linha explicando que as porcentagens são o rendimento por ano acima da inflação.

### 5.4 Mês, Orçamento, Histórico e Ajustes
Mesma função da v1, com o visual novo. Mudanças de texto:
- **Mês:** a barra "Independência: X% do caminho" vira a linha "Faltam X anos e Y meses para a renda plena".
- **Orçamento:** o impacto de cada mudança passa a ser medido na data da **renda plena**. Mudar o custo de vida não mexe na meta (que segue o salário), mas mexe no quanto sobra para investir.
- **Ajustes:** sem mudança de função. O texto da rentabilidade passa a explicar que ela é o cenário "normal" e que os outros três se movem junto com ela.

### 5.5 Assistente de primeiro uso
Recebe o visual novo. O último passo ("Seu plano") é reescrito:
- a renda plena como meta principal;
- "faltam X anos e Y meses";
- os marcos;
- o alvo como frase de referência, sem alarme e sem "não fecha" em vermelho;
- um convite para o simulador.

"Começar" leva ao Início, e não mais ao Mês.

## 6. Visual

- **Cores** (tokens do protótipo; o claro e o escuro seguem o celular):
  - claro: fundo `#f2f4f8`, superfície `#ffffff`, superfície 2 `#e6ebf3`, texto `#101a2e`, suave `#536079`, linha `#d5dce8`, **destaque azul-marinho `#1c3b72`** (fundo suave `#e0e8f6`), bom `#1a7a50`, ouro `#9a6514`, atenção `#b4462b`;
  - escuro: fundo `#0a0f1c`, superfície `#121a2b`, superfície 2 `#1a2337`, texto `#e5eaf4`, suave `#96a1b8`, linha `#263049`, destaque `#8aaaf0` (fundo suave `#1a2950`), bom `#5fcf9a`, ouro `#eab54d`, atenção `#f08a6c`;
  - cores dos cenários: ruim (atenção), moderado (ouro/âmbar), normal (destaque) e bom (bom).
- **Letras:** Sora para títulos e números grandes e Inter para o texto, as duas guardadas no app.
- **Peças:** cartões arredondados (raio de cerca de 18 px), botões grandes, chips, o "Ver detalhes" como sanfona e os números alinhados (`tabular-nums`).
- **Ícone do app e cor do tema** (`theme-color`, manifest) passam para o azul-marinho.

## 7. Movimento

- **Entrada das telas:** os blocos entram em sequência, subindo e aparecendo (cerca de 500 ms, com 70 ms de intervalo).
- **Ao abrir o Início:** o anel e a barra enchem, os valores em R$ do Início contam até o valor final e a setinha "salta".
- **Toque:** botões e itens do menu respondem.
- **No simulador:** os resultados mudam ao vivo enquanto o controle é arrastado, sem atraso.
- **Comemoração de marco:** a tela escurece, um cartão aparece com o ícone do marco, um título ("Reserva de emergência completa!"), uma frase sobre o que aquilo significa e o botão "Continuar", com confete por cerca de 3 segundos. Fecha com o botão ou com Esc.
- **Reduzir movimento:** com essa opção ligada no aparelho, nada se mexe. A comemoração aparece só com o cartão, sem confete.
- **Sem dependência:** as animações nunca bloqueiam o uso, e a tela está completa e correta sem elas.

## 8. Dados

- **schemaVersion 2**, com dois acréscimos:
  - `marcos`: um objeto `{ reserva?, independencia?, rendaPlena? }` com a data (`AAAA-MM-DD`) em que cada marco foi comemorado;
  - `meses[].previsao`: `{ mesRendaPlena: 'AAAA-MM' | null }`, a previsão guardada no registro do mês (seção 4.4).
- **Migração de 1 para 2:** acrescenta `marcos: {}`. Os meses antigos ficam sem `previsao`.
- **Mescla entre aparelhos:** `marcos` é mesclado chave a chave e, se os dois lados tiverem a mesma chave, vale a data mais antiga. `previsao` viaja dentro de cada mês, que já tem a sua mescla.
- **Compatibilidade:** um aparelho com a v1 em cache que receber dados da v2 recusa a versão desconhecida. Como o service worker busca primeiro na rede, basta abrir com internet para atualizar. Isso é aceitável para um único usuário.

## 9. Qualidade e testes

- **Núcleo com TDD:**
  - troca da meta do plano para `M2` (pmtNec, trajetória e decisão entre carteira e caixa);
  - os quatro cenários relativos à premissa;
  - as contas do simulador (ligação entre as alavancas, necessário para o alvo e prazos maiores, mensagens);
  - detecção dos marcos e o "comemorar uma vez";
  - a previsão guardada no registro e o cálculo da setinha;
  - a migração 1 → 2 e a mescla de `marcos`.
- **Testes da v1:** os 145 continuam passando. Os que pressupunham `M1` como alvo do plano são atualizados, e não apagados.
- **Interface:** testes de fumaça no padrão dos que já existem, onde couber (por exemplo, o SVG do anel sem `NaN`).
- **Conferência visual:** captura de tela no Edge headless na largura de celular, nos temas claro e escuro, de Início, Simular, Mês e a comemoração.

## 10. O que fica a critério do construtor

- Nomes de rotas e arquivos. Atenção: hoje a rota `inicio` é o assistente, e o novo Início precisa de outro nome ou o assistente precisa mudar.
- Organização dos componentes, limites dos controles de arrastar, detalhes dos gráficos, como gerar os subconjuntos das fontes e como regenerar os ícones.
- Como aproximar a reserva que falta no "necessário para o alvo", desde que fique coerente com a projeção e tenha teste.

## 11. Decisões do designer (não perguntadas ao usuário)

São escolhas minhas, que o usuário pode vetar ao ler este documento:
- Os cenários se movem junto com a premissa (seção 4.5), em vez de serem fixos em 3, 4, 5 e 7%.
- No simulador, os prazos de comparação são o alvo + 5 anos e o alvo + 10 anos (seção 4.9).
- A setinha compara com o último lançamento de um mês anterior e diz o mês quando ele não é o imediatamente anterior (seção 4.4).
- Marcos já atingidos na atualização são comemorados na primeira abertura. Um marco perdido não é comemorado de novo (seção 4.7).
- No Mês, a barra de progresso vira a linha "Faltam X anos…" (seção 5.4).
- O simulador recomeça dos números reais a cada visita (seção 4.9).
- "O quanto você consegue investir" é o maior valor entre o excedente esperado e o ritmo real, para contar a média de 13º, férias e PLR (seção 4.9).
- Independência e Renda plena só são comemoradas com saldos atualizados de verdade; a reserva pode ser comemorada pela estimativa (seção 4.7).
