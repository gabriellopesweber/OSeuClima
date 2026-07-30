<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  conditionLabelKey,
  convertTemperature,
  convertWind,
  taglineKey,
  temperatureUnitKey,
  WEATHER_ICONS,
  windUnitKey,
} from '@/utils/weather'

const { t } = useI18n()

const props = defineProps({
  place: { type: Object, required: true },
  measures: { type: Object, required: true },
  units: { type: String, default: 'metric' },
})

const category = computed(() => props.measures.category)
const accent = computed(() => `weather-${category.value}`)
const label = computed(() => t(conditionLabelKey(category.value)))
const icon = computed(() => WEATHER_ICONS[category.value] ?? WEATHER_ICONS.clear)
const tagline = computed(() => t(taglineKey(category.value)))

const locationLine = computed(() => [props.place.region, props.place.country].filter(Boolean).join(', '))

const degrees = computed(() => t(temperatureUnitKey(props.units)))
const blank = computed(() => t('common.empty_measure'))

const format = (value) => value ?? blank.value

const temperature = computed(() => format(convertTemperature(props.measures.temperature, props.units)))

const stats = computed(() => [
  {
    key: 'feels',
    label: t('weather.stats.feels_like'),
    value: `${format(convertTemperature(props.measures.apparentTemperature, props.units))}${degrees.value}`,
  },
  {
    key: 'humidity',
    label: t('weather.stats.humidity'),
    value: `${format(props.measures.humidity)}%`,
  },
  {
    key: 'wind',
    label: t('weather.stats.wind'),
    value: `${format(convertWind(props.measures.windSpeed, props.units))} ${t(windUnitKey(props.units))}`,
  },
])
</script>

<template>
  <v-card class="summary-card bg-surface pa-7">
    <v-chip
      :color="accent"
      variant="flat"
      size="small"
      :prepend-icon="icon"
      class="font-weight-bold"
    >
      {{ label }}
    </v-chip>

    <h1 class="font-display city-name on-surface mt-3">
      {{ place.city }}
    </h1>
    <p
      v-if="locationLine"
      class="text-caption on-surface-muted mb-0"
    >
      {{ locationLine }}
    </p>

    <p class="font-display temperature on-surface mt-2 mb-0">
      {{ temperature }}{{ degrees }}
    </p>
    <p class="text-body-2 on-surface-muted mt-1 mb-0">
      {{ tagline }}
    </p>

    <div class="stats mt-5 pt-4">
      <div
        v-for="stat in stats"
        :key="stat.key"
      >
        <p class="stat-label on-surface-subtle mb-0">
          {{ stat.label }}
        </p>
        <p class="text-body-1 font-weight-bold on-surface mb-0">
          {{ stat.value }}
        </p>
      </div>
    </div>
  </v-card>
</template>

<style scoped>
/* A entrada do cartão é da <Transition> em WeatherView — aqui não há animação
   própria, senão as duas rodariam juntas a cada troca. */
.summary-card {
  max-width: 420px;
  border-radius: 28px;
  box-shadow: 0 20px 50px rgba(var(--v-theme-on-surface), 0.25);
}

.city-name {
  font-size: 30px;
  line-height: 1.2;
}

.temperature {
  font-size: 76px;
  line-height: 1;
}

.stat-label {
  font-size: 11px;
}

.stats {
  display: flex;
  gap: 18px;
  border-top: 1px solid rgb(var(--v-theme-outline-variant));
}

@media (max-width: 599px) {
  .summary-card {
    max-width: none;
    width: 100%;
  }

  .temperature {
    font-size: 60px;
  }
}
</style>
