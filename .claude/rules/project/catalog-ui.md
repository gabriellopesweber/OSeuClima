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
| `WeatherSettingsMenu` | Menu de preferências (unidade °C/°F, cenário, animações reduzidas). Superfície das três opções que o protótipo expunha como props. | v-model: `units`, `demoCategory`, `reducedMotion` |
| `WeatherNotice` | Tarja de aviso persistente (geolocalização negada, modo demonstração) com ação de repetir. | Props: `text` (required) · Emits: `retry` |
| `WeatherLoadingOverlay` | Véu sobre a tela enquanto a primeira leitura carrega. Sem props. | — |

Todos assumem que estão **sobre a cena 3D**: fundo claro semitransparente e sombra generosa. Quem criar outro elemento flutuante deve seguir o mesmo tratamento, senão ele some no céu claro.

## Layout da tela

`WeatherView.vue` empilha o `canvas` (cena) e um overlay flex. O overlay tem `pointer-events: none` e **só os filhos diretos das linhas** reativam o clique — se um elemento novo não responder ao mouse, é isso: adicione-o à regra `pointer-events: auto` no `<style scoped>` da view.

## Componentes Vuetify

Todos registrados globalmente (`import * as components` em `src/plugins/vuetify.js`) — não há import a fazer no `.vue`, nem wrapper local de nenhum deles. Antes de criar componente, verifique se o Vuetify já resolve; os defaults de arredondamento/densidade já vêm aplicados (ver `stack.md`).

## Views

| View | Rota | O que é |
|---|---|---|
| `src/views/weather/WeatherView.vue` | `/` (`weather`) | Única tela do app. Monta a cena 3D, orquestra os composables e posiciona os componentes acima. Sem regra de negócio própria. |

O shell (`v-app`/`v-main`) mora em `src/App.vue` e não faz mais nada — sem app bar, sem navegação.
