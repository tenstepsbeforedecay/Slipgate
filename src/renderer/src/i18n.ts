import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import 'dayjs/locale/zh-cn'
import 'dayjs/locale/ru'
import 'dayjs/locale/en'

// Import translation files
import zhCN from './locales/zh-CN'
import enUS from './locales/en-US'
import ruRU from './locales/ru-RU'

const resources = {
  'zh-CN': { translation: zhCN },
  'en-US': { translation: enUS },
  'ru-RU': { translation: ruRU }
}

const getSavedLanguage = (): string => {
  const saved = localStorage.getItem('language')
  if (saved && ['zh-CN', 'en-US', 'ru-RU'].includes(saved)) {
    return saved
  }

  // Try to detect system language
  const systemLang = navigator.language || 'zh-CN'
  if (systemLang.startsWith('zh')) return 'zh-CN'
  if (systemLang.startsWith('ru')) return 'ru-RU'
  if (systemLang.startsWith('en')) return 'en-US'

  return 'ru-RU' // Default to Chinese
}

const savedLanguage = getSavedLanguage()

// Configure dayjs globally
dayjs.extend(relativeTime)
dayjs.extend(localizedFormat)
const dayjsLocaleMap: Record<string, string> = {
  'zh-CN': 'zh-cn',
  'en-US': 'en',
  'ru-RU': 'ru'
}
dayjs.locale(dayjsLocaleMap[savedLanguage] || 'en')

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'en-US',
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: false
    }
  })

// Sync language to main process (tray, macOS menu bar)
window.electron.ipcRenderer.invoke('setLanguage', savedLanguage)

export default i18n
