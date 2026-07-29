<script setup>
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useWeather } from '@/composables/weather/useWeather'
import { useWeatherScene } from '@/composables/weather/useWeatherScene'
import { useWeatherSettings } from '@/composables/weather/useWeatherSettings'

import WeatherHourlyStrip from './components/WeatherHourlyStrip.vue'
import WeatherLoadingOverlay from './components/WeatherLoadingOverlay.vue'
import WeatherNotice from './components/WeatherNotice.vue'
import WeatherSearchField from './components/WeatherSearchField.vue'
import WeatherSettingsMenu from './components/WeatherSettingsMenu.vue'
import WeatherSummaryCard from './components/WeatherSummaryCard.vue'

const { t } = useI18n()

const canvasRef = ref(null)

const { units, demoCategory, reducedMotion } = useWeatherSettings()
const {
  isLoading,
  notice,
  place,
  measures,
  category,
  isDay,
  hourly,
  searchTerm,
  searchBusy,
  searchError,
  load,
  locate,
  search,
} = useWeather(demoCategory)

useWeatherScene(canvasRef, { category, isDay, reducedMotion })

onMounted(load)
</script>

<template>
  <div class="weather-page">
    <canvas
      ref="canvasRef"
      class="weather-canvas"
    />

    <div class="weather-overlay">
      <header class="overlay-row">
        <p class="font-display brand on-background mb-0">
          {{ t('common.app_name') }}
        </p>

        <div class="header-actions">
          <WeatherSearchField
            v-model="searchTerm"
            :busy="searchBusy"
            @search="search"
          />
          <WeatherSettingsMenu
            v-model:units="units"
            v-model:demo-category="demoCategory"
            v-model:reduced-motion="reducedMotion"
          />
        </div>
      </header>

      <p
        v-if="searchError"
        class="search-error text-caption text-error mb-0"
      >
        {{ searchError }}
      </p>

      <WeatherNotice
        v-if="notice"
        class="notice-slot"
        :text="notice"
        @retry="locate"
      />

      <div class="overlay-spacer" />

      <footer class="overlay-row overlay-footer">
        <WeatherSummaryCard
          :place="place"
          :measures="measures"
          :units="units"
        />
        <WeatherHourlyStrip
          :items="hourly"
          :units="units"
        />
      </footer>
    </div>

    <WeatherLoadingOverlay v-if="isLoading" />
  </div>
</template>

<style scoped>
.weather-page {
  position: relative;
  width: 100%;
  height: 100dvh;
  overflow: hidden;
  background: rgb(var(--v-theme-background));
}

.weather-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}

.weather-overlay {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 32px 48px;
  box-sizing: border-box;
  pointer-events: none;
}

.overlay-row > *,
.search-error,
.notice-slot {
  pointer-events: auto;
}

.overlay-spacer {
  flex: 1;
}

.overlay-row {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.overlay-footer {
  align-items: flex-end;
}

.brand {
  font-size: 26px;
  text-shadow: 0 2px 12px rgba(var(--v-theme-background), 0.35);
}

.search-error {
  align-self: flex-end;
  border-radius: 12px;
  padding: 8px 16px;
  background: rgb(var(--v-theme-surface));
  box-shadow: 0 4px 14px rgba(var(--v-theme-on-surface), 0.12);
}

.notice-slot {
  align-self: center;
}

@media (max-width: 959px) {
  .weather-overlay {
    padding: 20px;
  }

  .overlay-footer {
    align-items: stretch;
    gap: 16px;
  }
}

@media (max-width: 599px) {
  .header-actions {
    flex: 1 1 100%;
  }

  .notice-slot {
    align-self: stretch;
  }
}
</style>
