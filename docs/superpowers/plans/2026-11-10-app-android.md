# App Android do Projeto R — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Um APK Android próprio (casca Kotlin com WebView) que abre o site publicado do Projeto R em tela cheia, funciona sem internet depois da primeira abertura e agenda os lembretes do dia do pagamento.

**Architecture:** O site continua sendo o produto. A pasta `android/` contém uma casca mínima: ela carrega `https://rodolss.github.io/Projeto_R/` num WebView com service worker, expõe a ponte `window.ProjetoRAndroid` (via `WebViewCompat.addWebMessageListener`, restrita à origem do site) e agenda notificações com `AlarmManager`. As datas dos lembretes são calculadas no site, num módulo puro e testado (`js/core/lembretes.js`). O APK é compilado, assinado e publicado pelo GitHub Actions. A entrega tem duas fases, com uma parada obrigatória para o usuário testar a casca sem internet no celular dele.

**Tech Stack:** Kotlin 2.1.0, Android Gradle Plugin 8.7.3, Gradle 8.11.1 (via `gradle/actions/setup-gradle`, sem wrapper no repositório), JDK 17 só no CI, `androidx.webkit:webkit:1.12.1`, `androidx.core:core-ktx:1.15.0`; site em JS puro com `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-10-app-android-design.md` (aprovada).

## Global Constraints

- Nada de Java, Gradle ou kit do Android na máquina do usuário. Tudo que compila Android roda no GitHub Actions (`ubuntu-latest`, que já traz o kit do Android).
- Pacote `io.github.rodolss.projetor`, nome do app "Projeto R", `minSdk 26`, `targetSdk 34`, `compileSdk 35`.
- URL inicial `https://rodolss.github.io/Projeto_R/`. A ponte e a navegação interna valem só para a origem `https://rodolss.github.io` com caminho começando em `/Projeto_R/`; o resto abre no navegador do celular.
- Objeto da ponte no site: `window.ProjetoRAndroid` (nome usado em `addWebMessageListener`).
- Segredos do GitHub: `ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_SENHA`, `ANDROID_KEY_ALIAS`. Chave em PKCS12 gerada com OpenSSL. Nenhum `.p12`, `.pem` ou senha entra no repositório.
- Cópia de segurança da chave fora do repositório, em `C:\Users\liks_\Documents\Projeto R - chave do app Android\`.
- Textos exatos:
  - lembrete principal: título "Projeto R", texto "Caiu o salário? Atualize os saldos da corretora e veja quanto investir.";
  - lembrete de reforço: "O mês ainda não foi registrado. Atualize os saldos e veja quanto investir.";
  - canal de notificação: "Lembretes do pagamento";
  - aviso de backup no app: "Faça o backup pelo computador.";
  - tela sem internet: "Conecte-se à internet para abrir o Projeto R pela primeira vez." e o botão "Tentar de novo".
- Regras do lembrete: 5º dia útil (seg–sex, pulando 1/1, 21/4, 1/5, 7/9, 12/10, 2/11, 15/11, 20/11, 25/12, Sexta-feira Santa, Carnaval segunda e terça e Corpus Christi) ou dia fixo (1–31; mês curto usa o último dia; fim de semana ou feriado passa para o próximo dia útil). Padrão: `{ ligado: true, tipo: 'util', dia: 5, hora: '09:00' }`. O reforço vem 3 dias corridos depois, no mesmo horário. Mês registrado não tem lembrete nenhum. Agenda o mês atual e os 2 seguintes. Horário aproximado (`setAndAllowWhileIdle`), sem permissão de alarme exato.
- Ao tocar na notificação, o app abre em `#/mes`.
- O site continua sem build. Todo módulo novo de `js/` entra no `CASCA` do `sw.js` (o `tests/dados/sw.test.js` cobra isso).
- Mensagens de commit terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Site aberto no navegador, sem a casca:** nada muda. O cartão "Lembretes" não aparece e o backup funciona como hoje. Teste na Task 5.
2. **Mês registrado pelo celular:** os lembretes daquele mês somem da agenda logo depois do registro, sem esperar reabrir o app. Teste na Task 5 (`reagendar` chamado depois de salvar).
3. **Primeira abertura sem internet:** a tela "Conecte-se…" aparece; com "Tentar de novo" e a internet de volta, o app abre. Roteiro no celular, na Task 3.
4. **Permissão de notificação negada ou celular reiniciado:** o app não trava, a notificação não é postada sem permissão, e depois de reiniciar os lembretes voltam. Revisão do código e roteiro no celular, na Task 6.
5. **Dia fixo 29–31 e feriados no começo do mês:** a data calculada nunca cai antes do dinheiro (exemplos com valores exatos). Teste na Task 4.

