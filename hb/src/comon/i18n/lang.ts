import { messages } from './messages';

export type Lang = 'tr' | 'en';

export function t(lang: Lang, key: keyof typeof messages.tr) {
  return messages[lang] ?? messages.tr;
}