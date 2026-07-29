import { createApp } from 'vue'

import App from './App.vue'
import router from './router/index'
import i18n from './plugins/i18n'
import vuetify from './plugins/vuetify'
import './styles/main.css'

const app = createApp(App)

app.use(i18n)
app.use(vuetify)
app.use(router)

app.mount('#app')