<!--
  GERADO POR vue-claude-rules — NÃO EDITAR ESTE ARQUIVO.
  Origem: rules/core/feedback.md @ v1.8.0
  Mudança de princípio → PR em github.com/gabriellopesweber/vue-claude-rules
  Mudança específica do projeto → .claude/rules/project/
-->
# Regras de Feedback ao Usuário (toast, alerta persistente, inline)

> **Escopo:** esta regra descreve como **escolher** entre mecanismos de feedback que o projeto já tem. Ela **não** obriga a construir os três. Um site institucional que só precisa de um toast não deve ganhar um `useAlertManager` + `GlobalAlertStack` para "ficar completo" — construa o segundo mecanismo quando aparecer a primeira mensagem que precisa persistir, não antes.
>
> O que vale em qualquer projeto é a última linha: nunca `alert()`/`confirm()` nativos como UI.
>
> **Código base das três peças** em `node_modules/vue-claude-rules/scaffold/` — `useSnackbar` + `GlobalSnackbar.vue`, `useAlertManager` + `GlobalAlertStack.vue`, `InlineAlert.vue`. Adote sob demanda, na ordem em que a necessidade aparecer (ver `.claude/rules/shared/scaffold.md`).

Há **três** mecanismos. Escolha pela natureza da mensagem — não misture.
Os nomes concretos dos componentes/composables deste projeto estão em `.claude/rules/project/catalog-ui.md`.

## 1. Toast (`useSnackbar`) → feedback transitório de ação
`showMessage(text, type)` — toast curto que some sozinho. Para o **resultado de uma ação pontual**: salvo, excluído, atualizado, erro pontual de uma operação.
- Ex.: "Paciente salvo", "Erro ao excluir".
- Fire-and-forget; não exige ação do usuário. **Não** usar para avisos que precisam persistir.

## 2. Stack global (`useAlertManager` + `GlobalAlertStack`) → alerta persistente/reativo de atenção
Stack flutuante (posição configurável), montado **globalmente uma única vez** no shell da app. Use para mensagens que **devem permanecer** até serem resolvidas ou dispensadas, e tipicamente **reativas** a um estado.

- `showAlert({ type, title, text, closable?, timeout?, actionLabel?, onAction? })` → retorna `id`; `dismiss(id)`; `updateAlert(id, patch)` muta título/texto/tipo ao vivo (ex.: progresso de um cronômetro). Passe `actionLabel` + `onAction` para um botão de ação dentro do alerta.
- **Comportamento por tipo:** `error` fixo (não some), `warning` persiste (closable), `success`/`info` somem. Para um `info`/`success` persistente, passe `timeout: 0`.
- **Delimitador de tempo:** passe `timeout` (ms) para qualquer alerta sumir sozinho — use em casos **pontuais/informativos**. **Não** colocar timeout em alertas **críticos** (bloqueado/expirado) nem **reativos** (conflito, estado inválido, setup incompleto) — esses devem persistir até a condição mudar.
- **Padrão reativo:** guardar o `id` num `ref`, **dispensar o anterior** antes de mostrar outro, e dispensar quando a condição some. Em views, **dispensar no `onUnmounted`** para o alerta não vazar para outras telas.
- **Responsivo:** vira barra inferior full-width no mobile — não deve cobrir a barra de ações do topo.
- Bons casos: conflito de agendamento, estado fora das regras de negócio, trial/assinatura expirando, configuração faltando, pendências que exigem atenção.

## 3. `InlineAlert` → mensagem ancorada a uma seção
Para a mensagem que só faz sentido **ao lado do campo/seção** que a originou, use o componente padronizado `InlineAlert` — **não** o `<v-alert>` cru da lib. Props: `type` (success/error/warning/info), `title`, `icon`, `dense`; conteúdo via slot default.
- Ex.: "excede o saldo do plano" dentro do card, badge de estado no formulário, info contextual de um campo. Mover esses para o stack flutuante **piora** a leitura (descola do contexto) — manter inline.

## Resumo de decisão
| Mensagem | Mecanismo |
|---|---|
| Resultado de ação (salvou/excluiu/erro pontual) | toast (`useSnackbar`) |
| Aviso persistente/reativo de atenção (não ancorado a um campo) | stack global (`useAlertManager`) |
| Mensagem ancorada a um campo/seção do formulário | `InlineAlert` |

**Nunca** usar `alert()`, `confirm()` nativos ou `console.error` como UI.
