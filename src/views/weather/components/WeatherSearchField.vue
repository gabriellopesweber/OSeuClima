<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps({
  busy: { type: Boolean, default: false },
})

const term = defineModel({ type: String, default: '' })
const emit = defineEmits(['search'])
</script>

<template>
  <form
    class="search-pill bg-surface"
    @submit.prevent="emit('search')"
  >
    <input
      v-model="term"
      class="search-input on-surface"
      type="search"
      :placeholder="t('weather.search.placeholder')"
      :aria-label="t('weather.search.aria_label')"
      autocomplete="off"
    >
    <v-btn
      type="submit"
      color="primary"
      variant="flat"
      rounded="pill"
      class="font-weight-bold px-5"
      :loading="busy"
    >
      {{ t('common.search') }}
    </v-btn>
  </form>
</template>

<style scoped>
.search-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  border-radius: 999px;
  padding: 6px 6px 6px 20px;
  box-shadow: 0 8px 24px rgba(var(--v-theme-on-surface), 0.18);
}

.search-input {
  border: none;
  outline: none;
  background: transparent;
  font-size: 15px;
  width: 180px;
  min-width: 0;
}

.search-input::-webkit-search-cancel-button {
  cursor: pointer;
}

@media (max-width: 599px) {
  .search-input {
    width: 100%;
  }

  .search-pill {
    flex: 1 1 auto;
  }
}
</style>
