<!--
  GERADO POR vue-claude-rules — NÃO EDITAR ESTE ARQUIVO.
  Origem: rules/vue/repositories.md @ v1.5.0
  Mudança de princípio → PR em github.com/gabriellopesweber/vue-claude-rules
  Mudança específica do projeto → .claude/rules/project/
-->
# Regras de Repository / HTTP

> **Escopo:** vale apenas para projetos que **consomem uma API** e já têm a camada montada (axios + `src/services/api.js` + `src/repositories/`). Num site estático ou numa app sem backend próprio, esta regra **não se aplica** — não instale axios nem crie a camada por conta própria para "seguir o padrão".
>
> **Catálogo dos repositories e esquema de autenticação:** `.claude/rules/project/catalog-data.md` e `.claude/rules/project/stack.md`.

## Regra principal
**Toda chamada HTTP passa por um repository.** Nunca usar axios diretamente em componentes, views ou composables.

## Caminho: `src/services/api.js` → repository → service → composable/view

- `api.js`: a única instância axios da app — `baseURL`, interceptors de autenticação e de contexto (headers de tenant/workspace), tratamento global de 401.
- Nenhuma outra camada configura axios; nenhuma outra camada lê token.

## Estrutura de diretórios

Repositories agrupados por domínio, um arquivo por recurso:

```
src/repositories/
├── auth/
│   ├── authRepository.js
│   └── userRepository.js
└── {domínio}/
    └── {recurso}Repository.js
```

## Padrão para adicionar métodos

```js
// src/repositories/{domínio}/featureRepository.js
import api from '@/services/api'

export const featureRepository = {
  getAll:  (params)     => api.get('/features', { params }),
  getOne:  (id)         => api.get(`/features/${id}`),
  create:  (data)       => api.post('/features', data),
  update:  (id, data)   => api.put(`/features/${id}`, data),
  delete:  (id)         => api.delete(`/features/${id}`),
}
```

Repository é **só o mapa de endpoints**: sem `try/catch`, sem transformação de payload, sem estado, sem i18n.

## Tratamento de erros

Repositories **não capturam erros** — retornam a promise crua.
O service (`useAsync`) exibe a mensagem via `errorMessage`. O composable captura o throw e retorna `false`.

## Quando criar um novo repository

```
Nova funcionalidade de domínio diferente dos existentes → novo arquivo em src/repositories/{domínio}/
Extensão de domínio existente → adicionar ao repository correspondente
```