---

## FASE 1 — A casca

### Task 1: Projeto Android da casca (sem lembretes)

**Files:**
- Create: `android/settings.gradle.kts`, `android/build.gradle.kts`, `android/gradle.properties`, `android/app/build.gradle.kts`, `android/app/proguard-rules.pro`
- Create: `android/app/src/main/AndroidManifest.xml`
- Create: `android/app/src/main/java/io/github/rodolss/projetor/MainActivity.kt`
- Create: `android/app/src/main/res/values/strings.xml`, `android/app/src/main/res/values/themes.xml`, `android/app/src/main/res/layout/activity_main.xml`
- Create: `android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png` e `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` (cópias redimensionadas de `icones/icone-192.png` e `icones/icone-512.png`)
- Modify: `.gitignore` (acrescentar `android/.gradle/`, `android/build/`, `android/app/build/`, `*.p12`, `*.pem`, `*.jks`, `android/local.properties`)

**Interfaces:**
- Produces: `MainActivity`, com `companion object { const val URL_INICIAL = "https://rodolss.github.io/Projeto_R/"; const val ORIGEM = "https://rodolss.github.io"; const val PREFIXO = "/Projeto_R/" }`.
- Produces: `fun ehDoApp(uri: Uri): Boolean`, que diz se uma URL fica dentro do app (esquema `https`, host `rodolss.github.io` e caminho começando com `/Projeto_R/`).
- Produces: a ponte `WebViewCompat.addWebMessageListener(webView, "ProjetoRAndroid", setOf(ORIGEM), listener)`, registrada **antes** do primeiro `loadUrl`, só quando `WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)`. Nesta fase o listener só registra a mensagem no log. A Task 6 completa o resto.

- [ ] **Step 1: Escreva os arquivos do Gradle**

`settings.gradle.kts`:
- `rootProject.name = "projetor"`;
- `include(":app")`;
- repositórios `google()` e `mavenCentral()`.

Plugins:
- `com.android.application` 8.7.3;
- `org.jetbrains.kotlin.android` 2.1.0.

`app/build.gradle.kts`:
- `namespace` e `applicationId` `io.github.rodolss.projetor`;
- os SDKs das Global Constraints;
- `versionCode` e `versionName` lidos de `project.findProperty("versaoApp")`, com padrão `1`;
- Java e Kotlin no 17;
- dependências webkit 1.12.1 e core-ktx 1.15.0.

`signingConfigs.release`:
- ativo só se a variável de ambiente `ANDROID_KEYSTORE_PATH` existir;
- `storeFile` vem dessa variável;
- `storePassword` e `keyPassword` vêm de `ANDROID_KEYSTORE_SENHA`;
- `keyAlias` vem de `ANDROID_KEY_ALIAS`;
- `storeType = "pkcs12"`.

O `release` usa esse `signingConfig` quando ele existir, com `isMinifyEnabled = false`.

- [ ] **Step 2: Escreva o `AndroidManifest.xml`**

- Permissão `INTERNET`.
- `application` com `android:icon="@mipmap/ic_launcher"`, `android:label="@string/app_name"` e `android:theme="@style/Tema"`.
- `MainActivity` com `exported="true"`, `launchMode="singleTask"` e `configChanges="orientation|screenSize|keyboardHidden"`, mais o filtro MAIN/LAUNCHER.

- [ ] **Step 3: Escreva `MainActivity.kt` e o layout**

