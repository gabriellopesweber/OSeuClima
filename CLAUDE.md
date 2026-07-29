# O Seu Clima

App de previsão do tempo: mostra o clima da sua região sobre um cenário 3D (Three.js) que muda com a condição — sol, chuva, tempestade, neve, neblina — e com dia/noite. Uma rota só, sem backend próprio, sem login. Publicado no GitHub Pages.

## Stack
- **Components**: Vue 3 `<script setup>` + Vuetify 4 (registro global, alias `@` → `src/`)
- **3D**: Three.js em `src/scene/`, dirigido por composable — nenhum componente fala com o Three direto
- **Rotas**: vue-router (`createWebHistory`), rota única em `src/views/weather/`
- **Dados**: Open-Meteo + BigDataCloud via `fetch` → `src/repositories/` → service (`useAsync`) → composable
- **i18n**: vue-i18n, pt-BR, `src/locales/pt-BR/**/*.json` (deep merged) — todo texto via `t()`
- **Feedback**: `useSnackbar` + `GlobalSnackbar` montado uma vez no `App.vue`
- **Testes**: Vitest (`pnpm test`), co-localizados em `test/`
- **Qualidade**: ESLint via `vite-plugin-checker` (só em `--mode development`) e `pnpm lint`

## Carregar regras conforme o contexto da tarefa

`shared/` é sincronizado do upstream (**não editar**). `project/` é o inventário deste repositório.

| Tarefa envolve | Princípio (shared) | Inventário (project) |
|---|---|---|
| Criar/editar componentes `.vue`, props, emits, template | `.claude/rules/shared/vue.md` | `.claude/rules/project/catalog-ui.md` |
| Reutilização de UI, evitar duplicação, extrair componentes | `.claude/rules/shared/dry.md` | `.claude/rules/project/catalog-ui.md` |
| Composables, estado compartilhado | `.claude/rules/shared/composables.md` | `.claude/rules/project/catalog-composables.md` |
| Service (`useAsync`), quando criar service vs composable | `.claude/rules/shared/services.md` | `.claude/rules/project/catalog-data.md` |
| Chamada HTTP, endpoint novo | `.claude/rules/shared/repositories.md` | `.claude/rules/project/catalog-data.md` |
| Texto visível, chave de tradução, arquivo de locale | `.claude/rules/shared/i18n.md` | `.claude/rules/project/stack.md` |
| Feedback ao usuário: toast, alerta, mensagem inline | `.claude/rules/shared/feedback.md` | `.claude/rules/project/catalog-ui.md` |
| Escrever/editar teste, onde mora o `.test`, mocks | `.claude/rules/shared/tests.md` | `.claude/rules/project/stack.md` |
| Cores, tokens de tema, layout mobile, componentes Vuetify | `.claude/rules/shared/vuetify.md` | `.claude/rules/project/stack.md` |
| Cor/material da cena 3D, condição nova de tempo | — | `.claude/rules/project/stack.md` |
| Adotar uma primitiva que a regra exige (`useAsync`, toast…) | `.claude/rules/shared/scaffold.md` | `.claude/rules/project/stack.md` |

> Duas divergências deliberadas do conjunto carregado, ambas escritas: **não há axios** (`fetch` puro, ver `catalog-data.md`) e **não há Pinia** (sem estado global, ver `catalog-composables.md`).

## Regras universais (sempre aplicar)
- Sempre `<script setup>` — sem Options API, sem `export default {}`
- **Nenhuma string hardcoded** em template ou composable — tudo via `t('chave')`
- **Nenhuma cor hardcoded, inclusive no JS da cena 3D** — toda cor é token do tema em `src/plugins/vuetify.js`; a cena lê os tokens por `sceneColor()`/`sceneCssColor()`
- Nenhum termo cru em inglês visível ao usuário — a UI é pt-BR
- Verificar o que já existe antes de criar componente, composable ou chave i18n
- `pnpm lint` e `pnpm test` verdes antes de commitar

## Regras compartilhadas — como funcionam

- `.claude/rules/shared/` é **gerado** por `pnpm rules:sync`. Editar ali é perda garantida no próximo sync.
- Mudou um **princípio** (vale para todos os projetos) → PR no upstream, sobe a versão, sincroniza aqui.
- Mudou o **inventário** (componente novo, composable novo, endpoint novo) → editar `.claude/rules/project/` **no mesmo PR** da mudança de código. Catálogo desatualizado faz o agente duplicar código que já existe.
- **Precedência:** em conflito, `project/` vence `shared/` — divergir é permitido, mas a divergência tem que estar escrita.
- Versão em vigor: `.claude/rules/.rules-version` · `pnpm rules:check` acusa edição manual, versão defasada ou adoção incompleta.
