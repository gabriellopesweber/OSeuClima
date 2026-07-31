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
      class="search-submit font-weight-bold"
      :loading="busy"
      :aria-label="t('common.search')"
    >
      <v-icon
        class="search-submit-icon"
        icon="mdi-magnify"
      />
      <span class="search-submit-label">{{ t('common.search') }}</span>
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

.search-submit {
  padding-inline: 20px;
}

.search-submit-icon {
  display: none;
}

@media (max-width: 599px) {
  .search-input {
    width: 100%;
  }

  .search-pill {
    flex: 1 1 auto;
    padding-left: 14px;
  }

  /* Com a marca na mesma linha sobram ~176px para a pílula, e o rótulo
     "Buscar" come tanto que o placeholder aparecia cortado em "Busca".
     O ícone devolve ~55px ao campo. */
  .search-submit {
    padding-inline: 12px;
    min-width: 0;
  }

  .search-submit-icon {
    display: inline-flex;
  }

  .search-submit-label {
    display: none;
  }
}
</style>
