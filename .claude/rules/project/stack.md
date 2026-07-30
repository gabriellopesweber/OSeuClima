# Configuração da stack deste projeto

> Inventário local. Regras de *como/quando*: as regras de `.claude/rules/shared/`.
> **Atualizar no mesmo PR** que muda o código correspondente.

## O que este projeto é

**Produto de uma tela só.** Mostra o clima atual + próximas 6 horas sobre um cenário 3D animado que reage à condição do tempo e ao dia/noite. Sem backend próprio, sem login, sem estado global: consome duas APIs públicas e guarda tudo em `ref` dentro da view.

Consequências para quem trabalha aqui:

- **A cena 3D é metade do produto.** Mexer no visual quase sempre é mexer em `src/scene/` + nos tokens do tema, não em CSS de componente.
- **Não instale infraestrutura para "seguir o padrão".** Sem Pinia, sem axios, sem vue-i18n, sem suíte de teste — cada uma foi decisão consciente (ver seções abaixo). Se uma virar necessária de verdade, proponha antes.
- **Uma rota.** Não há shell, menu nem layout compartilhado para manter.

## Cores — o tema é a fonte única

Tema único `clima` (`defaultTheme: 'clima'`, `dark: false`), definido em `src/plugins/vuetify.js`, que faz merge sobre o tema `light` do Vuetify. Tokens declarados por este projeto, além dos do tema padrão:

| Grupo | Tokens |
|---|---|
| Base | `background`, `surface`, `surface-muted`, `on-surface`, `on-surface-muted`, `on-surface-subtle`, `outline-variant`, `primary`, `error` |
| Acento por condição | `weather-{clear,cloudy,rain,storm,snow,fog}` — dirige o chip do `WeatherSummaryCard` |
| Cena 3D — por condição | `scene-{condição}-sky-top`, `-sky-bottom`, `-ground`, `-cloud` para as 6 condições, mais `scene-fog-veil` |
| Cena 3D — fixos | `scene-hill`, `scene-trunk`, `scene-leaf`, `scene-sun`, `scene-sun-glow`, `scene-raindrop`, `scene-snowflake`, `scene-lightning`, `scene-night-bounce` |

Token que não está nesta tabela nem na lista do tema padrão (`shared/vuetify.md`) **não existe** — vira cor vazia, sem erro.

### `background` é escuro aqui, e isso tem consequência

`background: #12181F` é o breu atrás do canvas 3D, não uma superfície de conteúdo. Como o `on-background` é derivado por contraste, ele vira **branco** — e `shared/vuetify.md` explica o resto: `text-medium-emphasis` e `text-high-emphasis` derivam de `on-background`, então **saem brancos e somem** sobre os cartões claros desta tela.

Por isso, para texto sobre superfície clara, use as classes de token nu — `on-surface`, `on-surface-muted`, `on-surface-subtle` — e **não** `text-medium-emphasis`. Foi essa troca que deixou a faixa horária branca sobre branco na primeira versão.

Pelo mesmo motivo `.weather-page` pinta o fundo por CSS (`background: rgb(var(--v-theme-background))`) em vez de usar a classe `bg-background`: a classe traria junto `color: on-background`, que vazaria branco para todo descendente que não fosse `v-card`.

### Como a cena 3D consome o tema

Material de WebGL não aceita classe CSS. `src/scene/themeColor.js` lê o token na origem (`--v-theme-<token>`, publicado pelo Vuetify como `R,G,B`) e devolve:

- `sceneColor(token, darken)` → `THREE.Color`, para material/luz
- `toCssColor(color)` → `#rrggbb`, para o gradiente do céu pintado num `<canvas>` 2D

`darken` é aplicado **em sRGB**, não no espaço linear: é assim que o protótipo escurecia o céu à noite, e multiplicar em linear deixaria a noite bem mais escura que o desenho original.

É a mesma abordagem que a regra compartilhada prescreve para alimentar um renderer de canvas a partir do tema. **Cor nova na cena entra como token no `colors`**, nunca como hex no `weatherScene.js`. Token ausente aparece em magenta — é proposital, para a falha ser óbvia.

### A troca de cenário é interpolada, não atribuída

`setWeather()` **não mexe na cena** — ele só reescreve o objeto `target`. Quem interpola é o loop, por damping exponencial (`src/scene/interpolate.js`), convergindo `live` → `target` a cada frame.

Por que damping e não uma timeline de duração fixa: se o usuário trocar de cenário no meio da transição, o valor apenas passa a convergir para o novo alvo. Não há tween a cancelar nem corte. E o damping é independente de frame-rate — dois passos de `dt/2` dão exatamente o mesmo resultado que um de `dt` (coberto por teste).

Interpolam: as duas cores do céu, chão, nuvens, cor da neblina, densidade da neblina, as duas intensidades de luz, presença do sol e de **cada** nuvem, a opacidade das partículas e o **vento**.

