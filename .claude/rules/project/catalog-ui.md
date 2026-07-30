# Catálogo de UI do projeto

> Inventário local. Regras de *como/quando*: `.claude/rules/shared/dry.md`.
> **Atualizar no mesmo PR** que muda o código correspondente.

## `src/components/ui/`

| Componente | O que é / quando usar | API |
|---|---|---|
| `GlobalSnackbar` | Toast global de resultado de ação. Copiado do scaffold, **montado uma única vez no `App.vue`** — nunca instanciar de novo. Não se chama direto: use `useSnackbar().showMessage(texto, cor)` | Sem props |

O resto da UI pertence à única tela do app e mora co-localizado em `src/views/weather/components/` (ver abaixo).

O critério para promover um componente para cá: o padrão passa a aparecer em **2+ telas**. Enquanto houver uma rota só, promover é antecipação — o componente ganharia props para um segundo caso que não existe. Ao criar o primeiro, registre-o aqui **no mesmo commit**.

## Feedback ao usuário — o que existe

Ver `.claude/rules/shared/feedback.md` para *quando* usar cada mecanismo. Neste projeto:

| Mensagem | Mecanismo | Exemplo |
|---|---|---|
| Falha de operação | `useSnackbar` (via `errorMessage` do `useAsync`) | não deu para carregar a previsão |
| Aviso persistente e reativo a um estado | `WeatherNotice`, a tarja da própria tela | geolocalização negada, modo demonstração |
| Erro ancorado a um campo | texto abaixo do campo de busca | cidade não encontrada |

**Não há `GlobalAlertStack` nem `InlineAlert`** — nenhuma mensagem deste app precisa persistir até o usuário resolver, e a única mensagem ancorada a campo é uma linha de texto. Não adote por antecipação.

## `src/views/weather/components/` — componentes da tela de clima

| Componente | O que é / quando usar | API |
|---|---|---|
| `WeatherSummaryCard` | Cartão branco principal: chip da condição, cidade, temperatura grande, tagline e as 3 medidas (sensação/umidade/vento). Recebe os objetos crus e formata internamente. | Props: `place` (required), `measures` (required), `units` (default: `'metric'`) |
| `WeatherHourlyStrip` | Faixa horizontal rolável com as próximas horas. Vazia se `items` for `[]`. | Props: `items` (default: `[]`), `units` (default: `'metric'`) |
| `WeatherSearchField` | Pílula branca de busca de cidade — input + botão. Não busca sozinho: emite e a view decide. | v-model: `String` (termo) · Props: `busy` · Emits: `search` |
| `WeatherSettingsMenu` | Menu de preferências: unidade °C/°F, cenário, estação e animações reduzidas. Os dois selects usam a API nativa do `VSelect` (`title`/`value`/`props` por item) — **não** recriar o slot `#item`, que renderiza a lista vazia | v-model: `units`, `demoCategory`, `seasonOverride`, `reducedMotion` |
| `WeatherNotice` | Tarja de aviso persistente (geolocalização negada, modo demonstração) com ação de repetir. | Props: `text` (required) · Emits: `retry` |
| `WeatherLoadingOverlay` | Véu sobre a tela enquanto a primeira leitura carrega. Sem props. | — |

Todos assumem que estão **sobre a cena 3D**: fundo claro semitransparente e sombra generosa. Quem criar outro elemento flutuante deve seguir o mesmo tratamento, senão ele some no céu claro.

### Animação de entrada

Nenhuma lib de animação — `<Transition>`/`<TransitionGroup>` do Vue com CSS dão conta, e a cena 3D anima por conta própria (ver `stack.md`).

- **`WeatherSummaryCard`** entra pela `<Transition name="card-swap" mode="out-in">` da view, com `:key` em cidade+condição. Trocar °C/°F **não** remonta o cartão, de propósito: mudam os números, não a tela. O componente não tem animação própria — se ganhar uma, as duas rodam juntas.
- **`WeatherHourlyStrip`** é um `<TransitionGroup>` com escalonamento por índice, via `--enter-delay` no `style` de cada item; `.hourly-move` cuida do reposicionamento.

Motion reduzido é global (`.motion-reduced` na página + `prefers-reduced-motion`), aplicado em `src/styles/main.css` — **não** repita media query de motion em componente.

## Layout da tela

`WeatherView.vue` empilha o `canvas` (cena) e um overlay flex. O overlay tem `pointer-events: none` e **só os filhos diretos das linhas** reativam o clique — se um elemento novo não responder ao mouse, é isso: adicione-o à regra `pointer-events: auto` no `<style scoped>` da view.

## Componentes Vuetify

Todos registrados globalmente (`import * as components` em `src/plugins/vuetify.js`) — não há import a fazer no `.vue`, nem wrapper local de nenhum deles. Antes de criar componente, verifique se o Vuetify já resolve; os defaults de arredondamento/densidade já vêm aplicados (ver `stack.md`).

## Views

| View | Rota | O que é |
|---|---|---|
| `src/views/weather/WeatherView.vue` | `/` (`weather`) | Única tela do app. Monta a cena 3D, orquestra os composables e posiciona os componentes acima. Sem regra de negócio própria. |

O shell (`v-app`/`v-main`) mora em `src/App.vue` e não faz mais nada — sem app bar, sem navegação.
