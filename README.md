# O Seu Clima

Previsão do tempo da sua região sobre um cenário 3D animado que muda junto com o céu lá fora: sol, nuvens, chuva, tempestade com raios, neve e neblina — e escurece à noite.

🔗 **https://gabriellopesweber.github.io/OSeuClima/**

## O que faz

- Detecta sua localização e mostra a condição atual: temperatura, sensação, umidade e vento
- Próximas 6 horas numa faixa rolável
- Busca por cidade, se você preferir olhar outro lugar
- Cenário 3D (Three.js) que reage à condição do tempo e ao dia/noite
- Preferências: °C/°F, visualizar um cenário específico e reduzir animações (já respeita `prefers-reduced-motion`)

Se a geolocalização for negada, cai em São Paulo e avisa o motivo — a tela nunca fica vazia.

## Dados

Duas APIs públicas, sem chave:

- [Open-Meteo](https://open-meteo.com) — previsão e geocodificação
- [BigDataCloud](https://www.bigdatacloud.com) — geocodificação reversa (coordenadas → cidade)

## Rodando localmente

```bash
pnpm install
pnpm dev
```

Abra `http://localhost:5173`. O `pnpm dev` roda o ESLint junto, via `vite-plugin-checker`.

> A geolocalização do navegador exige HTTPS ou `localhost` — em `localhost` funciona normalmente.

| Script | O que faz |
|---|---|
| `pnpm dev` | Servidor de desenvolvimento com lint |
| `pnpm build-prod` | Build de produção (`base: /OSeuClima/`) |
| `pnpm preview` | Serve o build localmente |
| `pnpm lint` / `pnpm lint:fix` | ESLint |

## Estrutura

```
src/
├── composables/weather/   Estado do clima, ciclo de vida da cena, preferências
├── repositories/weather/  Chamadas HTTP (fetch, sem axios)
├── scene/                 Cena Three.js + leitura das cores do tema
├── utils/weather.js       Código WMO → condição, rótulos, formatação de unidade
├── plugins/vuetify.js     Tema: a paleta inteira, da UI ao cenário 3D
└── views/weather/         A única tela e seus componentes
```

Nenhuma cor é escrita fora do tema — inclusive as dos materiais 3D, que leem os mesmos tokens via `src/scene/themeColor.js`.

## Deploy

Automático no GitHub Pages a cada push em `master` (`.github/workflows/deploy.yml`): lint → build → publica.

Para usar domínio próprio ou outro caminho, defina `BASE_PATH` no build.

## Stack

Vue 3 · Vuetify 4 · Vue Router 5 · Three.js · Vite · ESLint

Partiu do [vuetify-kit](https://github.com/gabriellopesweber/vuetify-kit). As convenções de código ficam em `CLAUDE.md` e `.claude/rules/`.
