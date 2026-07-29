import { ref } from 'vue'

const snackbar = ref({
  show: false,
  text: '',
  color: 'success'
})

const showMessage = (text, color = 'success') => {
  snackbar.value = { show: true, text, color }
}

const hideMessage = () => {
  snackbar.value.show = false
}

export function useSnackbar() {
  return {
    snackbar,
    showMessage,
    hideMessage
  }
}
