<!--
  GERADO POR vue-claude-rules — NÃO EDITAR ESTE ARQUIVO.
  Origem: rules/core/tests.md @ v1.5.0
  Mudança de princípio → PR em github.com/gabriellopesweber/vue-claude-rules
  Mudança específica do projeto → .claude/rules/project/
-->
# Regras de Testes (Vitest)

> **Escopo:** esta regra vale **apenas para projetos que já têm suíte de teste**. Ela descreve *como* testar bem onde se testa — não obriga a introduzir testes onde não há.
>
> Se o projeto não tem suíte (sem `pnpm test`, sem `vitest.config.js`), esta regra **não se aplica**: não crie a primeira suíte, o config nem o job de CI por conta própria. Adotar testes é decisão do dono do projeto, com custo de manutenção real — proponha, se fizer sentido, e espere a decisão. Nesses projetos o profile deve ser um que **não** inclua este arquivo (ex.: `site-static`).

Stack: **Vitest** (unidade/componente). Para componentes/DOM, adicionar **@vue/test-utils** + ambiente **jsdom** (ver "Ambiente"). Para **E2E/smoke**, **Cypress** ou **Playwright** (ver seção própria).
Comandos: `pnpm test` (run único, usar antes de commitar — como o lint) e `pnpm test:watch`.

**Onde mora o gate: no CI, não no script de build.** O pipeline de teste roda **isolado**, no PR, num ambiente limpo (`pnpm install --frozen-lockfile` → lint → unit → E2E). O deploy só acontece depois que esses checks passaram.

O script de build seguro faz **audit → build** — não reexecuta a suíte. Empacotar teste dentro do build acopla duas responsabilidades, dobra o tempo de deploy reexecutando o que o CI já validou, e faz um teste flaky travar um deploy de código já aprovado.

Consequência prática: `pnpm test` local é **conveniência** — pega o erro antes do push. Quem **barra** o merge é o CI. Rode antes de commitar mesmo assim; descobrir a falha no seu terminal é mais barato que descobrir no PR.

> Projeto **sem CI** pode legitimamente gatilhar a suíte dentro do `build:*:secure` — é o gate possível ali. Isso é fato do projeto, não violação: onde o gate roda de fato está em `.claude/rules/project/stack.md`, e é essa a fonte de verdade.

## Tipos de teste (pirâmide)

| Tipo | O que cobre | Ferramenta | Quando |
|---|---|---|---|
| **Unidade** | função/composable/util isolado; lógica de negócio pura. Mocka o ambiente. | Vitest | **base da pirâmide** — a maioria; rápido e determinístico |
| **Componente** | um `.vue` monta, renderiza, reage a props/eventos/slots — pela **interface pública**, não internals | Vitest + @vue/test-utils (jsdom) | componentes com lógica relevante |
| **Smoke / E2E** | fluxo crítico ponta a ponta no navegador real, com rede real, sobre o build | Cypress/Playwright | **poucos**; só caminhos que doem |

Regra prática: **muitos** testes de unidade, **alguns** de componente, **poucos** E2E (são lentos e mais frágeis). Não inverter a pirâmide (pirâmide de testes — Mike Cohn / Martin Fowler).

## Princípios — o que faz um bom teste

**FIRST** (Clean Code, R. C. Martin) — todo teste deve ser:
- **F**ast: roda em ms; sem rede/disco/tempo real.
- **I**ndependent: não depende de ordem nem de outro teste (estado isolado; `afterEach` limpa mocks).
- **R**epeatable: mesmo resultado sempre, em qualquer máquina (sem `Date.now()`/random crus).
- **S**elf-validating: passa/falha sozinho via `expect` — nada de inspeção manual.
- **T**imely: escrito junto com o código, não "depois, se sobrar".

