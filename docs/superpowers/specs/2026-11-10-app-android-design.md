# Projeto R — App Android (design)

- **Data:** 2026-11-10
- **Status:** entendimento confirmado em entrevista; aguardando aprovação deste documento.
- **Base:** o app web atual (v2), descrito em `2026-11-09-planejador-aposentadoria-design.md` e `2026-11-10-redesenho-v2-design.md`. O app web continua sendo o produto; este documento acrescenta uma casca Android em volta dele.
- **Aviso:** o repositório é público. Nenhum dado pessoal, chave de assinatura ou senha entra no repositório.

## 1. Intenção e o porquê

O usuário já instalou o Projeto R pelo Chrome do celular e quer que ele seja **mais integrado ao celular**. Concretamente, ele quer:
- o ícone na gaveta de apps, abrindo em tela cheia, como um app comum;
- um **lembrete no dia do pagamento** que leve direto ao registro do mês, incluindo a atualização dos saldos da corretora.

O app é só para ele: nada de Play Store. No computador continua o site, com **o mesmo código** e os mesmos dados sincronizados. Melhorias publicadas no site devem chegar ao app **sem reinstalar**.

## 2. Objetivos, não-objetivos e anti-objetivos

### Objetivos
1. Um APK instalável à mão (sideload) que abre o site publicado (`https://rodolss.github.io/Projeto_R/`) em tela cheia, com ícone e nome "Projeto R".
2. Funcionar **sem internet depois da primeira abertura**, como o site já funciona hoje no Chrome.
3. **Lembretes locais do pagamento**, configuráveis: dia fixo **ou** 5º dia útil, horário aproximado e um segundo lembrete se o mês não for registrado.
4. O APK é **fabricado na nuvem** (GitHub Actions) e publicado numa página de versões do GitHub, de onde o usuário baixa pelo celular. Nada é instalado no computador dele.

### Não-objetivos
- Widget na tela inicial (adiado pelo usuário: "por enquanto sem widget").
- Play Store, iOS, desbloqueio por digital, notificações vindas de servidor (push), sincronização em segundo plano.
- Mudar qualquer regra financeira ou tela do app web além do cartão "Lembretes" e do aviso de backup (seção 6).
- Backup dentro do app: **exportar e importar backup ficam só pelo computador** (decisão do usuário).

### Anti-objetivos (seria um fracasso mesmo que funcionasse)
- Um lembrete "Caiu o salário?" que chega **antes** do dinheiro cair.
- Notificações demais: há uma por mês, mais no máximo uma de reforço.
- Um app que só funciona com internet.
- Exigir que o usuário instale ferramentas no computador ou mexa em linha de comando.
- Atualizações que obrigam a desinstalar o app, porque a chave de assinatura foi perdida ou mudou.
- Expor a ponte nativa a qualquer site que não seja o do Projeto R.
- Chave de assinatura, senha ou dado pessoal no repositório público.

## 3. Restrições

- **Sem Java nem kit do Android no computador do usuário.** Tudo o que precisa de Java ou Gradle roda no GitHub Actions. A chave de assinatura é gerada com **OpenSSL** (já disponível no Git Bash), no formato **PKCS12**, que o Android aceita.
- O site continua **sem build**: HTML, CSS e JS puros, com testes em `node --test`.
- **Android mínimo: 8.0 (API 26).** É o primeiro a exigir canais de notificação, e cobre praticamente todos os celulares em uso.
- O app é instalado à mão: o Android vai pedir para liberar "instalar apps desconhecidos" e pode mostrar um aviso do Play Protect. Ambos são aceitos pelo usuário.
- A casca abre **apenas** a origem `https://rodolss.github.io`. Qualquer outro link abre no navegador do celular.

## 4. Arquitetura (decisão do designer, com o porquê)

**Uma casca Android própria e pequena (Kotlin, um `WebView`), em vez do Capacitor.**

O porquê:
- O usuário escolheu que o app **abra o site publicado** (melhorias sem reinstalar) e que **funcione sem internet**.
- O site funciona sem internet graças ao seu service worker.
- O Capacitor, com `server.url` remoto, depende de injetar o seu JavaScript no HTML que vem da rede. Quando a página é servida pelo service worker, essa injeção não acontece e **os plugins nativos param**, como mostra o bug conhecido do Capacitor com service worker e `server.url` no Android. A recomendação da comunidade é desligar o service worker no app, o que quebraria o funcionamento sem internet.

