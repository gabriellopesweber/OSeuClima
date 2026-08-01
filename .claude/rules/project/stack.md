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
| Vegetação por estação | `season-{spring,summer,autumn,winter}-ground` e `-leaf` |
| Cena 3D — fixos | `scene-hill`, `scene-trunk`, `scene-sun`, `scene-sun-glow`, `scene-raindrop`, `scene-snowflake`, `scene-lightning`, `scene-night-bounce` |
| Céu por horário | `scene-dusk-sky-top`, `scene-dusk-sky-bottom`, `scene-sun-low` — o crepúsculo, misturado por peso, não por troca |
| Lua e estrelas | `scene-moon`, `scene-moon-dark`, `scene-moon-glow`, `scene-star` |

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

### A estação pinta a vegetação

`src/utils/season.js` resolve a estação a partir da **data e da latitude** — estações meteorológicas (blocos de três meses), invertidas abaixo do equador. Sem latitude conhecida assume hemisfério **sul**: o app é pt-BR, e errar para o outro lado mostraria outono em pleno verão.

Três superfícies são vegetação e mudam juntas, senão o cenário se contradiz (árvore laranja sobre morro verde-vivo):

| Superfície | Como |
|---|---|
| Folhagem | vem **inteira** da estação (`season-<estação>-leaf`) |
| Chão | cor da condição **misturada** com `season-<estação>-ground`, no peso `seasonBlend` da paleta |
| Colinas | `scene-hill` misturado com o mesmo chão da estação |

`seasonBlend` é **zero na neve**: neve acumulada cobre a vegetação, então a estação não deve aparecer por baixo dela. A condição continua carregando a luz e a umidade do tempo; a estação só puxa a cor.

O usuário pode forçar a estação nas preferências (`seasonOverride`) — sem isso o efeito só seria visível três meses por ano.

### O céu segue o relógio e o lugar

O sol fica **onde ele de fato está** para o instante e as coordenadas, e à noite a lua aparece com **a fase desenhada de verdade**. É a mesma aposta da estação: errar o lado do nascente denuncia o produto na hora.

**A matemática mora em `src/utils/celestial.js`** — algoritmo NOAA/SunCalc portado à mão, função pura, sem dependência. Convenções mantidas iguais às do SunCalc para o código ser conferível contra a fonte: `azimuth` medido **do sul, crescendo para oeste**; `phase` 0 = nova, 0,5 = cheia; `angle` = direção do meio do limbo aceso, para leste a partir do norte do disco. Refração não é aplicada — vale ~0,5° junto ao horizonte e some na compressão do domo.

`moonPhaseKey(phase)` devolve **chave**, não texto, como `conditionLabelKey`.

**O domo é comprimido, e isso é deliberado.** O meio-FOV horizontal vai de 39° (paisagem) a ~11° (retrato), mas o azimute real varre 360°: um sol posto literalmente fica fora da tela quase o dia inteiro. Então, em `src/scene/skyPlacement.js`:

| Eixo | Tratamento |
|---|---|
| Altura | **literal** — `y = HORIZON_Y + sin(altitude) · ARC_HEIGHT` |
| Rumo | **comprimido** — `bearing · spread`, com `spread` interpolado ao lado do `squeeze` em `frameForAspect()` (0,35 → 0,16) |

**A inversão de hemisfério não precisa de troca de sinal.** A câmera olha para o lado do equador — norte no hemisfério sul, sul no norte —, então basta mudar o que é "para frente"; como o azimute a partir do sul cresce para oeste (horário visto de cima), o resto sai sozinho. No sul o sol nasce **à direita** e atravessa para a esquerda; no norte, o contrário. Medido: em São Paulo o disco fica em `nx = +0,38`, em Lisboa em `−0,39`, no mesmo amanhecer.

**O terminador é uma semi-elipse exata**, não uma aproximação: `src/scene/moonPhase.js` desenha meio disco (o limbo aceso) mais uma semi-elipse de semieixo `|1 − 2·fraction|`. O que separa foice de gibosa é **só o sentido da varredura** (`terminatorSweep`) — e trocá-lo desenha a fase complementar com área plausível, invisível a olho. Foi assim que uma gibosa de 0,74 saiu como foice de 0,26. Como o `jsdom` não implementa canvas, quem pega isso é a verificação por captura, não a suíte.