### O vento medido move a cena

`setWind(kmh)` recebe o `windSpeed` da previsão; `src/scene/wind.js` normaliza para 0..1 com teto em 45 km/h (acima disso a cena só ficaria mais rápida, não mais legível). Esse valor dirige três coisas, todas em `WIND`:

| Efeito | Como |
|---|---|
| Velocidade das nuvens | multiplicador `cloudBase + vento * cloudRange` — a base existe porque nuvem parada parece bug, não calmaria |
| Inclinação da chuva/neve | empurrão lateral por frame; sem ele 35 km/h cai tão a prumo quanto calmaria. As partículas dão a volta em `PARTICLE_WRAP_X` |
| Balanço das folhas | seno com amplitude e frequência do vento, **defasado por árvore** — em uníssono deixa de parecer vento |

Medido em cenários de mesma contagem de nuvens (chuva 22 km/h × tempestade 35 km/h): as nuvens andaram 8 px e 11 px em 600 ms, razão 1,38× contra 1,44× teórica.

Três detalhes que existem por um motivo e não devem ser "simplificados":

- **A neblina fica sempre montada** (`scene.fog` nunca vira `null`), com `far` distante quando desligada. Alternar entre `null` e `Fog` força recompilação de shader e trava um frame bem no meio da transição.
- **Partícula só troca de tipo com a anterior invisível** — senão chuva vira neve no ar, no meio da queda.
- **O céu só é repintado quando a cor se moveu** mais de ~1/512. Abaixo disso a diferença não sobrevive aos 8 bits da textura, e repintar seria upload de textura por frame, para sempre.

Ao adicionar algo que muda com a condição do tempo, ponha em `target` e deixe o `stepTransition` levar — atribuir direto ao objeto do three é o que produz o corte seco que essa camada existe para eliminar.

**Motion reduzido:** a cena usa `LAMBDA_REDUCED` (convergência quase imediata) e desliga a rajada; o DOM é coberto pelo interruptor global em `src/styles/main.css` (`.motion-reduced` + `prefers-reduced-motion`).

### Adicionar uma condição de tempo

1. Tokens `scene-<nova>-*` e `weather-<nova>` em `src/plugins/vuetify.js`
2. Entrada em `PALETTES` no `src/scene/weatherScene.js`
3. Códigos WMO em `CODES_BY_CATEGORY` + label/tagline/ícone em `src/utils/weather.js`

## Three.js — o que não é óbvio

O protótipo de origem foi escrito para o Three r128; o projeto usa r185. Duas correções que **não** podem ser desfeitas:

- **Luz é física desde o r155.** As intensidades herdadas só reproduzem o brilho original multiplicadas por π — é o que `LEGACY_LIGHT_SCALE` faz. Remover a constante escurece a cena inteira.
- **`CanvasTexture` de céu precisa de `colorSpace = SRGBColorSpace`.** Sem isso o gradiente sai dessaturado.
- **`Clock` está deprecado desde o r183** — a cena usa `Timer`, que além de não avisar no console traz a Page Visibility API (`timer.connect(document)`): em aba oculta ele congela, então voltar não produz um delta gigante que teleporta nuvem e partícula. O `Timer` precisa de `timer.update(timestamp)` uma vez por frame e é descartado no `dispose()`.

O `dispose()` devolve geometrias, materiais, textura e renderer — é para isso que existe a lista `disposables`; ao criar material/geometria novos, registre com `track()`.

## Prefixo de persistência

**Nenhuma chave persistida** — não há `localStorage`/`sessionStorage` no `src/`. As preferências (unidade, cenário, animações reduzidas) vivem só na sessão, em `useWeatherSettings`.

Ao introduzir a primeira, use o prefixo `oseuclima_` e registre aqui.

## Autenticação / `api.js`

Não há `src/services/api.js` e **não há axios** — as APIs são públicas e sem credencial. Ver a divergência escrita em `catalog-data.md`.

## Defaults de componentes (`src/plugins/vuetify.js`)

| Componente | Defaults aplicados |
|---|---|
| `VCard` | `rounded: 'xl', elevation: 0` |
| `VBtn` | `rounded: 'lg', flat: true` |
| `VTextField` | `rounded: 'lg', density: 'comfortable', autocomplete: 'off'` |
| `VAutocomplete` | `rounded: 'lg', density: 'comfortable', autocomplete: 'off'` |
| `VNumberInput` | `rounded: 'lg', density: 'comfortable'` |

Registro **global** de `components`/`directives` (`import * as`) — qualquer componente Vuetify pode ser usado sem import, ao custo de levar o bundle inteiro. Trocar por auto-import é otimização legítima.

**Tema único** — não construir toggle dark/light por conta própria. O que muda com o horário é a **cena** (`isDay`), não o tema da UI.

## Fontes

