<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps({
  text: { type: String, required: true },
})

const emit = defineEmits(['retry'])
</script>

<template>
  <div class="notice">
    <span class="text-caption on-surface-muted">{{ text }}</span>
    <v-btn
      color="primary"
      variant="flat"
      rounded="pill"
      size="small"
      class="font-weight-bold bg-surface-muted"
      @click="emit('retry')"
    >
      {{ t('common.retry') }}
    </v-btn>
  </div>
</template>

<style scoped>
.notice {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 8px 8px 20px;
  border-radius: 999px;
  background: rgba(var(--v-theme-surface), 0.92);
  box-shadow: 0 6px 20px rgba(var(--v-theme-on-surface), 0.15);
}
</style>
