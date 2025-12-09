import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ru from './locales/ru.json';
import en from './locales/en.json';

// Получаем язык из localStorage или используем язык браузера
const savedLanguage = localStorage.getItem('language');
const browserLanguage = navigator.language.split('-')[0];
const defaultLanguage = savedLanguage || (browserLanguage === 'ru' ? 'ru' : 'en');

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
    lng: defaultLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;

