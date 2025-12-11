import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ru from '../src/i18n/locales/ru.json';
import en from '../src/i18n/locales/en.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: en
      },
      ru: {
        translation: ru
      }
    },
    lng: 'ru',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
