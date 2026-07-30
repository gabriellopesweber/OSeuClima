<!--
  GERADO POR vue-claude-rules — NÃO EDITAR ESTE ARQUIVO.
  Origem: rules/core/dry.md @ v1.5.0
  Mudança de princípio → PR em github.com/gabriellopesweber/vue-claude-rules
  Mudança específica do projeto → .claude/rules/project/
-->
# Regras DRY e Reutilização

> **Catálogo de componentes UI do projeto:** `.claude/rules/project/catalog-ui.md`. Esta regra define *como* decidir; o catálogo diz *o que já existe*.

## Princípio: reuso primeiro (não é só DRY, é design)

Antes de **criar ou modificar** qualquer coisa, pergunte: *"isso já existe de forma parecida que eu possa reaproveitar ou extrair?"* Varra `src/components/ui/`, `src/views/**/components/` e `src/composables/` antes de escrever.

- **Lógica repetida** → extrair para **composable**.
- **UI + lógica repetidas** entre 2+ lugares → extrair para **componente** com `v-model`/props/slots flexíveis (dinâmico, sem hardcode).
- Prefira tornar um componente existente **mais customizável** (nova prop/slot **retrocompatível**) a duplicá-lo. Ex.: dar a um `ConfirmDialog` um slot de corpo + `confirmDisabled` para hospedar um formulário, em vez de recriar o padrão sobre o dialog base.
- Pense a **API de reuso no design desde o início**, não como refator posterior. Um componente bom é perfeito em uso e reuso.
- Quando dois casos são a mesma UI com regras diferentes, prefira um componente **variant-driven** (prop `variant` que seleciona o comportamento) a dois componentes irmãos — com a lógica num composable compartilhado.

## Quando extrair para componente
| Situação | Ação |
|---|---|
| Padrão de UI idêntico em 2+ lugares | Extrair para `src/components/ui/` |
| Bloco complexo e específico de domínio > ~60 linhas | Extrair para `src/components/{domínio}/` |
| Uso único, simples, específico da view | Manter na view |
| Componente existente atende via props/slots | Não criar novo |

## Checklist DRY antes de escrever código novo
1. **Composable existente** cobre essa lógica? → `src/composables/`
2. **Repository existente** tem esse endpoint? → `src/repositories/`
3. **Componente UI existente** atende esse padrão? → `src/components/ui/`
4. **Chave i18n existente** para esse texto? → `common.json`
5. **Componente nativo da lib de UI** resolve sem código?

## Anti-padrões a evitar
- Dialog de confirmação sem usar o `ConfirmDialog` do projeto — não recriar o padrão
- Lógica de loading/error inline quando `useAsync` resolve
- Repetir checagem de permissão espalhada (`role === 'X'`) em vez de um composable de permissões
- Criar novo composable para algo que um composable de domínio já expõe
- Duplicar chaves i18n que existem em `common.json`

## Manter o catálogo vivo
Ao criar, renomear ou mudar a API pública de um componente de `src/components/ui/`, de um composable global ou de um repository, **atualize o catálogo do projeto no mesmo PR**. Catálogo desatualizado faz o agente duplicar código — é o modo de falha mais caro desta regra.
