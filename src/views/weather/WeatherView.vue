<script setup>
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { useCelestial } from '@/composables/weather/useCelestial'
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

const { units, demoCategory, seasonOverride, timeOverride, reducedMotion } = useWeatherSettings()
const {
  isLoading,
  notice,
  place,
  measures,
  category,
  windSpeed,
  season,
  latitude,
  longitude,
  hourly,
  searchTerm,
  searchBusy,
  searchError,
  load,
  locate,
  search,
} = useWeather(demoCategory)

const activeSeason = computed(() => (seasonOverride.value === 'auto' ? season.value : seasonOverride.value))

const celestial = useCelestial({ latitude, longitude, timeOverride })

useWeatherScene(canvasRef, { category, wind: windSpeed, season: activeSeason, celestial, reducedMotion })

// Só cidade e condição remontam o cartão: trocar °C/°F muda os números sem
// reanimar a tela inteira.
const cardKey = computed(() => `${place.value.city}-${measures.value.category}`)

onMounted(load)
</script>

<template>
  <div
    class="weather-page"
    :class="{ 'motion-reduced': reducedMotion }"
  >
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
            v-model:season-override="seasonOverride"
            v-model:time-override="timeOverride"
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
        <Transition
          name="card-swap"
          mode="out-in"
        >
          <WeatherSummaryCard
            :key="cardKey"
            :place="place"
            :measures="measures"
            :units="units"
            :moon-phase-key="celestial.moonPhaseKey.value"
          />
        </Transition>
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

/* `viewport-fit=cover` no index.html faz a página ir até as bordas; sem os
   env() o cabeçalho fica por baixo do notch e a faixa horária por baixo da
   barra de gestos. */
.weather-overlay {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding:
    max(32px, env(safe-area-inset-top))
    max(48px, env(safe-area-inset-right))
    max(32px, env(safe-area-inset-bottom))
    max(48px, env(safe-area-inset-left));
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

/* `mode="out-in"`: o cartão antigo sai antes de o novo entrar, senão os dois
   se empilham e a coluna salta de altura no meio da troca. */
.card-swap-enter-active {
  transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.card-swap-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.card-swap-enter-from {
  opacity: 0;
  transform: translateY(16px) scale(0.97);
}

.card-swap-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.99);
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
    padding:
      max(20px, env(safe-area-inset-top))
      max(20px, env(safe-area-inset-right))
      max(20px, env(safe-area-inset-bottom))
      max(20px, env(safe-area-inset-left));
  }

  .overlay-footer {
    align-items: stretch;
    gap: 16px;
  }
}

@media (max-width: 599px) {
  /* Cabeçalho numa linha só: deixar `.header-actions` quebrar para 100% custa
     ~50px de altura, que aqui pertencem à cena. O `:not()` é essencial — o
     rodapé também é `.overlay-row`, e sem ele o cartão para de ocupar a
     largura toda e divide a linha com a faixa horária. */
  .overlay-row:not(.overlay-footer) {
    gap: 12px;
    flex-wrap: nowrap;
  }

  .brand {
    font-size: 20px;
    flex: 0 0 auto;
  }

  .header-actions {
    flex: 1 1 auto;
    min-width: 0;
    justify-content: flex-end;
  }

  .notice-slot,
  .search-error {
    align-self: stretch;
  }
}

/* Celular deitado: sobra largura e falta altura, então volta o arranjo lado a
   lado do desktop. Sem isto o conteúdo passa dos ~390px e é cortado, porque a
   página tem overflow: hidden. */
@media (orientation: landscape) and (max-height: 500px) {
  .weather-overlay {
    gap: 4px;
    padding:
      max(10px, env(safe-area-inset-top))
      max(16px, env(safe-area-inset-right))
      max(10px, env(safe-area-inset-bottom))
      max(16px, env(safe-area-inset-left));
  }

  .overlay-row {
    flex-wrap: nowrap;
  }

  .overlay-footer {
    align-items: flex-end;
    gap: 12px;
  }

  .brand {
    font-size: 18px;
  }
}
</style>
