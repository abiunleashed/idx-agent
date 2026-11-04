import { createContext, useContext, useState, type ReactNode } from 'react';

import { STRINGS, type Lang, type StringKey } from './strings';

type I18n = { lang: Lang; setLang: (l: Lang) => void; t: (key: StringKey) => string };

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('id');
  const t = (key: StringKey) => STRINGS[lang][key];
  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
