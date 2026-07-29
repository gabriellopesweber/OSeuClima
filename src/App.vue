<script setup>
import GlobalSnackbar from '@/components/ui/GlobalSnackbar.vue'
</script>

<template>
  <v-app>
    <v-main>
      <router-view />
    </v-main>
    <GlobalSnackbar />
  </v-app>
</template>