Layout (`activity_main.xml`): um `FrameLayout` com dois filhos:
- o `WebView` (`@+id/web`);
- um `LinearLayout` centralizado (`@+id/semInternet`, `visibility="gone"`), com o `TextView` e o `Button` das Global Constraints.

`MainActivity`:
- **Configuração do WebView:** `javaScriptEnabled`, `domStorageEnabled` e `cacheMode = LOAD_DEFAULT`; registra a ponte (Interfaces) e depois chama `loadUrl(URL_INICIAL)`.
- **`WebViewClient`:**
  - `shouldOverrideUrlLoading` abre no navegador (`Intent.ACTION_VIEW`) toda URL que não seja `ehDoApp`;
  - `onReceivedError`, quando `request.isForMainFrame`, mostra `semInternet` e esconde o WebView;
  - "Tentar de novo" esconde a mensagem e chama `webView.reload()`.
- **Diagnóstico desta fase:** em `onPageFinished` de uma URL do app, `evaluateJavascript("typeof window.ProjetoRAndroid")`. Se o resultado for `"object"`, mostra um `Toast` com "Ponte nativa OK". A Task 6 remove isso.
- **Botão voltar:** `onBackPressed` volta no histórico do WebView (`canGoBack`) e, sem histórico, fecha o app.
- **Rotação:** `onSaveInstanceState`/`restoreState` do WebView.

Tema (`themes.xml`): `Theme.Material.Light.NoActionBar` (sem AppCompat), `statusBarColor` `#1c3b72`, `windowBackground` `#f2f4f8`.

- [ ] **Step 4: Copie os ícones**

Gere `mipmap-xxhdpi/ic_launcher.png` (144 px) e `mipmap-xxxhdpi/ic_launcher.png` (192 px) a partir de `icones/icone-512.png` com o `System.Drawing` do PowerShell, como faz `scripts/gerar-icones.ps1`.

- [ ] **Step 5: Commit**

```bash
git add android .gitignore
git commit -m "feat(android): casca WebView com ponte restrita ao site e tela sem internet"
```

---

### Task 2: Workflow de build e release, mais a chave de assinatura

**Files:**
- Create: `.github/workflows/android.yml`
- Create: `scripts/gerar-chave-android.sh` (roda no Git Bash do usuário; não grava nada no repositório)
- Modify: `README.md` (seção "App Android": como baixar e instalar)

**Interfaces:**
- Consumes: o projeto da Task 1 (`android/`) e a propriedade Gradle `versaoApp`.
- Produces: o workflow `android.yml` com dois jobs:
  - **`compilar`:** roda em `push` e `pull_request` quando `android/**` ou o próprio workflow mudam. Faz `gradle -p android assembleDebug`.
  - **`publicar`:** roda em `push` de tags `android-v*` e em `workflow_dispatch` com o campo `versao`. Faz:
    1. decodifica `ANDROID_KEYSTORE_B64` em `$RUNNER_TEMP/chave.p12` e exporta `ANDROID_KEYSTORE_PATH`;
    2. `gradle -p android assembleRelease -PversaoApp=<N>`, onde N é o número depois de `android-v` (ou o campo `versao`);
    3. `apksigner verify --print-certs` no APK (o `apksigner` do `$ANDROID_HOME/build-tools` mais novo);
    4. copia o APK para `projeto-r.apk`;
    5. `gh release create android-v<N> projeto-r.apk --title "App Android <N>" --notes "<como instalar>"`, com `GH_TOKEN: ${{ github.token }}` e `permissions: contents: write`.
- Produces: `scripts/gerar-chave-android.sh <pasta-de-backup>`, que:
  - gera uma senha aleatória de 32 caracteres (`openssl rand -base64 24`);
  - gera a chave e o certificado (`openssl req -x509 -newkey rsa:4096 -days 10000 -nodes -subj "/CN=Projeto R"`);
  - monta o PKCS12 com alias `projetor` (`openssl pkcs12 -export -name projetor`);
  - grava `projetor.p12` e `senha.txt` só na pasta de backup;
  - cadastra os 3 segredos com `gh secret set` (o B64 por stdin);
  - apaga os `.pem` temporários.

