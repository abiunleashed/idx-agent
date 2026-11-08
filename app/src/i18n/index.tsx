import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { STRINGS, type Lang, type StringKey } from './strings';

type I18n = { lang: Lang; setLang: (l: Lang) => void; t: (key: StringKey) => string };

const I18nContext = createContext<I18n | null>(null);
const STORAGE_KEY = 'sepadan.lang';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('id');

  // Remember the chosen language between app launches.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved && saved in STRINGS) setLangState(saved as Lang);
      })
      .catch(() => {});
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {});
  };
  const t = (key: StringKey) => STRINGS[lang][key];
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