**Os 4 pilares de um bom teste** (V. Khorikov, *Unit Testing: Principles, Practices, and Patterns*) — equilibrar:
1. **Proteção contra bugs** — o teste pega regressão real (testa comportamento de valor, não trivialidade).
2. **Resiliência a refactor** — não quebra quando o *como* muda sem mudar o *o quê*. ⇒ **testar comportamento observável, não detalhes de implementação**. Este é o pilar mais sacrificado por mocks excessivos e asserts em internals.
3. **Feedback rápido** — ver FIRST.
4. **Manutenibilidade** — teste legível e simples; se é difícil de escrever, o design provavelmente está acoplado demais (ouça o teste — *GOOS*, Freeman & Pryce).

> Regra de ouro (resiliência): trate a unidade como **caixa-preta**. Dê uma entrada (props/args/interação) e asserte a saída (retorno/DOM/evento). Nunca asserte estado privado nem "como" foi feito.

## Localização e nomenclatura — obrigatório
- O teste mora **no mesmo diretório** do arquivo testado (co-localização por escopo), **dentro de uma subpasta `test/`**.
  - `src/utils/fileExport.js` → `src/utils/test/fileExport.test.js`
  - `src/composables/records/useAmountAdjustment.js` → `src/composables/records/test/useAmountAdjustment.test.js`
- Nome do arquivo: `<arquivo>.test.js` (sufixo `.test`, não `.spec`).
- O `include` do `vitest.config.js` é `src/**/test/**/*.{test,spec}.js` — fora de uma pasta `test/` o arquivo **não roda**.

## O que testar (prioridade) — começar pequeno, alto valor
1. **Lógica pura de regra de negócio**: `src/validations/rules/*`, composables de cálculo, utils. Determinístico, sem mock pesado → maior ROI.
2. **Composables de domínio** com estado/regras (mockando as bordas — ver abaixo).
3. **Componentes**: só os com lógica relevante (não snapshot de tudo).
4. **Não testar** código de framework/lib (Vue, a lib de UI, axios), getters triviais, nem reimplementar o que o lint/tipos já garantem.

> Cobertura não é meta numérica. Cobrir o que **dói se quebrar** (fluxo crítico, dinheiro, datas) e os **branches/edge cases** (vazio, limites, valor inválido), não 100%.

## Estrutura de um teste
- Padrão **AAA** (Arrange → Act → Assert), separado visualmente.
- `describe('unidade sob teste')` + `it('descreve o comportamento esperado')` — frase de comportamento, não nome do método.
- **Imports explícitos** do Vitest: `import { describe, expect, it, vi } from 'vitest'` (não usar globals — `globals: false`).
- Um **comportamento por `it`**; vários `expect` do mesmo comportamento são ok.
- Dados de teste via **factory/helper** (`const makePayment = (over) => ({ ...base, ...over })`) em vez de repetir objetos.

```js
// A ordem dos imports segue o simple-import-sort do projeto.
// Rode `pnpm lint:fix` em caso de dúvida.
import { csvMoney } from '@/utils/fileExport'

import { describe, expect, it } from 'vitest'

describe('csvMoney', () => {
  it('formats numbers with comma decimals and two places', () => {
    expect(csvMoney(49.9)).toBe('49,90')
  })

  it('returns empty string for null/undefined', () => {
    expect(csvMoney(null)).toBe('')
  })
})
```

## Determinismo — nunca depender de rede/tempo/aleatório
- **HTTP**: nunca chamar a API real. Mockar a **borda** (`repository` ou `@/services/api`) com `vi.mock(...)`. Não mockar a unidade que está sendo testada nem internals dela.
- **Tempo**: `vi.useFakeTimers()` / `vi.setSystemTime(...)` para lógica com `Date`/`dayjs`/`setTimeout`; restaurar no `afterEach` (`vi.useRealTimers()`).
- **Aleatório**: injetar/spyar (`vi.spyOn(Math, 'random')`).
- `vi.clearAllMocks()` em `afterEach` quando usar mocks compartilhados.

