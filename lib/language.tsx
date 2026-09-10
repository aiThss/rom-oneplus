'use client';
/* eslint-disable react/react-compiler */

import { createContext, useContext, useEffect, useState } from 'react';

export type Language = 'vi' | 'en';

export function regionLabel(region: string | undefined, language: Language) {
  if (!region || language === 'vi') return region || '';
  const normalized = region.trim().toLowerCase();
  const labels: Record<string, string> = {
    'quốc tế': 'Global',
    'quoc te': 'Global',
    international: 'Global',
    global: 'Global',
    'châu âu': 'Europe',
    'chau au': 'Europe',
    europe: 'Europe',
    'trung quốc': 'China',
    'trung quoc': 'China',
    china: 'China',
    'ấn độ': 'India',
    'an do': 'India',
    india: 'India',
    mỹ: 'United States',
    'hoa kỳ': 'United States',
    'hoa ky': 'United States',
    us: 'United States',
    'đài loan': 'Taiwan',
    'dai loan': 'Taiwan',
    taiwan: 'Taiwan',
    tw: 'Taiwan',
    nga: 'Russia',
    russia: 'Russia',
    ru: 'Russia',
    turkey: 'Turkey',
    türkiye: 'Turkey',
    'thổ nhĩ kỳ': 'Turkey',
    'tho nhi ky': 'Turkey',
    tr: 'Turkey',
    'hồng kông': 'Hong Kong',
    'hong kong': 'Hong Kong',
    hk: 'Hong Kong',
    nhật: 'Japan',
    'nhật bản': 'Japan',
    japan: 'Japan',
    jp: 'Japan',
    'hàn quốc': 'South Korea',
    'han quoc': 'South Korea',
    'south korea': 'South Korea',
    korea: 'South Korea',
    kr: 'South Korea',
    indonesia: 'Indonesia',
    id: 'Indonesia',
    malaysia: 'Malaysia',
    my: 'Malaysia',
    thailand: 'Thailand',
    'thái lan': 'Thailand',
    'thai lan': 'Thailand',
    th: 'Thailand',
    singapore: 'Singapore',
    sg: 'Singapore',
    philippines: 'Philippines',
    ph: 'Philippines',
    vietnam: 'Vietnam',
    'việt nam': 'Vietnam',
    'viet nam': 'Vietnam',
    vn: 'Vietnam',
    brazil: 'Brazil',
    br: 'Brazil',
    mexico: 'Mexico',
    mx: 'Mexico',
    'vương quốc anh': 'United Kingdom',
    'vuong quoc anh': 'United Kingdom',
    uk: 'United Kingdom',
    germany: 'Germany',
    đức: 'Germany',
    duc: 'Germany',
    france: 'France',
    pháp: 'France',
    phap: 'France',
    italy: 'Italy',
    ý: 'Italy',
    y: 'Italy',
    spain: 'Spain',
    'tây ban nha': 'Spain',
    'tay ban nha': 'Spain',
    poland: 'Poland',
    'ba lan': 'Poland',
    kazakhstan: 'Kazakhstan',
  };
  return labels[normalized] || region;
}

export const LanguageContext = createContext<{
  language: Language;
  setLanguage: (language: Language) => void;
}>({
  language: 'vi',
  setLanguage: () => undefined,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('vi');
  useEffect(() => {
    setLanguage(localStorage.getItem('rom-language') === 'en' ? 'en' : 'vi');
  }, []);
  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