- [ ] **Step 1: Escreva `.github/workflows/android.yml`** conforme Interfaces.

Use `actions/checkout@v4`, `actions/setup-java@v4` (temurin 17) e `gradle/actions/setup-gradle@v4` (`gradle-version: 8.11.1`).

- [ ] **Step 2: Rode o job de compilação**

Run: `git push -u origin app-android`, depois `gh run watch $(gh run list --workflow android.yml --branch app-android --limit 1 --json databaseId --jq '.[0].databaseId') --exit-status`

Expected: job `compilar` verde. Se falhar, corrija a Task 1 pela mensagem do Gradle (superpowers:systematic-debugging) e repita.

- [ ] **Step 3: Escreva e rode `scripts/gerar-chave-android.sh`**

Run: `bash scripts/gerar-chave-android.sh "/c/Users/liks_/Documents/Projeto R - chave do app Android"`

Expected:
- `gh secret list` mostra os 3 segredos;
- a pasta de backup tem `projetor.p12` e `senha.txt`;
- `git status` não mostra nenhum `.p12` ou `.pem`.

- [ ] **Step 4: Acrescente a seção "App Android" ao README**

O texto diz:
- onde baixar: `https://github.com/rodolss/Projeto_R/releases/latest`;
- como instalar: liberar "instalar apps desconhecidos" para o navegador e confirmar o aviso do Play Protect;
- que a chave do GitHub precisa ser colada de novo no app;
- que o backup é só pelo computador.

- [ ] **Step 5: Commit, tag e release**

```bash
git add .github/workflows/android.yml scripts/gerar-chave-android.sh README.md
git commit -m "ci(android): compila a casca e publica o APK assinado nas Releases"
git push
git tag android-v1 && git push origin android-v1
```

Run: `gh run watch <id do run da tag> --exit-status`, depois `gh release view android-v1 --json assets --jq '.assets[].name'`

Expected: run verde; `projeto-r.apk` listado; a saída do `apksigner` mostra `CN=Projeto R`.

---

### Task 3: PARADA OBRIGATÓRIA — teste da casca no celular (spec §8)

**Files:** nenhum.

- [ ] **Step 1: Passe ao usuário o roteiro, em português simples, e espere a resposta.**

1. No celular, abra `https://github.com/rodolss/Projeto_R/releases/latest` e baixe `projeto-r.apk`.
2. Instale, liberando "instalar apps desconhecidos" e confirmando o Play Protect.
3. Abra com internet. Deve aparecer "Ponte nativa OK".
4. Cole uma chave nova do GitHub, "Projeto R (app Android)", e confira que os dados aparecem.
5. Feche o app, ligue o **modo avião** e abra de novo. O app abre, os dados aparecem e "Ponte nativa OK" aparece de novo.
6. Toque num link externo (o do assistente, ou outro). Ele abre no navegador.
7. Opcional: desinstale, ligue o modo avião, reinstale e abra. Aparece "Conecte-se à internet…"; desligue o modo avião, toque em "Tentar de novo", e o app abre.

- [ ] **Step 2: Decida pelo resultado**

- **Tudo passa:** siga para a Fase 2.
- **O passo 5 falha** (sem internet não abre, ou a ponte some): **pare**, use superpowers:systematic-debugging e volte ao usuário com o diagnóstico antes de construir lembretes.

---

## FASE 2 — Lembretes

### Task 4: Núcleo dos lembretes (`js/core/lembretes.js`)

**Files:**
- Create: `js/core/lembretes.js`
- Test: `tests/core/lembretes.test.js`
- Modify: `sw.js` (CASCA)