## Mock nas bordas, não no meio
- Testar a unidade **de verdade**; substituir só o que sai do processo (HTTP, storage, tempo).
- **Mock roles, not objects** (*GOOS*): substitua **colaboradores externos** (a borda), não a lógica sob teste. Mock demais → testa a implementação e fere a resiliência a refactor (pilar 2).
- **Tipos de test double** (Meszaros, *xUnit Test Patterns*) — use o certo:
  - **stub**: devolve dado canned para a entrada (ex.: `repository.getAll` resolve uma lista fixa). Não verifique stub.
  - **mock/spy**: verifica **interação** (ex.: `expect(repo.create).toHaveBeenCalledWith(...)`). Use só quando a chamada **é** o comportamento (efeito colateral); senão prefira asserir o resultado.
  - **fake**: implementação leve funcional (ex.: repo em memória).
  - **dummy**: só preenche assinatura, nunca é usado.
  - Anti-padrão: **mockar o que está sob teste** ou asserir interações que não são o objetivo do caso (acopla ao "como").
- `vue-i18n`: quando o composable usa `useI18n().t()`, mockar para devolver a própria chave:
  ```js
  vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k) => k }) }))
  ```
- Composables de feedback (toast, alertas): mockar para asserir que foram chamados, sem efeito real.

## Ambiente (node vs jsdom)
- Padrão do projeto: **`node`** (lógica pura, composables com `ref`/`computed`). Rápido, sem DOM.
- Para **componentes** ou código que toca DOM (`document`, `Blob`, `URL.createObjectURL`): usar **jsdom** — no topo do arquivo `// @vitest-environment jsdom` ou configurar por glob. Adicionar `@vue/test-utils` para montar componentes.
- **Composable sem ciclo de vida / provide-inject** (só Reactivity API): teste **invocando direto** e asserindo o retorno.
- **Composable com `onMounted`/`onUnmounted`/`provide`-`inject` ou cujos `watch (flush:'pre')` precisam de instância**: monte num **componente host** com o helper `withSetup` — watchers `pre`/`post` só fazem flush dentro de um componente. Código base em `node_modules/vue-claude-rules/scaffold/test-utils/withSetup.js`; copie para `src/test-utils/`.
  ```js
  const [result, app] = withSetup(() => useFeature())
  // ... asserts
  app.unmount() // dispara onUnmounted
  ```
  Não criar teste que dependa de `nextTick` para um watcher de composable **solto** (sem host) — não vai flushar.

## Componentes (quando aplicável)
- `mount`/`shallowMount` do `@vue/test-utils`; consultar por **papel/texto/`data-test`**, não por classe CSS de estilo.
- Asserir **comportamento observável** (texto renderizado, evento emitido via `wrapper.emitted()`), não estado interno.
- Stubar componentes filhos pesados; prover a lib de UI/i18n via `global.plugins` quando necessário.

## Matchers
- `toBe` para primitivos/identidade; `toEqual` para objetos/arrays (igualdade estrutural).
- `toBeNull`/`toBeUndefined`/`toBeTruthy` conforme a intenção; evitar `toBeTruthy` quando o valor exato importa.
- `expect(fn).toThrow(...)` para erros; `await expect(promise).rejects.toThrow(...)` para async.
- Eventos: `expect(wrapper.emitted('saved')).toBeTruthy()`.

## Utils e funções puras (maior ROI)
- Funções puras em `src/utils/*` são o **alvo mais barato e valioso** — entrada → saída, sem mock, sem DOM (env `node`). Cobrir os **edge cases**: vazio/`null`, limites, valor inválido, escape (ex.: geração de CSV).
- **Extraia lógica complexa para um util/composable puro e teste-o lá** (recomendação oficial do Vue): se um cálculo está enterrado num componente/serviço difícil de testar, mover a parte pura para `src/utils` ou um composable de regra torna-a testável e reutilizável — em vez de montar um teste pesado em volta do acoplamento.
- **Helpers de teste** (ex.: `withSetup`, factories de dados) ficam em `src/test-utils/` — reutilizáveis entre suítes; não duplicar em cada `test/`. Eles **não** são testados (são ferramenta de teste).

