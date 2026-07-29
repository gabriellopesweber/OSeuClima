import { createI18n } from 'vue-i18n'

const DEFAULT_LOCALE = 'pt-BR'

// Deep merge dos arquivos de locale: criar o .json já o carrega, sem registro manual.
const merge = (target, source) => {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      target[key] = merge(target[key] ?? {}, value)
    } else {
      target[key] = value
    }
  }
  return target
}

const buildMessages = () => {
  const modules = import.meta.glob('../locales/**/*.json', { eager: true })
  const messages = {}

  for (const [path, module] of Object.entries(modules)) {
    const locale = path.match(/locales\/([^/]+)\//)?.[1]
    if (!locale) continue
    messages[locale] = merge(messages[locale] ?? {}, module.default ?? module)
  }

  return messages
}

export default createI18n({
  legacy: false,
  globalInjection: true,
  locale: DEFAULT_LOCALE,
  fallbackLocale: DEFAULT_LOCALE,
  messages: buildMessages(),
})
