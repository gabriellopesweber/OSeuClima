<!--
  GERADO POR vue-claude-rules — NÃO EDITAR ESTE ARQUIVO.
  Origem: rules/vuetify/vuetify.md @ v1.5.0
  Mudança de princípio → PR em github.com/gabriellopesweber/vue-claude-rules
  Mudança específica do projeto → .claude/rules/project/
-->
# Regras Vuetify 4

> **Defaults de componente, paleta e tokens extras deste projeto:** `.claude/rules/project/stack.md`.

## Cores — sempre tokens de tema
```css
/* ✅ correto */
color: rgb(var(--v-theme-primary));
background: rgba(var(--v-theme-surface-container-low), 0.9);
border: 1px solid rgba(var(--v-theme-outline-variant), 0.3);
```
```css
/* ❌ nunca */
color: #5C6BC0;
background: rgba(255, 255, 255, 0.8);
var(--any-custom-var) /* custom vars fora do sistema de tema */
```
Classes utilitárias também funcionam: `text-primary`, `bg-surface`, `text-medium-emphasis`, `text-error`

Nenhuma cor hardcoded em template, style ou JS — sem exceção. Cor que não existe como token deve ser **adicionada ao tema**, não escrita no componente.

## Tokens disponíveis
`primary` · `secondary` · `tertiary` · `error` · `success` · `warning` · `info`
`surface` · `surface-container-low` · `surface-container-lowest` · `surface-container-high`
`on-surface` · `on-primary` · `on-secondary-container`
`outline-variant` · `secondary-container`

## Props descontinuadas
| ❌ Deprecated | ✅ Vuetify 4 |
|---|---|
| `dense` | `density="comfortable"` (ou `"compact"` para mais compressão) |

## Defaults de componentes
Definidos **uma vez** em `src/plugins/vuetify.js` (`defaults`). **Não redeclarar** em componentes individuais sem motivo explícito — se um valor se repete em vários lugares, ele pertence ao `defaults`, não ao template.

A tabela dos defaults em vigor está em `.claude/rules/project/stack.md`.

## Autocomplete — regra obrigatória

`VTextField`, `VTextarea` e `VAutocomplete` devem ter `autocomplete: 'off'` como default global — cobre todos os formulários internos automaticamente.

**Exceção:** formulários de autenticação devem sobrescrever com valores semânticos para que gerenciadores de senha funcionem:

```html
<!-- Login -->
<v-text-field autocomplete="email" … />
<v-text-field autocomplete="current-password" … />

<!-- Registro -->
<v-text-field autocomplete="given-name" … />
<v-text-field autocomplete="family-name" … />
<v-text-field autocomplete="email" … />
<v-text-field autocomplete="new-password" … />
```

Nunca usar `autocomplete="on"` — usar sempre o valor semântico correto.

## Layout mobile
```js
import { useDisplay } from 'vuetify'
const { mobile } = useDisplay()
```

**Padrão para actions de dialog em mobile:**
```html
<v-card-actions
  class="border-t dialog-actions"
  :class="mobile ? 'flex-column-reverse pa-4 ga-2' : 'px-6 py-4'"
>
  <v-spacer v-if="!mobile" />
  <v-btn variant="text" :block="mobile" @click="cancel">…</v-btn>
  <v-btn variant="flat" :block="mobile" @click="confirm">…</v-btn>
</v-card-actions>
```
`flex-column-reverse` garante que o botão de confirmação (último no DOM) apareça no topo em mobile.

O dialog base do projeto deve expor `mobile` como slot prop do slot `#actions`:
```html
<template #actions="{ mobile }">…</template>
```

**Regra:** responsividade mora no componente base/compartilhado, não em cada consumidor. Se o header/dialog base já trata mobile, **não** repetir `:block="mobile"` / `:size="mobile ? … : …"` nos filhos.

## Tema

*Aplica-se a projetos com alternância dark/light. Se o projeto tem um tema só, ignore esta seção — não construa toggle de tema por conta própria.*

- Usar o composable `useAppTheme()` — não usar `useTheme()` diretamente nas views
- Mudar tema: `theme.change('dark' | 'light')` — **nunca** `theme.global.name.value = x` (deprecated no Vuetify 4)
- Toggle de tema: usar o componente existente do projeto — não recriar

## ApexCharts — padrão dark mode

*Só se aplica onde `vue3-apexcharts` já é dependência. Não é recomendação de biblioteca de gráficos.*

Gráficos que usam `vue3-apexcharts` seguem este padrão obrigatório:

```js
import { useAppTheme } from '@/composables/core/useAppTheme'
const { isDark } = useAppTheme()

// Lê CSS vars do Vuetify e converte para formato rgb() aceito pelo ApexCharts
const themeColor = (token) =>
  `rgb(${getComputedStyle(document.documentElement).getPropertyValue(`--v-theme-${token}`).trim()})`

const options = computed(() => ({
  chart: {
    background: 'transparent',
    foreColor: isDark.value ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)', // textos dos eixos
    fontFamily: 'inherit',
  },
  colors: [themeColor('primary')],          // cores dos elementos — dentro do computed para reatividade
  grid: { borderColor: isDark.value ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' },
  tooltip: { theme: isDark.value ? 'dark' : 'light' },
}))
```

```html
<!-- :key força remount quando o tema muda, garantindo cores frescas -->
<ApexChart :key="isDark ? 'dark' : 'light'" type="bar" height="100%" :options="options" :series="series" />
```

**Regras:**
- **Nunca** usar `chart.theme.mode` — ele sobrescreve o array `colors` nas barras
- Usar `chart.foreColor` para cor dos textos e `tooltip.theme` para tooltips
- Colocar `themeColor()` **dentro** do `computed` (não fora), para que `isDark` seja rastreado
- Registrar o `ApexChart` globalmente num plugin — não importar em cada componente

## Grid responsivo
`cols="12"` base · `md="6"` dois-colunas · `lg="4"` três-colunas
Ocultar por breakpoint: classes `hidden-sm-and-down` / `hidden-md-and-up`