## Smoke test e E2E
- **E2E**: valida um fluxo **ponta a ponta no navegador real**, com **rede real** sobre o **build** — exercita router, stores, telas e backend juntos. Pega o que unidade/componente não pegam (integração, navegação, contrato real).
- **Smoke test** = o subconjunto **mínimo** de E2E que prova que "não está pegando fogo": os **caminhos críticos** do produto, felizes, ponta a ponta. Se o smoke passa, o core operacional está de pé.
- **Disciplina** (são lentos/caros — topo da pirâmide):
  - **Poucos e críticos** — não recriar cobertura de regra que já é coberta por unidade.
  - **Determinísticos** — usar uma **conta de teste dedicada** com dados estáveis; evitar depender de dado de produção. Credenciais em arquivo gitignored, nunca versionadas.
  - **Seletores por `data-test`**, não por texto/cor (resiliência a refactor de UI/i18n).
  - **Pré-condição de login programática** (comando custom que autentica via API) nos fluxos que não são sobre a tela de login — não logar pela UI a cada teste.
  - **Não** rodam junto do `pnpm test`; rodam via `pnpm test:e2e` em **job dedicado** do CI (precisam de app+backend+dados de pé), separado do job de lint+unit para que uma falha de E2E não se confunda com regressão de unidade.
- **Feedback ao usuário (toast):** asserir o **tipo** via `[data-test="snackbar-success"]` / `[data-test="snackbar-error"]`, não o texto i18n. **Validação de campo:** asserir que `[data-test="<campo>"] .v-messages__message` existe — prova que a regra disparou sem acoplar à mensagem.
- **Cuidado com dado de teste (write-side):** prefira **seeding idempotente** para garantir estado, em vez de depender do banco. Para um fluxo de **criação sem endpoint de limpeza** (ex.: signup), **stube a resposta de sucesso** (`cy.intercept`) — valida o comportamento do frontend sem sujar o backend — e cubra o **contrato real** pelo cenário de **erro/duplicidade** (rede real). Quando houver limpeza (delete/reset), pode-se voltar a criar+excluir no `after`.
- Config, specs e estado atual da suíte E2E: `.claude/rules/project/stack.md`.

## Checklist antes de commitar
- [ ] Teste em `test/` co-localizado, nome `*.test.js`, imports explícitos do Vitest.
- [ ] Comportamento (caixa-preta), não implementação; resiliente a refactor.
- [ ] **FIRST**: rápido, isolado, repetível, autovalidável.
- [ ] Determinístico — bordas mockadas (stub/mock no lugar certo), sem rede/tempo/random reais.
- [ ] Cobre edge cases (vazio, limites, inválido), não só o caminho feliz.
- [ ] `pnpm test` verde **e** `pnpm lint` sem erros localmente (os arquivos de teste também são lintados) — o CI vai rodar os dois de novo no PR.

## Referências
- Robert C. Martin — *Clean Code* (princípios **FIRST**).
- Vladimir Khorikov — *Unit Testing: Principles, Practices, and Patterns* (4 pilares; testar comportamento; uso correto de mocks).
- Gerard Meszaros — *xUnit Test Patterns* (taxonomia de **test doubles**; AAA / SUT).
- Freeman & Pryce — *Growing Object-Oriented Software, Guided by Tests* (mock **roles**, não objetos; ouvir o teste).
- Kent Beck — *Test-Driven Development by Example* (ciclo red-green-refactor).
- Documentação oficial: [Vue — Testing](https://vuejs.org/guide/scaling-up/testing), [Vitest](https://vitest.dev), [Vue Test Utils](https://test-utils.vuejs.org), [Cypress](https://docs.cypress.io), [Playwright](https://playwright.dev).
