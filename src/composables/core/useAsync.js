import { ref } from 'vue'

import { useSnackbar } from '@/composables/core/useSnackbar'

export function useAsync(asyncFn, options = {}) {
  const { successMessage, errorMessage, silentErrorCodes = [] } = options
  const { showMessage } = useSnackbar()

  const data = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const execute = async (...args) => {
    loading.value = true
    error.value = null
    data.value = null
    try {
      const response = await asyncFn(...args)
      data.value = response
      if (successMessage) showMessage(successMessage, 'success')
      return response
    } catch (err) {
      error.value = err
      const code = err?.response?.data?.code
      if (errorMessage && !silentErrorCodes.includes(code)) showMessage(errorMessage, 'error')
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    data,
    loading,
    error,
    execute
  }
}
