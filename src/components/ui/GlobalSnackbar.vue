<script setup>
import { computed } from 'vue'

import { useSnackbar } from '@/composables/core/useSnackbar'

const { snackbar, hideMessage } = useSnackbar()

const snackbarIcon = computed(() => {
  switch (snackbar.value.color) {
    case 'success': return 'mdi-check-circle'
    case 'error': return 'mdi-alert-circle'
    case 'warning': return 'mdi-alert'
    default: return 'mdi-information'
  }
})
</script>

<template>
  <v-snackbar
    v-model="snackbar.show"
    :color="snackbar.color"
    :timeout="6000"
    class="shadow-ambient elevation-0"
    rounded="md"
  >
    <div
      class="d-flex align-center"
      :data-test="`snackbar-${snackbar.color}`"
    >
      <v-icon
        :icon="snackbarIcon"
        class="mr-3"
      />
      <span class="text-body-1 font-weight-medium">{{ snackbar.text }}</span>
    </div>
    <template #actions>
      <v-btn
        icon="mdi-close"
        variant="text"
        @click="hideMessage"
      />
    </template>
  </v-snackbar>
</template>