**Interfaces:**
- Produces:
  - `CONFIG_PADRAO = { ligado: true, tipo: 'util', dia: 5, hora: '09:00' }`
  - `pascoa(ano: number) -> 'AAAA-MM-DD'` (algoritmo de Meeus/Jones/Butcher)
  - `feriados(ano: number) -> Set<'AAAA-MM-DD'>`
  - `ehDiaUtil(data: 'AAAA-MM-DD') -> boolean` (seg–sex e não feriado)
  - `proximoDiaUtil(data) -> 'AAAA-MM-DD'` (a própria data se for útil)
  - `quintoDiaUtil(mes: 'AAAA-MM') -> 'AAAA-MM-DD'`
  - `dataDoLembrete(config, mes: 'AAAA-MM') -> 'AAAA-MM-DD'`
  - `montarLembretes({ config, agora: 'AAAA-MM-DDTHH:MM', mesesRegistrados: string[] }) -> Array<{ id: number, quando: 'AAAA-MM-DDTHH:MM', titulo: string, texto: string, rota: '#/mes' }>`. Cobre o mês de `agora` e os 2 seguintes. Pula meses registrados e horários que já passaram. Os ids são 1, 2, 3… na ordem cronológica. Devolve `[]` se `config.ligado` for falso.
  - `descreverProximo(lembretes, agora) -> string | null`, por exemplo "sex, 8 de jan., por volta das 9h" ou "por volta das 7h30". Devolve `null` sem lembretes.
- Todas as datas são locais e em texto. A conversão para milissegundos fica na Task 5.

- [ ] **Step 1: Write the failing tests**

```js
test('Páscoa e feriados móveis', () => {
  assert.equal(pascoa(2025), '2025-04-20');
  assert.equal(pascoa(2026), '2026-04-05');
  assert.equal(pascoa(2027), '2027-03-28');
  const f = feriados(2027);
  for (const d of ['2027-02-08', '2027-02-09', '2027-03-26', '2027-05-27', '2027-01-01', '2027-11-20', '2027-12-25']) assert.ok(f.has(d), d);
});
test('5º dia útil pula fins de semana e feriados', () => {
  assert.equal(quintoDiaUtil('2027-01'), '2027-01-08'); // 1/1 feriado (sexta)
  assert.equal(quintoDiaUtil('2027-09'), '2027-09-08'); // 7/9 feriado (terça)
  assert.equal(quintoDiaUtil('2027-11'), '2027-11-08'); // 2/11 feriado (terça)
});
test('dia fixo: mês curto e fim de semana/feriado vão para o próximo dia útil', () => {
  const fixo = (dia) => ({ ...CONFIG_PADRAO, tipo: 'fixo', dia });
  assert.equal(dataDoLembrete(fixo(5), '2027-01'), '2027-01-05');
  assert.equal(dataDoLembrete(fixo(2), '2027-01'), '2027-01-04'); // sábado → segunda
  assert.equal(dataDoLembrete(fixo(7), '2027-09'), '2027-09-08'); // feriado → dia seguinte
  assert.equal(dataDoLembrete(fixo(31), '2027-02'), '2027-03-01'); // 28/2 é domingo
});
test('agenda de 3 meses com reforço 3 dias depois', () => {
  const l = montarLembretes({ config: CONFIG_PADRAO, agora: '2027-01-01T10:00', mesesRegistrados: [] });
  assert.deepEqual(l.map((x) => [x.id, x.quando]), [
    [1, '2027-01-08T09:00'], [2, '2027-01-11T09:00'], [3, '2027-02-05T09:00'],
    [4, '2027-02-08T09:00'], [5, '2027-03-05T09:00'], [6, '2027-03-08T09:00'],
  ]);
  assert.equal(l[0].texto, 'Caiu o salário? Atualize os saldos da corretora e veja quanto investir.');
  assert.equal(l[1].texto, 'O mês ainda não foi registrado. Atualize os saldos e veja quanto investir.');
  assert.ok(l.every((x) => x.titulo === 'Projeto R' && x.rota === '#/mes'));
});
test('mês registrado não tem lembrete; horário passado é pulado; desligado não agenda', () => {
  const sem = montarLembretes({ config: CONFIG_PADRAO, agora: '2027-01-01T10:00', mesesRegistrados: ['2027-01'] });
  assert.equal(sem[0].quando, '2027-02-05T09:00');
  const depois = montarLembretes({ config: CONFIG_PADRAO, agora: '2027-01-09T12:00', mesesRegistrados: [] });
  assert.equal(depois[0].quando, '2027-01-11T09:00');
  assert.deepEqual(montarLembretes({ config: { ...CONFIG_PADRAO, ligado: false }, agora: '2027-01-01T10:00', mesesRegistrados: [] }), []);
  assert.equal(montarLembretes({ config: { ...CONFIG_PADRAO, hora: '07:30' }, agora: '2027-01-01T10:00', mesesRegistrados: [] })[0].quando, '2027-01-08T07:30');
});
test('descreverProximo', () => {
  const l = montarLembretes({ config: CONFIG_PADRAO, agora: '2027-01-01T10:00', mesesRegistrados: [] });
  assert.equal(descreverProximo(l, '2027-01-01T10:00'), 'sex, 8 de jan., por volta das 9h');
  const cedo = montarLembretes({ config: { ...CONFIG_PADRAO, hora: '07:30' }, agora: '2027-01-01T10:00', mesesRegistrados: [] });
  assert.equal(descreverProximo(cedo, '2027-01-01T10:00'), 'sex, 8 de jan., por volta das 7h30');
  assert.equal(descreverProximo([], '2027-01-01T10:00'), null);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/core/lembretes.test.js`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implement `js/core/lembretes.js`** conforme Interfaces. Faça as contas de data com `Date.UTC` e `getUTCDay`, para não depender do fuso do computador. Acrescente o módulo ao `CASCA`.

