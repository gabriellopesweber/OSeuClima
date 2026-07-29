<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { conditionLabelKey, WEATHER_CATEGORIES, WEATHER_ICONS } from '@/utils/weather'

const { t } = useI18n()

const units = defineModel('units', { type: String, default: 'metric' })
const demoCategory = defineModel('demoCategory', { type: String, default: 'auto' })
const reducedMotion = defineModel('reducedMotion', { type: Boolean, default: false })

const sceneOptions = computed(() => [
  { value: 'auto', label: t('weather.settings.scene_auto'), icon: 'mdi-crosshairs-gps' },
  ...WEATHER_CATEGORIES.map((category) => ({
    value: category,
    label: t(conditionLabelKey(category)),
    icon: WEATHER_ICONS[category],
  })),
])
</script>

<template>
  <v-menu
    :close-on-content-click="false"
    location="bottom end"
    offset="8"
  >
    <template #activator="{ props: menu }">
      <v-btn
        v-bind="menu"
        icon="mdi-tune-variant"
        variant="flat"
        color="surface"
        size="small"
        :aria-label="t('weather.settings.title')"
        class="settings-trigger"
      />
    </template>

    <v-card
      width="272"
      class="pa-4"
    >
      <p class="text-caption on-surface-muted mb-2">
        {{ t('weather.settings.units') }}
      </p>
      <v-btn-toggle
        v-model="units"
        mandatory
        divided
        density="comfortable"
        color="primary"
        class="w-100 mb-4"
      >
        <v-btn
          value="metric"
          class="flex-grow-1"
        >
          {{ t('weather.units.celsius') }}
        </v-btn>
        <v-btn
          value="imperial"
          class="flex-grow-1"
        >
          {{ t('weather.units.fahrenheit') }}
        </v-btn>
      </v-btn-toggle>

      <v-select
        v-model="demoCategory"
        :items="sceneOptions"
        item-title="label"
        item-value="value"
        :label="t('weather.settings.scene')"
        hide-details
        class="mb-2"
      >
        <template #item="{ props: item, item: option }">
          <v-list-item
            v-bind="item"
            :prepend-icon="option.raw.icon"
          />
        </template>
      </v-select>

      <v-switch
        v-model="reducedMotion"
        color="primary"
        density="comfortable"
        hide-details
        :label="t('weather.settings.reduced_motion')"
      />
    </v-card>
  </v-menu>
</template>

<style scoped>
.settings-trigger {
  box-shadow: 0 8px 24px rgba(var(--v-theme-on-surface), 0.18);
}
</style>
