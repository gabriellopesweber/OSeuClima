# Catálogo de composables e stores do projeto

> Inventário local. Regras de *como* criar/onde morar: `.claude/rules/shared/composables.md`.
> **Atualizar no mesmo PR** que cria ou muda a API de um composable.

## Composables — verificar antes de criar novos

### `core/` — primitivas adotadas do scaffold

Copiadas de `vue-claude-rules/scaffold/`, sem modificação. São código do projeto a partir daqui.

| Composable | Retorna | Usar para |
|---|---|---|
| `useSnackbar` | `snackbar`, `showMessage(text, color)`, `hideMessage()` | Toast de resultado de ação. Renderizado pelo `GlobalSnackbar`, montado uma vez no `App.vue` |
| `useAsync(fn, options)` | `{ data, loading, error, execute }` | Envolver chamada async com estado + toast de erro. Base de todo service |

O que **não** foi adotado: `useAlertManager`/`GlobalAlertStack` (nenhuma mensagem precisa persistir até o usuário resolver), `useValidation` (só há um campo de texto, sem regra), `useAppTheme` (tema único). Não adote por antecipação — o gatilho de cada peça está em `shared/scaffold.md`.

> `useAsync` lê `err?.response?.data?.code` para `silentErrorCodes`, formato do axios. Com `fetch` isso é sempre `undefined` e degrada sem efeito — mantido igual ao scaffold de propósito, para não divergir da origem sem motivo.

### `weather/` — os três da única tela

| Composable | Retorna | Usar para |
|---|---|---|
| `useWeather(demoCategory)` | `phase`, `isLoading`, `notice`, `place`, `measures`, `category`, `isDay`, `windSpeed`, `season`, `hourly`, `searchTerm`, `searchBusy`, `searchError`, `load()`, `locate()`, `search()` | Todo o estado do clima: carga inicial, geolocalização com fallback para São Paulo, busca por cidade e modo demonstração. Consome `useWeatherService` — não fala com repository direto |
| `useWeatherScene(canvasRef, { category, isDay, wind, season, reducedMotion })` | nada (efeito) | Amarrar a cena 3D ao ciclo de vida da view: cria no `onMounted`, reage às refs por `watch`, observa resize e faz `dispose()` no unmount. Única porta de entrada para o Three.js |
| `useWeatherSettings()` | `units`, `demoCategory`, `seasonOverride`, `reducedMotion` | Preferências da sessão. `reducedMotion` nasce respeitando `prefers-reduced-motion` do sistema; `seasonOverride` em `'auto'` deixa a data e a latitude decidirem |

**São factories, não singletons** — o estado nasce dentro da função, uma instância por montagem da view.

`useWeather` recebe `demoCategory` **por injeção** (a ref vem de `useWeatherSettings`) em vez de importar o outro composable: mantém os dois independentes e testáveis, e é o `watch` interno que recarrega quando o cenário muda.

`searchBusy` é `computed` sobre o `loading` do service — o composable não mantém uma flag paralela.

## Onde mora o composable

Os de domínio ficam em `src/composables/weather/`, as primitivas em `src/composables/core/`. Composable que só orquestre uma view específica deve ser co-localizado em `src/views/{feature}/composables/` — hoje não há nenhum, porque a view é fina o bastante para não precisar de orquestrador.

## Lógica pura — não é composable

`src/utils/season.js` resolve a estação a partir de data + latitude (ver `stack.md`); `useWeather` guarda a latitude de onde a previsão veio e expõe `season` já resolvida.

Conhecimento de domínio sem reatividade fica em `src/utils/weather.js`: `categorizeWeatherCode` (código WMO → condição), `WEATHER_ICONS`, `DEMO_MEASURES`, os conversores `convertTemperature`/`convertWind` e os **construtores de chave** `conditionLabelKey`/`taglineKey`/`temperatureUnitKey`/`windUnitKey`.

**Texto nunca sai daqui pronto** — o util devolve a chave i18n e quem traduz é o componente. Foi assim que as condições e taglines saíram de constantes em português para `weather.conditions.*` / `weather.taglines.*`.

Coberto por `src/utils/test/weather.test.js`.

## Pinia — stores existentes

**Nenhuma. O projeto não usa Pinia** — divergência deliberada de `shared/composables.md`, que a própria regra permite: com uma tela só não há estado global, e a seção de persistência da regra diz para não instalar Pinia só para guardar preferência. Se um dia houver estado compartilhado entre rotas, aí sim.
