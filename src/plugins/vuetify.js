import { createVuetify } from 'vuetify'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { pt } from 'vuetify/locale'

// Paleta única do projeto. Nada de cor solta em componente ou no JS da cena 3D:
// os materiais do Three.js leem estes mesmos tokens via `themeColor()`
// (`src/scene/themeColor.js`), do mesmo jeito que a regra do ApexCharts prescreve.
const colors = {
  background: '#12181F',
  surface: '#FFFFFF',
  'surface-muted': '#EEF1F4',
  'on-surface': '#1C1C1C',
  'on-surface-muted': '#7A7A7A',
  'on-surface-subtle': '#9A9A9A',
  'outline-variant': '#EEF0F2',
  primary: '#2F6FB0',
  error: '#B3261E',

  // Acento por condição do tempo — dirige o chip do cartão.
  'weather-clear': '#F2A33D',
  'weather-cloudy': '#6E8598',
  'weather-rain': '#2F6FB0',
  'weather-storm': '#6A4FB0',
  'weather-snow': '#4E9AC7',
  'weather-fog': '#7C8B85',

  // Cenário 3D — céu (topo/base), chão e nuvens por condição.
  'scene-clear-sky-top': '#5EC8FF',
  'scene-clear-sky-bottom': '#BFEFFF',
  'scene-clear-ground': '#8BD17A',
  'scene-clear-cloud': '#FFFFFF',
  'scene-cloudy-sky-top': '#9FB4C7',
  'scene-cloudy-sky-bottom': '#DFE9F0',
  'scene-cloudy-ground': '#7FAE72',
  'scene-cloudy-cloud': '#E7EBEF',
  'scene-rain-sky-top': '#516079',
  'scene-rain-sky-bottom': '#8D9BAB',
  'scene-rain-ground': '#5C8A58',
  'scene-rain-cloud': '#7D8A99',
  'scene-storm-sky-top': '#2D3446',
  'scene-storm-sky-bottom': '#525C73',
  'scene-storm-ground': '#4D7550',
  'scene-storm-cloud': '#4A5262',
  'scene-snow-sky-top': '#C7D6E6',
  'scene-snow-sky-bottom': '#EEF4FA',
  'scene-snow-ground': '#F3F6FA',
  'scene-snow-cloud': '#F3F5F7',
  'scene-fog-sky-top': '#B9C2C9',
  'scene-fog-sky-bottom': '#DFE4E7',
  'scene-fog-ground': '#8FA189',
  'scene-fog-cloud': '#D7DADD',
  'scene-fog-veil': '#C9D1D6',

  // Cenário 3D — elementos fixos.
  'scene-hill': '#74B06A',
  'scene-trunk': '#8A5A3B',
  'scene-leaf': '#4F9E5A',
  'scene-sun': '#FFD166',
  'scene-sun-glow': '#FFB703',
  'scene-raindrop': '#BCD4FF',
  'scene-snowflake': '#FFFFFF',
  'scene-lightning': '#E8ECFF',
  'scene-night-bounce': '#3A3A55',
}

export default createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'clima',
    themes: {
      clima: { dark: false, colors },
    },
  },
  locale: {
    locale: 'pt',
    messages: { pt },
  },
  defaults: {
    VCard: {
      rounded: 'xl',
      elevation: 0,
    },
    VBtn: {
      rounded: 'lg',
      flat: true,
    },
    VTextField: {
      rounded: 'lg',
      density: 'comfortable',
      autocomplete: 'off',
    },
    VAutocomplete: {
      rounded: 'lg',
      density: 'comfortable',
      autocomplete: 'off',
    },
    VNumberInput: {
      rounded: 'lg',
      density: 'comfortable',
    },
  },
})