- [ ] **Step 4: Run the whole suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/core/lembretes.js tests/core/lembretes.test.js sw.js
git commit -m "feat: regras dos lembretes do pagamento (5º dia útil, dia fixo, feriados)"
```

---

### Task 5: Ponte no site, cartão "Lembretes" e aviso de backup

**Files:**
- Create: `js/ui/nativo.js`
- Modify: `js/app.js` (reagendar ao abrir e depois de cada salvamento)
- Modify: `js/ui/config.js` (cartão "Lembretes"; aviso de backup no app)
- Modify: `css/app.css` (estilos do cartão, se necessário), `sw.js` (CASCA)
- Test: `tests/ui/nativo.test.js`

**Interfaces:**
- Consumes: `montarLembretes`, `descreverProximo` e `CONFIG_PADRAO` (Task 4).
- Produces (`js/ui/nativo.js`):
  - `noApp(janela = globalThis) -> boolean`: diz se `janela.ProjetoRAndroid` existe.
  - `lerConfig(armazenamento = globalThis.localStorage) -> config`: lê a chave `projetoR.lembretes`, mesclada sobre `CONFIG_PADRAO`.
  - `salvarConfig(config, armazenamento)`.
  - `agoraLocal(data = new Date()) -> 'AAAA-MM-DDTHH:MM'`.
  - `paraMensagem(lembretes) -> { tipo: 'agendar', lembretes: [{ id, quando: number (ms, de new Date('AAAA-MM-DDTHH:MM')), titulo, texto, rota }] }`.
  - `reagendar({ estado, config, agora, enviar })`: monta os lembretes com `mesesRegistrados = estado.meses.map((m) => m.mes)` e chama `enviar(JSON.stringify(paraMensagem(...)))`. Só a borda chama `window.ProjetoRAndroid.postMessage`.
  - `perguntarPermissao(enviar)`, `testar(enviar)` e `aoReceber(fn, janela)`, que liga `janela.ProjetoRAndroid.onmessage` e entrega o JSON já lido.
- Mensagens: `{tipo:'agendar', lembretes}`, `{tipo:'testar'}`, `{tipo:'permissao?'}` e `{tipo:'pedirPermissao'}`. A casca responde `{tipo:'permissao', concedida: boolean}`.

- [ ] **Step 1: Write the failing tests** (`tests/ui/nativo.test.js`)

```js
test('fora do app nada muda (Review Focus 1)', () => {
  assert.equal(noApp({}), false);
  assert.equal(noApp({ ProjetoRAndroid: { postMessage() {} } }), true);
});
test('config: padrão e mesclagem', () => {
  const mem = new Map();
  const arm = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  assert.deepEqual(lerConfig(arm), { ligado: true, tipo: 'util', dia: 5, hora: '09:00' });
  salvarConfig({ ligado: true, tipo: 'fixo', dia: 10, hora: '08:00' }, arm);
  assert.deepEqual(lerConfig(arm), { ligado: true, tipo: 'fixo', dia: 10, hora: '08:00' });
});
test('paraMensagem converte o horário local em milissegundos', () => {
  const m = paraMensagem([{ id: 1, quando: '2027-01-08T09:00', titulo: 'Projeto R', texto: 't', rota: '#/mes' }]);
  assert.equal(m.tipo, 'agendar');
  assert.equal(m.lembretes[0].quando, new Date(2027, 0, 8, 9, 0).getTime());
});
test('registrar o mês tira os lembretes dele da agenda (Review Focus 2)', () => {
  const enviados = [];
  const estado = { meses: [{ mes: '2027-01' }] };
  reagendar({ estado, config: { ligado: true, tipo: 'util', dia: 5, hora: '09:00' }, agora: '2027-01-01T10:00', enviar: (t) => enviados.push(JSON.parse(t)) });
  assert.equal(enviados.length, 1);
  assert.ok(enviados[0].lembretes.every((l) => new Date(l.quando).getMonth() !== 0));
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --test tests/ui/nativo.test.js`
Expected: FAIL (módulo inexistente).

- [ ] **Step 3: Implement `js/ui/nativo.js`** conforme Interfaces e acrescente-o ao `CASCA`.

- [ ] **Step 4: Ligue no app e em Ajustes**

- **`js/app.js`:**
  - quando `noApp()`, chama `reagendar` no fim de `iniciar()`, depois do primeiro desenho;
  - no fim de `salvar()`, com o estado salvo;
  - `enviar` é `(t) => window.ProjetoRAndroid.postMessage(t)`.
- **`js/ui/config.js`, cartão "Lembretes"** (só quando `noApp()`; vem antes de "Sincronização"):
  - interruptor "Lembrar no dia do pagamento";
  - escolha "5º dia útil" / "Dia fixo";
  - campo do dia (1–31, só no fixo);
  - campo de horário (`type="time"`);
  - linha "Próximo lembrete: {descreverProximo}" (ou "Nenhum lembrete agendado");
  - botões "Salvar lembretes" e "Testar agora";
  - ao montar, envia `{tipo:'permissao?'}`. Se a resposta for `concedida: false`, mostra o aviso "As notificações estão bloqueadas. Libere em Configurações do Android › Apps › Projeto R › Notificações." com o botão "Pedir permissão" (`pedirPermissao`);
  - ao salvar: `salvarConfig` e depois `reagendar`.
- **`js/ui/config.js`, backup:** quando `noApp()`, os botões "Exportar backup" e "Importar backup" ficam desabilitados e o cartão de backup mostra "Faça o backup pelo computador."

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: PASS, inclusive `tests/ui/modulos.test.js` (todos os módulos de tela carregam) e `sw.test.js`.

- [ ] **Step 6: Verificação visual no navegador**

Run: `npm run servir` e `node scripts/capturar-telas.mjs <scratchpad>/t5 --rotas config`
Expected: saída 0. Em Ajustes, **não** aparece o cartão "Lembretes" e o backup segue igual, porque o navegador não tem a ponte.

- [ ] **Step 7: Commit**

```bash
git add js css sw.js tests
git commit -m "feat: ponte com o app Android, cartão Lembretes em Ajustes e aviso de backup no app"
```

---

### Task 6: Lembretes na casca (notificações, alarmes e reinício)

**Files:**
- Modify: `android/app/src/main/AndroidManifest.xml` (`POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED` e os receivers)
- Modify: `android/app/src/main/java/io/github/rodolss/projetor/MainActivity.kt` (ponte completa, permissão na 1ª abertura, rota da notificação, remover o toast de diagnóstico)
- Create: `android/app/src/main/java/io/github/rodolss/projetor/Lembretes.kt` (agendar, cancelar e persistir; canal)
- Create: `android/app/src/main/java/io/github/rodolss/projetor/LembreteReceiver.kt`, `android/app/src/main/java/io/github/rodolss/projetor/BootReceiver.kt`

**Interfaces:**
- Consumes: as mensagens da Task 5.
- Produces (`object Lembretes`):
  - `fun criarCanal(ctx)` (id `lembretes`, nome "Lembretes do pagamento", importância padrão);
  - `fun agendar(ctx, json: String)`: guarda a lista em `SharedPreferences("lembretes")`, chave `lista`, cancela os ids da lista anterior e agenda cada item futuro com `AlarmManager.setAndAllowWhileIdle(RTC_WAKEUP, quando, pendingIntent)`. O `requestCode` é o `id`, e o PendingIntent é `FLAG_IMMUTABLE` para `LembreteReceiver`, com `titulo`, `texto` e `rota` como extras;
  - `fun reagendarSalvos(ctx)`: reagenda a lista guardada, só os itens futuros;
  - `fun notificar(ctx, id, titulo, texto, rota)`: só posta se as notificações estiverem permitidas (`NotificationManagerCompat.areNotificationsEnabled`); o toque abre a `MainActivity` com o extra `rota`.
- `LembreteReceiver`: chama `notificar`. `BootReceiver` (`BOOT_COMPLETED`): chama `reagendarSalvos`.
- Ponte em `MainActivity`:
  - `agendar` → `Lembretes.agendar`;
  - `testar` → `notificar(ctx, 999, "Projeto R", <texto principal>, "#/mes")`;
  - `permissao?` → responde `{tipo:'permissao', concedida}` pelo `replyProxy`;
  - `pedirPermissao` → `requestPermissions(arrayOf(POST_NOTIFICATIONS), 1)` no Android 13+ e, no resultado, responde pelo último `replyProxy`.
- Primeira abertura: no Android 13+, sem permissão e com a flag `pediuPermissao` ainda falsa em SharedPreferences, pede a permissão e marca a flag.
- Rota: `onCreate` e `onNewIntent` com o extra `rota` carregam `URL_INICIAL + rota`.

- [ ] **Step 1: Implemente** conforme Interfaces e remova o diagnóstico "Ponte nativa OK" da Task 1.

- [ ] **Step 2: Compile no CI**

Run: `git push`, depois `gh run watch <id> --exit-status` (job `compilar`)
Expected: verde.

- [ ] **Step 3: Commit**

```bash
git add android
git commit -m "feat(android): lembretes com AlarmManager, permissão na primeira abertura e reinício do celular"
```

---

### Task 7: Publicação e teste final com o usuário

**Files:** nenhum novo.

- [ ] **Step 1: PARE e peça ao usuário a autorização para publicar o site.** A Fase 2 mexe em Ajustes, e o app abre o site publicado. Só depois do "pode publicar":
  1. `gh pr create` do ramo `app-android` para `main`;
  2. espere o CI;
  3. `gh pr merge --merge`;
  4. espere o deploy do GitHub Pages terminar (`gh run watch` do run "pages build and deployment").

- [ ] **Step 2: Publique o APK 2**

Run: `git tag android-v2 <commit do merge> && git push origin android-v2`, depois `gh run watch <id> --exit-status`
Expected: Release `android-v2` com `projeto-r.apk`.

- [ ] **Step 3: Passe ao usuário o roteiro final**

1. Baixe e instale o `android-v2` **por cima** do 1. Ele atualiza sem desinstalar, porque a chave é a mesma.
2. Na primeira abertura, aceite as notificações.
3. Em Mais › Ajustes › Lembretes, confira "Próximo lembrete: …" e toque em "Testar agora". A notificação chega e, ao tocar nela, o app abre na tela do Mês.
4. Opcional: marque um dia fixo de hoje, com horário daqui a 5 minutos, espere a notificação, depois volte ao padrão e salve.
5. Reinicie o celular e confira que "Próximo lembrete" continua igual.
6. Desinstale a versão instalada pelo Chrome.

Expected: o usuário confirma os passos 1 a 3. Qualquer falha passa por superpowers:systematic-debugging.