Uma casca própria evita isso:
- **WebView** carregando `https://rodolss.github.io/Projeto_R/`, com JavaScript, armazenamento local (`domStorage`) e service worker habilitados. Assim o cache do site funciona como no Chrome.
- **Ponte nativa via `WebViewCompat.addWebMessageListener`** (androidx.webkit), restrita à origem `https://rodolss.github.io`. O WebView a injeta em toda página dessa origem, venha ela da rede ou do cache, sem depender do HTML. O objeto aparece no site como `window.ProjetoRAndroid`, com `postMessage(texto)`.
- **Primeira abertura sem internet:** se a página principal não carregar e não houver cache, a casca mostra uma tela local simples: "Conecte-se à internet para abrir o Projeto R pela primeira vez", com o botão "Tentar de novo".
- **Botão voltar do Android:** volta no histórico do WebView (as telas usam `#/rota`). Na primeira tela, fecha o app.
- **Links externos** (por exemplo, o de criar a chave do GitHub no assistente): abrem no navegador do celular.
- Nome "Projeto R", o mesmo ícone azul-marinho com o "R" (gerado de `icones/`) e a barra de status na cor do tema.

## 5. Lembretes

### 5.1 Regras de data (decididas pelo usuário)
- **Tipo "5º dia útil"** (padrão): conta só de **segunda a sexta** e pula:
  - os feriados nacionais fixos: 1/1, 21/4, 1/5, 7/9, 12/10, 2/11, 15/11, 20/11 e 25/12;
  - a **Sexta-feira Santa**;
  - o **Carnaval**, segunda e terça;
  - o **Corpus Christi**.

  Os feriados móveis são calculados a partir da Páscoa. O porquê: assim o lembrete nunca chega antes do dinheiro, no máximo um ou dois dias depois.
- **Tipo "dia fixo":** o dia escolhido, de 1 a 31. Se o mês não tiver esse dia, vale o último dia do mês. Se a data cair em **sábado, domingo ou feriado** (a mesma lista do 5º dia útil), o lembrete passa para o **próximo dia útil**, para nunca chegar antes do dinheiro (decisões do designer).
- **Horário:** o escolhido, padrão 9h. É **aproximado**, até cerca de 15 minutos de diferença, sem a permissão de alarme exato.
- **Segundo lembrete:** 3 dias corridos depois do primeiro, no mesmo horário, **só se o mês ainda não estiver registrado**.
- **Mês já registrado:** se o mês do lembrete já estiver registrado quando a lista é montada, **nenhum** lembrete daquele mês toca, nem o principal nem o reforço (decisão do designer, pelo anti-objetivo "notificações demais").
- **O "mês" de um lembrete** é o mês do calendário em que cai o lembrete principal. Registrar o mês só no dia 1º do mês seguinte não conta para o mês anterior, e o reforço toca. Caso raro, aceito.

### 5.2 Texto
- **Principal:** título "Projeto R", texto "Caiu o salário? Atualize os saldos da corretora e veja quanto investir."
- **Reforço:** "O mês ainda não foi registrado. Atualize os saldos e veja quanto investir." (decisão do designer).
- **Ao tocar:** abre o app na tela do Mês (`#/mes`).
- **Canal de notificação:** "Lembretes do pagamento".

### 5.3 Quem calcula e quem agenda
- **O site calcula** as datas, num módulo puro e testado (`js/core/lembretes.js`). Ele monta a lista dos próximos lembretes dos **3 meses seguintes** (decisão do designer), já sem os lembretes dos meses que estiverem registrados.
- **A casca agenda:** recebe a lista pela ponte, cancela os lembretes antigos e agenda os novos com `AlarmManager` em modo inexato e permitido em modo de economia (`setAndAllowWhileIdle`).
- **Depois de reiniciar o celular,** a casca guarda a última lista e reagenda sozinha (`BOOT_COMPLETED`).
- **O site reenvia a lista** quando o app abre, quando um mês é registrado e quando a configuração dos lembretes muda.
- **Limitação aceita:** se o usuário registrar o mês **só no computador** e não abrir o app do celular, o reforço daquele mês ainda toca, porque o celular não fica sabendo.

### 5.4 Permissão (Android 13 ou mais novo)
A **casca pede a permissão de notificação na primeira abertura do app**, com a janela padrão do Android, e os lembretes já vêm ligados (decisão do designer). Se o usuário negar, o cartão "Lembretes" mostra uma frase explicando como liberar nas configurações do Android. O site pergunta o estado da permissão pela ponte (`{ tipo: 'permissao?' }`) ao montar o cartão.

## 6. Mudanças no site

- **Detecção da casca:** o site sabe que está no app quando `window.ProjetoRAndroid` existe. No navegador, nada muda.
- **Cartão "Lembretes" em Ajustes**, visível só no app:
  - ligar e desligar (padrão: ligado);
  - tipo: "5º dia útil" (padrão) ou "Dia fixo";
  - o dia (só no tipo fixo);
  - o horário (padrão 09:00);
  - a linha "Próximo lembrete: seg, 5 de jan., por volta das 9h";
  - o botão "Testar agora", que dispara uma notificação na hora.
