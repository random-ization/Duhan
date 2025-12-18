import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { translations } from './i18n';

// Transform our existing translations object into i18next resources format
const resources = Object.keys(translations).reduce((acc, lang) => {
    acc[lang] = {
        translation: translations[lang as keyof typeof translations]
    };
    return acc;
}, {} as any);

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: 'en', // Default start language
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false // React already safes from xss
        },
        react: {
            useSuspense: false // We are bundling translations, so no suspense needed
        }
    });

export default i18n;
