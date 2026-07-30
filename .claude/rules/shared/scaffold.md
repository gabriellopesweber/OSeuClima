<!--
  GERADO POR vue-claude-rules — NÃO EDITAR ESTE ARQUIVO.
  Origem: scaffold/README.md @ v1.7.0
  Mudança de princípio → PR em github.com/gabriellopesweber/vue-claude-rules
  Mudança específica do projeto → .claude/rules/project/
-->
# scaffold — as primitivas que as regras pressupõem

Várias regras dizem *"use `useAsync`"*, *"todo `:rules` vem de `useValidation`"*, *"nunca `alert()` — use o toast"*. Isso só é acionável se a primitiva existir. Aqui está o código base de cada uma, para um projeto **adotar** em vez de reinventar.

**Fonte de verdade:** as implementações vêm do Medispace-ui, o projeto onde esses padrões foram exercitados em produção. Copiar daqui é copiar o que já roda.

## Como usar

Não há gerador: **copie o arquivo** para o caminho equivalente no seu projeto e ajuste o que estiver marcado. É código seu a partir daí — o `rules:sync` não toca em `src/`.

```bash
cp node_modules/vue-claude-rules/scaffold/composables/core/useAsync.js src/composables/core/
```

Depois de adotar, registre no `.claude/rules/project/catalog-composables.md` — senão o agente não sabe que existe.

## O que tem aqui

| Arquivo | Regra que o exige | Depende de | Ajustar |
|---|---|---|---|
| `composables/core/useAsync.js` | `services.md` (todo HTTP passa por aqui) | `useSnackbar` | — |
| `composables/core/useSnackbar.js` | `feedback.md` (toast) | — | — |
| `composables/core/useAlertManager.js` | `feedback.md` (stack global) | — | — |
| `composables/core/useValidation.js` | `composables.md` (todo `:rules`) | `vue-i18n`, `@/validations` | — |
| `composables/core/useAppTheme.js` | `vuetify.md` (tema) | `vuetify`, store `ui` | — |
| `validations/index.js` + `rules/*.js` | `composables.md` | — | `cpf`/`cnpj` são pt-BR |
| `locales/validation.json` | `composables.md` | `vue-i18n` | mensagens em pt-BR |
| `stores/ui.js` | `vuetify.md`, `feedback.md` | `pinia`, `pinia-plugin-persistedstate` | **`CHANGEME_ui`** → seu prefixo |
| `components/ui/GlobalSnackbar.vue` | `feedback.md` | `useSnackbar` | montar 1x no `App.vue` |
| `components/ui/GlobalAlertStack.vue` | `feedback.md` | `useAlertManager`, store `ui` | montar 1x no `App.vue` |
| `components/ui/InlineAlert.vue` | `feedback.md` | — | — |

## Adote sob demanda, não em bloco

Copiar as 22 peças num projeto que precisa de duas é o oposto do que `dry.md` prega. O gatilho de cada uma:

- **`useAsync`** — quando o segundo lugar repetir `loading` + `try/catch` + toast de erro.
- **`useSnackbar` + `GlobalSnackbar`** — no primeiro "salvo com sucesso".
- **`useAlertManager` + `GlobalAlertStack`** — na primeira mensagem que precisa **persistir** até o usuário resolver. Um projeto só com toasts não precisa disso.
- **`useValidation` + `validations/`** — quando as regras de campo começarem a repetir entre formulários. Um formulário só não justifica.
- **`useAppTheme` + `stores/ui`** — quando houver dark/light de verdade.
- **`test-utils/withSetup`** — quando testar um composable com `onMounted`/`onUnmounted` ou watcher `pre`.

## Dependências por peça

```
useAsync          → useSnackbar
useValidation     → vue-i18n + validations/ + locales/validation.json
useAppTheme       → vuetify + pinia (store ui)
GlobalAlertStack  → useAlertManager + pinia (store ui, para alertPosition)
GlobalSnackbar    → useSnackbar
InlineAlert       → nada
withSetup         → vue + jsdom no Vitest
```

`useSnackbar`, `useAlertManager` e `InlineAlert` são autocontidos — dá para adotar só eles.
