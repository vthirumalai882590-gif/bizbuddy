import { useAuth } from '@/context/AuthContext'
import { translations } from '@/utils/translations'

export function useTranslation() {
  const auth = useAuth()
  const lang = auth?.user?.language ?? 'en'

  const t = (key: string): string => {
    return translations[lang]?.[key] ?? translations['en']?.[key] ?? key
  }

  return { t, currentLanguage: lang }
}