`Baloo 2` (display) e `Manrope` (corpo), carregadas por `<link>` no `index.html`. `src/styles/main.css` aplica Manrope no `.v-application` e expõe `.font-display` para os números grandes. **Não existe `theme.fonts` no Vuetify 4** — configurar fonte ali não tem efeito.

## i18n

**vue-i18n, um idioma: `pt-BR`.** Não há seletor de idioma — o objetivo aqui é manter o texto fora do código, não traduzir para outras línguas (ainda).

```
src/locales/pt-BR/
├── common.json     # app_name, retry, search, close, empty_measure
└── weather.json    # tudo da tela: search, settings, conditions, taglines, notices, errors, units, stats
```

`src/plugins/i18n.js` faz deep merge via `import.meta.glob('../locales/**/*.json', { eager: true })` — **criar o arquivo já o carrega**, não há registro manual. O idioma sai do nome da pasta.

Regras locais:

- **Chave, não texto, sai do `src/utils/weather.js`.** `conditionLabelKey(category)` devolve `weather.conditions.<categoria>`; quem chama `t()` é o componente. Categoria nova exige rótulo **e** tagline no locale — há teste que falha se faltar (`src/locales/test/messages.test.js`).
- `weather.notices.denied` usa interpolação `{city}`; o teste garante que o placeholder não se perca numa reescrita.
- Símbolos de unidade (`°C`, `km/h`) também moram no locale (`weather.units.*`), para não voltarem como literal no template.

> O i18n-ally do VS Code pode acusar "key does not exist" logo depois de criar um arquivo de locale — é cache do editor. A verdade é `pnpm test`.

## Scripts

| Script | O que faz |
|---|---|
| `pnpm dev` | `vite --mode development` (lint em tempo real via `vite-plugin-checker`) |
| `pnpm build-dev` | `vite build --mode development` |
| `pnpm build-prod` | `vite build --mode production` — usa `base: /OSeuClima/` |
| `pnpm preview` | `vite preview` |
| `pnpm lint` / `pnpm lint:fix` | `eslint "./src/**/*.{js,vue}"` |
| `pnpm test` / `pnpm test:watch` | Vitest |
| `pnpm rules:sync` / `pnpm rules:check` | sincroniza/valida `.claude/rules/shared/` |

## Deploy

**GitHub Pages**, por `.github/workflows/deploy.yml`, a cada push em `master` (o job roda `pnpm lint` e `pnpm test` antes do build). O Pages serve o site em `/OSeuClima/`, então:

- `vite.config.js` usa `base: '/OSeuClima/'` em produção (sobrescrevível por `BASE_PATH`, para domínio próprio)
- o workflow copia `index.html` para `404.html`, porque o Pages não tem fallback de SPA
- geolocalização exige HTTPS — o Pages já serve em HTTPS

## Testes

**Vitest**, `pnpm test` (run único) e `pnpm test:watch`. Ambiente padrão `node`; `include` é `src/**/test/**/*.{test,spec}.js` — **fora de uma pasta `test/` o arquivo não roda**.

| Suíte | O que cobre |
|---|---|
| `src/utils/test/weather.test.js` | Mapa WMO → condição (incluindo código desconhecido), conversão de unidade, zero como valor real vs medida ausente, construtores de chave |
| `src/composables/weather/test/useWeather.test.js` | Modo demonstração, busca por cidade (sucesso, não encontrada, falha de rede, termo vazio), recorte da faixa horária, fallback de geolocalização |
| `src/locales/test/messages.test.js` | Todo categoria tem rótulo e tagline; placeholder `{city}` preservado; nenhuma chave vazia |
| `src/scene/test/interpolate.test.js` | Damping: converge sem passar do alvo, não anda com `dt` zero/negativo, e é independente de frame-rate |
| `src/scene/test/wind.test.js` | Normalização do vento: cresce, satura no teto, e trata medida ausente/negativa como calmaria em vez de propagar `NaN` para a cena |

O que se mocka é a **borda**: `@/services/weather/useWeatherService` e `vue-i18n` (o `t` devolve a própria chave, então o teste asserta a chave e não sofre com mudança de texto). O repository e o `fetch` nunca são chamados.

**Watcher de composable solto:** `useWeather` usa `watch` com flush `pre` padrão. Ele **não** dispara síncrono, mas flusha num `await nextTick()` — verificado neste projeto, não precisa de componente host. Se um dia precisar de `onMounted`/`provide`, aí sim adote `withSetup` do scaffold com `// @vitest-environment jsdom`.

A cena 3D **não é testada** por unidade: precisa de WebGL. O que dava para isolar — a matemática do damping — foi extraído para `interpolate.js` e testado lá; o resto é verificado rodando o app (ver README).

## CI

Só o job de deploy, que roda **`pnpm lint` e `pnpm test` antes do build**: teste vermelho barra a publicação. Manter a suíte verde não é opcional.
