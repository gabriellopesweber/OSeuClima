<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { convertTemperature } from '@/utils/weather'

const { t } = useI18n()

const props = defineProps({
  items: { type: Array, default: () => [] },
  units: { type: String, default: 'metric' },
})

const slots = computed(() => props.items.map((item) => ({
  label: item.label,
  temperature: convertTemperature(item.temperature, props.units) ?? t('common.empty_measure'),
})))
</script>

<template>
  <div class="hourly-strip">
    <div
      v-for="slot in slots"
      :key="slot.label"
      class="hourly-slot"
    >
      <p class="hourly-label on-surface-muted mb-0">
        {{ slot.label }}
      </p>
      <p class="font-display hourly-temp on-surface mt-1 mb-0">
        {{ slot.temperature }}°
      </p>
    </div>
  </div>
</template>

<style scoped>
.hourly-strip {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  max-width: 520px;
  padding-bottom: 4px;
}

.hourly-slot {
  flex: 0 0 auto;
  min-width: 64px;
  background: rgba(var(--v-theme-surface), 0.92);
  text-align: center;
  border-radius: 16px;
  padding: 14px 16px;
  box-shadow: 0 8px 22px rgba(var(--v-theme-on-surface), 0.14);
}

.hourly-label {
  font-size: 12px;
}

.hourly-temp {
  font-size: 17px;
}

@media (max-width: 959px) {
  .hourly-strip {
    max-width: none;
    width: 100%;
  }
}
</style>
