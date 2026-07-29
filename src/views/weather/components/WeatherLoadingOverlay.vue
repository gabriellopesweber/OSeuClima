<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="overlay">
    <div class="overlay-card bg-surface">
      <v-progress-circular
        indeterminate
        color="primary"
        size="36"
        width="4"
      />
      <p class="text-body-2 on-surface-muted mb-0">
        {{ t('weather.loading') }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-background), 0.55);
}

.overlay-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 28px 36px;
  border-radius: 20px;
  box-shadow: 0 20px 50px rgba(var(--v-theme-on-surface), 0.3);
}
</style>
