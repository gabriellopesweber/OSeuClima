# Catálogo de dados do projeto (repositories + services)

> Inventário local. Regras de *como* estruturar: `.claude/rules/shared/repositories.md` e `.claude/rules/shared/services.md`.
> **Atualizar no mesmo PR** que adiciona ou renomeia endpoint/service.

## Divergência escrita: `fetch` no lugar do axios

`shared/repositories.md` pressupõe axios + `src/services/api.js`. **Este projeto não tem nenhum dos dois, e é intencional**: as duas APIs são públicas, sem credencial, sem header de tenant e sem 401 para tratar — uma instância axios com interceptors não teria o que fazer.

O que **se mantém** da regra, e não pode ser afrouxado:

- toda chamada HTTP passa por um repository; nenhum componente, view ou composable chama `fetch` direto
- o repository não captura erro — devolve a promise crua
- um arquivo por domínio, em `src/repositories/{domínio}/`

Se um dia entrar API própria com autenticação, monte `api.js` + axios e reescreva esta seção.

## Estrutura

```
src/repositories/weather/weatherRepository.js   → HTTP cru
src/services/weather/useWeatherService.js       → useAsync + mensagem de erro
src/composables/weather/useWeather.js           → estado e regra de domínio
```

## Repositories existentes

### `weather/`

| Arquivo | Métodos | Origem |
|---|---|---|
| `weatherRepository` | `getForecast(latitude, longitude)` | Open-Meteo `/v1/forecast` — condição atual (temperatura, sensação, umidade, vento, código WMO, dia/noite) + série horária do dia, `timezone=auto` |
| | `searchCity(name)` | Open-Meteo Geocoding `/v1/search` — nome → coordenadas (`count=1`, `language=pt`) |
| | `reverseGeocode(latitude, longitude)` | BigDataCloud `reverse-geocode-client` — coordenadas → cidade/estado/país em pt |

Nenhuma exige chave de API. O helper interno `getJson` monta a query com `URLSearchParams` e **lança** em resposta não-2xx.

## Services existentes

### `weather/useWeatherService.js`

Cada um é um `useAsync` — expõe `{ data, loading, error, execute }` e **não muta estado**; quem aplica o resultado é `useWeather`.

| Service | O que faz | Toast de erro |
|---|---|---|
| `getForecast` | Previsão por coordenada | `weather.errors.forecast` |
| `getLocatedForecast` | `reverseGeocode` + `getForecast` em paralelo (`Promise.all`) — é o caminho da geolocalização | `weather.errors.forecast` |
| `getCityForecast` | `searchCity` e, se houver resultado, a previsão dele. Devolve `null` quando a cidade não existe | **nenhum** — ver abaixo |

**Por que `getCityForecast` não tem `errorMessage`:** "cidade não encontrada" é resposta esperada da busca, não falha. Ela vira `searchError` embaixo do campo (`weather.search.not_found`); disparar toast de erro para isso seria ruído. Falha de rede na busca, essa sim, cai no `catch` do composable como `weather.errors.search`.

## Tratamento de erro — quem decide o quê

| Situação | Efeito |
|---|---|
| Falha na carga por coordenadas | `phase = 'error'` + tarja, e o toast do `useAsync` |
| Cidade não encontrada | `searchError` inline, sem toast, tela intacta |
| Falha de rede na busca | `searchError` inline |
| Geolocalização negada/indisponível | fallback para São Paulo com tarja explicando |
| Falha até no fallback | `phase = 'error'` |

O código WMO cru nunca chega à UI: `categorizeWeatherCode` traduz para uma das 6 condições, e o rótulo sai do locale.
