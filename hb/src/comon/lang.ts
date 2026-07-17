export type Lang = 'tr' | 'en';
import { messages } from './messages';

export function t(lang: 'tr' | 'en', key: keyof typeof messages.tr) {
  return messages[lang][key];
}