- **Backup no app:** dentro do app, "Exportar backup" e "Importar backup" não executam. Eles mostram o aviso "Faça o backup pelo computador." (decisão do usuário). No navegador, tudo continua como hoje.
- **Configuração no aparelho:** fica no armazenamento do app (`localStorage`), não nos dados sincronizados, porque só o celular notifica.
- **Mensagens da ponte:** texto JSON com um campo `tipo`. O site envia:
  - `{ tipo: 'agendar', lembretes: [{ id, quando, titulo, texto, rota }] }`;
  - `{ tipo: 'testar' }`;
  - `{ tipo: 'pedirPermissao' }`.

  A casca responde à permissão com `{ tipo: 'permissao', concedida }`. Os detalhes do formato ficam a critério do construtor, desde que estejam documentados no código e testados do lado do site.

## 7. Distribuição e assinatura

- **Workflow** `.github/workflows/android.yml`, disparado por uma tag `android-v*` e também à mão:
  1. monta o APK de release, assinado;
  2. cria uma Release no GitHub com o arquivo `projeto-r.apk`.
- **Onde baixar:** o usuário baixa em `https://github.com/rodolss/Projeto_R/releases/latest`.
- **Versão:** o número de versão sai da tag, de modo que cada APK novo seja maior e o Android aceite atualizar por cima.
- **Assinatura:** um par de chave e certificado gerado uma vez com OpenSSL, em PKCS12, com senha aleatória.
  - Fica em segredos do GitHub (`ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_SENHA`, `ANDROID_KEY_ALIAS`).
  - Uma cópia de segurança vai para uma pasta do usuário **fora do repositório**, e o usuário é avisado de onde ela está.
  - Perder a chave obriga a desinstalar e instalar de novo. Os dados não se perdem, porque estão no GitHub, mas a chave do GitHub precisa ser colada outra vez.
- O repositório é público, então qualquer pessoa pode baixar o APK. Isso não é problema: o APK é só a casca de um site público, sem dados.

## 8. Ordem de entrega e verificação no celular

1. **Primeiro a casca, sem lembretes:** o usuário instala e testa no celular dele:
   - abre com internet e cola a chave do GitHub (o app guarda as coisas separado do Chrome; recomenda-se criar a chave "Projeto R (app Android)");
   - fecha o app, liga o modo avião e abre de novo. Precisa abrir e funcionar.

   Só depois desse teste os lembretes são construídos. Isso derruba o maior risco técnico (sem internet com a ponte nativa) antes de investir no resto.
2. **Depois os lembretes:** são verificados com o botão "Testar agora" e com um horário marcado para dali a poucos minutos.
3. **Por fim**, o usuário desinstala a versão instalada pelo Chrome, para não ficar com dois ícones.

## 9. Qualidade e testes

- **TDD no site:**
  - feriados de anos conhecidos (por exemplo, Páscoa de 2027 em 28/3, Carnaval em 8 e 9/2 e Corpus Christi em 27/5);
  - o 5º dia útil em meses com feriado e fim de semana no começo;
  - o dia fixo em meses curtos;
  - nenhum lembrete do mês quando ele já está registrado;
  - o dia fixo que cai em fim de semana ou feriado, que passa para o próximo dia útil;
  - a lista dos 3 meses e a mensagem montada para a ponte.
- **O cartão "Lembretes"** só aparece quando `window.ProjetoRAndroid` existe (teste de carga dos módulos de tela, como os que já existem).
- **A casca** precisa compilar no GitHub Actions a cada mudança nela. A verificação de comportamento é feita pelo usuário no celular (seção 8), com um roteiro curto.
- O teste `sw.test.js` continua garantindo que todo módulo novo do site entra no cache.

## 10. O que fica a critério do construtor

Ficam a critério do construtor:
- a organização do projeto Android (`android/`), as versões do Gradle e do Kotlin e o `targetSdk`;
- a forma de guardar a lista para depois de reiniciar o celular;
- a tela de "sem internet";
- o formato exato das mensagens da ponte;
- como gerar os ícones do app a partir dos existentes;
- os nomes das tags.

## 11. Decisões do designer (não perguntadas ao usuário)

São escolhas minhas, que o usuário pode vetar:
- casca própria em vez do Capacitor (seção 4);
- ponte com `addWebMessageListener`, restrita à origem do site;
- tela local para a primeira abertura sem internet;
- dia fixo maior que o mês vira o último dia, e o que cai em fim de semana ou feriado passa para o próximo dia útil;
- mês já registrado: nenhum lembrete daquele mês toca;
- a permissão de notificação é pedida pela casca na primeira abertura;
- o texto do lembrete de reforço;
- agendar os 3 meses seguintes;
- configuração guardada só no aparelho;
- a limitação de registrar só pelo computador (seção 5.3);
- a ordem de entrega com o teste da casca antes dos lembretes;
- a cópia da chave fora do repositório;
- Android mínimo 8.0.
