<!--
  GERADO POR vue-claude-rules — NÃO EDITAR ESTE ARQUIVO.
  Origem: rules/vue/services.md @ v1.7.0
  Mudança de princípio → PR em github.com/gabriellopesweber/vue-claude-rules
  Mudança específica do projeto → .claude/rules/project/
-->
# Regras de Services

> **Escopo:** vale apenas para projetos com camada HTTP (repositories) e um `useAsync` já existente. Sem isso, esta regra **não se aplica** — a divisão service/composable só paga o próprio custo quando há chamadas de rede com loading/erro se repetindo.
>
> **Não tem `useAsync`?** O código base está em `node_modules/vue-claude-rules/scaffold/composables/core/useAsync.js` (ver `.claude/rules/shared/scaffold.md`). Copie quando o segundo lugar repetir `loading` + `try/catch` + toast de erro — não antes.
>
> **Catálogo dos services existentes:** `.claude/rules/project/catalog-data.md`.

## Distinção: Service vs Composable

| Critério | Service | Composable |
|---|---|---|
| Estado reativo próprio | ❌ Não tem | ✅ Tem (`ref([])` no nível de módulo) |
| Padrão de HTTP | `useAsync()` wrapper — **retorna dados via `return`** | Delega ao service, aplica lógica de negócio |
| Responsabilidade | Configurar e exportar chamadas HTTP | Gerenciar estado e regras de domínio |

## Padrão service → composable

O service **não muta estado** — só executa o HTTP e retorna os dados. O composable chama o service e aplica a lógica (unshift, filter, atualizar selectedItem, etc.):

```js
// src/services/{domínio}/useItemsService.js
export const useItemsService = () => {
  const { t } = useI18n()

  const createItemService = useAsync(
    async (data) => {
      const response = await itemRepository.create(data)
      return response.data  // ← retorna, não muta
    },
    { successMessage: t('...'), errorMessage: t('...') },
  )

  return { createItem: createItemService }
}

// src/composables/{escopo}/useItems.js
const items = ref([])

export const useItems = () => {
  const { createItem: createItemService } = useItemsService()

  const createItem = async (data) => {
    try {
      const created = await createItemService.execute(data)
      items.value.unshift(created)   // ← lógica de negócio no composable
      return true
    } catch {
      return false
    }
  }

  return {
    items,
    isCreating: createItemService.loading,
    createItem,
  }
}
```

Quando o escopo do recurso depende de um contexto (tenant, workspace, organização), o service **expõe o resolvedor** desse escopo para o composable usar como guard:

```js
const scopeId = () => currentScope.value?.id
// ...
return { scopeId, createItem: createItemService }

// no composable
if (!scopeId()) return false
```

## Services globais — `src/services/{domínio}/`

Para services reutilizados por composables globais ou no router/guards.

## Services locais — `src/views/{feature}/services/`

Para services usados em apenas uma view (co-localização).

## Regras de nomenclatura

- **Services**: `use{Feature}Service.js` ou `use{Feature}Services.js`
- **Composables**: `use{Feature}.js` (sem sufixo "Service")
- Um arquivo com state reativo próprio **nunca** deve ter "Service" no nome

## Quando criar service vs composable

```
Precisa apenas executar uma chamada HTTP e retornar dados?
  → Service com useAsync (src/services/{domínio}/)

Precisa manter lista reativa + aplicar lógica de negócio?
  → Composable que usa um service

Service reutilizado em múltiplas views ou composables?
  → src/services/{domínio}/

Service específico de uma view?
  → src/views/{feature}/services/
```