**O ângulo paralático é o que faz a foice tombar certo.** `rotation.z = −(illumination.angle − parallacticAngle)` dá a inclinação do limbo relativa ao zênite. Sem ele a lua tomba igual nos dois hemisférios, que é errado e discreto. Medido no mesmo instante: São Paulo e Lisboa diferem 128° na tela, contra 130° previstos.

**O dia é uma curva, não um degrau.** `is_day` da API não comanda mais nada; quem comanda é a altitude solar:

```
daylight = smoothstep(−6°, +6°, altitudeSolar)
```

Ela dirige o escurecimento do céu, as duas luzes, as estrelas e a presença da lua. Com `|altitude| < 10°`, céu e sol puxam para `scene-dusk-*` e `scene-sun-low` no peso `1 − |altitude|/10°` — é a hora dourada, e ela existe porque a altitude é contínua.

**`palette.openSky` substituiu `palette.sun`**: agora libera sol, lua **e** estrelas de uma vez, e o nome antigo mentiria. Chuva, tempestade, neve e neblina tampam os três — lua nítida sobre temporal não existe.

**Rumo interpolado é ângulo, mas não é invariante a 2π.** `approachAngle` reduz o resultado a (−π, π] a cada passo, e isso não é cosmético: o rumo é multiplicado por `spread` antes de virar posição, e essa multiplicação não sobrevive a uma volta inteira. Sem a redução, uma sequência de alvos (a app carrega num lugar, a geolocalização resolve para outro) deixa o valor uma volta abaixo do alvo — igual como ângulo, convergido para o damping, e ainda assim do outro lado do céu. Foi exatamente assim que uma lua a nordeste apareceu a oeste.

**O horário é forçável** (`timeOverride`: auto/amanhecer/meio-dia/entardecer/noite), pela mesma razão que a estação: sem isso o céu só se mostraria como estava na hora da visita, e a lua nunca de dia. `useCelestial` resolve cada horário varrendo o dia em passos de 5 min — 288 avaliações de uma função barata, só quando o seletor muda, e sem precisar aproximar a equação do tempo.

### Adicionar uma condição de tempo

1. Tokens `scene-<nova>-*` e `weather-<nova>` em `src/plugins/vuetify.js`
2. Entrada em `PALETTES` no `src/scene/weatherScene.js`, **com `seasonBlend`**
3. Códigos WMO em `CODES_BY_CATEGORY` + label/tagline/ícone em `src/utils/weather.js`

## Three.js — o que não é óbvio

O protótipo de origem foi escrito para o Three r128; o projeto usa r185. Duas correções que **não** podem ser desfeitas:

- **Luz é física desde o r155.** As intensidades herdadas só reproduzem o brilho original multiplicadas por π — é o que `LEGACY_LIGHT_SCALE` faz. Remover a constante escurece a cena inteira.
- **`CanvasTexture` de céu precisa de `colorSpace = SRGBColorSpace`.** Sem isso o gradiente sai dessaturado.
- **`Clock` está deprecado desde o r183** — a cena usa `Timer`, que além de não avisar no console traz a Page Visibility API (`timer.connect(document)`): em aba oculta ele congela, então voltar não produz um delta gigante que teleporta nuvem e partícula. O `Timer` precisa de `timer.update(timestamp)` uma vez por frame e é descartado no `dispose()`.

O `dispose()` devolve geometrias, materiais, textura e renderer — é para isso que existe a lista `disposables`; ao criar material/geometria novos, registre com `track()`.

- **`squeeze` é declarado no topo da fábrica, antes de tudo que o consome.** `scatterParticle` e a criação das nuvens rodam ainda na montagem; um `let` mais abaixo dá `ReferenceError` por temporal dead zone. Como o `useWeatherScene` envolve a criação num `try/catch`, o sintoma não é um erro — é a **cena preta**, com o canvas parado no tamanho padrão de 300×150. Foi exatamente assim que quebrou uma vez. O `catch` agora faz `console.error`, que é o que separa "não tem WebGL" de "tem bug".

### Enquadramento por aspecto — o que faz a cena existir no celular

O FOV vertical é fixo, então o horizontal encolhe com o aspecto. Sem tratamento, num celular em pé ele cai de 78° para 22° e **nenhuma árvore ou colina entra no quadro** — sobra chão e céu vazios.

