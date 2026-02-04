import { Language } from '../types';

type FourLangText = {
  zh: string;
  en: string;
  vi: string;
  mn: string;
};

export const t4 = (language: Language, text: FourLangText): string => {
  return text[language] || text.en;
};

export const localeFromLanguage = (language: Language): string => {
  switch (language) {
    case 'zh':
      return 'zh-CN';
    case 'vi':
      return 'vi-VN';
    case 'mn':
      return 'mn-MN';
    default:
      return 'en-US';
  }
};
