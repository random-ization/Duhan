import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';

i18n
  .use(Backend)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    lng: 'en', // Default start language, AuthContext updates this
    backend: {
      loadPath:
        typeof window !== 'undefined'
          ? `${window.location.origin}${import.meta.env.BASE_URL}locales/{{lng}}.json`
          : `${import.meta.env.BASE_URL}locales/{{lng}}.json`,
      queryStringParams: {
        v: import.meta.env.VITE_I18N_VERSION,
      },
    },
    interpolation: {
      escapeValue: false, // React already safes from xss
    },
    react: {
      useSuspense: false, // We handle loading manually via AuthContext or direct checks
    },
  });

export default i18n;