Nenhuma alavanca isolada resolve: manter o FOV horizontal exigiria ~120° verticais (distorção grotesca), e afastar só a câmera exigiria z≈38 (o cenário vira miniatura). Por isso são duas, ambas em `frameForAspect()`, chamada do `resize()` — que já está no `ResizeObserver`, então girar o aparelho passa por ali:

| Alavanca | De → até (paisagem → retrato) |
|---|---|
| FOV vertical | 45° → 56° |
| Distância da câmera (`z`) | 11 → 13,5 |
| Altura do alvo (`targetY`) | 1,5 → 0,5 — inclina para baixo, sobe o horizonte e deixa as árvores acima do cartão |
| `squeeze` | 1 → 0,38 |

**`squeeze` mexe em `position.x`, nunca em `scale`.** Escalar o grupo `decor` no eixo x achataria a geometria das árvores junto — elas ficariam finas. O x original mora em `userData.baseX`, e é o que permite reaplicar a cada resize sem acumular erro. O espalhamento e o wrap das nuvens e das partículas acompanham o mesmo fator, senão a chuva cairia quase toda fora do quadro.

### Orçamento de GPU, separado de `reducedMotion`

São gatilhos diferentes que cortam a mesma coisa e **não podem ser fundidos**: `reducedMotion` é acessibilidade e desacelera a cena (`speed = 0.4`); reusá-lo para desempenho deixaria o celular em câmera lenta.

O tier baixo (`lowPower`) sai de `min(largura, altura) <= 620` ou `dpr >= 2` e corta contagem de partículas (reusando as constantes `REDUCED_*`) e `setPixelRatio` para 1,5. O `antialias` é decidido junto — `dpr < 2` —, e só ali: **não é ajustável depois da construção do renderer**.

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
| `src/utils/test/season.test.js` | Estação por mês nos dois hemisférios, inversão abaixo do equador, fallback sem latitude e virada de dezembro |
| `src/utils/test/celestial.test.js` | Posição do sol e da lua e fase lunar, ancoradas em fatos exatos: altitude de meio-dia no equinócio é `90 − |latitude|`, nascente a leste, solstício de junho maior no norte, período sinódico de 29,53 dias, lua nova de referência de Meeus, e os 8 baldes de `moonPhaseKey` |
| `src/scene/test/skyPlacement.test.js` | Domo comprimido: nascente à direita no sul e à esquerda no norte, meio-dia no centro e no alto, astro abaixo do horizonte abaixo da linha |
| `src/scene/test/moonPhase.test.js` | Geometria do terminador: posição e largura por fase, lua nova sem nada aceso, e o **sentido da varredura** amarrado à metade do ciclo |
| `src/composables/weather/test/useCelestial.test.js` | Varredura dos horários fixos: meio-dia no pico, noite no fundo, amanhecer e entardecer distinguidos pelo sentido, e noite polar sem travar |

O que se mocka é a **borda**: `@/services/weather/useWeatherService` e `vue-i18n` (o `t` devolve a própria chave, então o teste asserta a chave e não sofre com mudança de texto). O repository e o `fetch` nunca são chamados.

**Watcher de composable solto:** `useWeather` usa `watch` com flush `pre` padrão. Ele **não** dispara síncrono, mas flusha num `await nextTick()` — verificado neste projeto, não precisa de componente host. Se um dia precisar de `onMounted`/`provide`, aí sim adote `withSetup` do scaffold com `// @vitest-environment jsdom`.

A cena 3D **não é testada** por unidade: precisa de WebGL. O que dava para isolar — damping, colocação no domo, geometria do terminador, efemérides — foi extraído para módulos puros e testado lá; o resto é verificado rodando o app (ver README).

**O que só a captura pega.** Dois erros desta feature passaram por lint, por 111 testes verdes e pelo olho, e só caíram na medição de pixel sobre a cena renderizada: o sentido da varredura do terminador (gibosa desenhada como foice, área plausível) e o rumo uma volta abaixo do alvo (lua convergida e no lado errado do céu). Ambos ganharam teste depois; nenhum dos dois **poderia** ter começado por um. Para mudança que mexe em posição de astro ou em desenho de fase, medir a captura — fração acesa sobre a área do disco, centroide em relação ao centro, lado do nascente — é parte do trabalho, não zelo extra.

## CI

Só o job de deploy, que roda **`pnpm lint` e `pnpm test` antes do build**: teste vermelho barra a publicação. Manter a suíte verde não é opcional.
