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
  <TransitionGroup
    tag="div"
    class="hourly-strip"
    name="hourly"
  >
    <div
      v-for="(slot, index) in slots"
      :key="slot.label"
      class="hourly-slot"
      :style="{ '--enter-delay': `${index * 60}ms` }"
    >
      <p class="hourly-label on-surface-muted mb-0">
        {{ slot.label }}
      </p>
      <p class="font-display hourly-temp on-surface mt-1 mb-0">
        {{ slot.temperature }}°
      </p>
    </div>
  </TransitionGroup>
</template>

<style scoped>
.hourly-strip {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  max-width: 520px;
  padding-bottom: 4px;
  scroll-snap-type: x proximity;
  scrollbar-width: none;
}

/* No toque a barra não aparece, então ela não serve de affordance — o snap é
   o que sinaliza que a faixa rola. */
.hourly-strip::-webkit-scrollbar {
  display: none;
}

.hourly-slot {
  flex: 0 0 auto;
  min-width: 64px;
  scroll-snap-align: start;
  background: rgba(var(--v-theme-surface), 0.92);
  text-align: center;
  border-radius: 16px;
  padding: 14px 16px;
  box-shadow: 0 8px 22px rgba(var(--v-theme-on-surface), 0.14);
}

.hourly-label {
  font-size: 12px;
}

/* Entra escalonado, da esquerda para a direita, como se a previsão fosse
   chegando hora a hora. O delay vem do índice, via --enter-delay. */
.hourly-enter-active {
  transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  transition-delay: var(--enter-delay, 0ms);
}

.hourly-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
  position: absolute;
}

.hourly-enter-from {
  opacity: 0;
  transform: translateY(14px) scale(0.9);
}

.hourly-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
}

.hourly-move {
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
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

/* Deitado o cartão fica ao lado, então a faixa divide a largura com ele. */
@media (orientation: landscape) and (max-height: 500px) {
  .hourly-strip {
    max-width: 50%;
    margin-left: auto;
  }

  .hourly-slot {
    min-width: 56px;
    padding: 10px 12px;
  }
}
</style>
