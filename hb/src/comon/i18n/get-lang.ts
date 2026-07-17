import { Lang } from './lang';

export function getLang(lang?: string): Lang {
  if (lang === 'en') return 'en';
  return 'tr';
}