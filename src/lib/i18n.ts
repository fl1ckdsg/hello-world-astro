export const LANGUAGES = ['RU', 'EN', 'UK', 'KZ'] as const;
export type Language = typeof LANGUAGES[number];

const translations: Record<string, Record<Language, string>> = {
  // Language screen
  'select_language': { RU: 'ВЫБЕРИ ЯЗЫК', EN: 'SELECT LANGUAGE', UK: 'ОБЕРИ МОВУ', KZ: 'ТІЛ ТАҢДАҢЫЗ' },

  // Nickname screen
  'enter_nickname': { RU: 'ВВЕДИ НИК', EN: 'ENTER NICKNAME', UK: 'ВВЕДИ НІК', KZ: 'ЛАҚАПАТыН ЕНГІЗ' },
  'hello_enter_nick': { RU: 'Привет! Введи ник', EN: 'Hi! Enter nickname', UK: 'Привіт! Введи нік', KZ: 'Сәлем! Лақапат енгіз' },
  'confirm': { RU: 'ПОДТВЕРДИТЬ', EN: 'CONFIRM', UK: 'ПІДТВЕРДИТИ', KZ: 'РАСТАУ' },
  'nickname_placeholder': { RU: 'Введи ник...', EN: 'Enter nick...', UK: 'Введи нік...', KZ: 'Лақапат...' },

  // Main menu
  'play': { RU: 'ИГРАТЬ', EN: 'PLAY', UK: 'ГРАТИ', KZ: 'ОЙНАУ' },
  'shop': { RU: 'МАГАЗИН', EN: 'SHOP', UK: 'МАГАЗИН', KZ: 'ДҮКЕН' },
  'profile': { RU: 'ПРОФИЛЬ', EN: 'PROFILE', UK: 'ПРОФІЛЬ', KZ: 'ПРОФИЛЬ' },
  'settings': { RU: 'НАСТРОЙКИ', EN: 'SETTINGS', UK: 'НАЛАШТУВАННЯ', KZ: 'БАПТАУЛАР' },
  'back': { RU: 'НАЗАД', EN: 'BACK', UK: 'НАЗАД', KZ: 'АРТҚА' },

  // Game screen
  'round': { RU: 'РАУНД', EN: 'ROUND', UK: 'РАУНД', KZ: 'РАУНД' },
  'fight': { RU: 'БОЙ!', EN: 'FIGHT!', UK: 'БОЙ!', KZ: 'ЖЕКПЕ-ЖЕК!' },
  'ko': { RU: 'НОКАУТ!', EN: 'KO!', UK: 'НОКАУТ!', KZ: 'НОКАУТ!' },
  'you_win': { RU: 'ТЫ ПОБЕДИЛ!', EN: 'YOU WIN!', UK: 'ТИ ПЕРЕМІГ!', KZ: 'СЕН ЖЕҢДІҢ!' },
  'you_lose': { RU: 'ТЫ ПРОИГРАЛ!', EN: 'YOU LOSE!', UK: 'ТИ ПРОГРАВ!', KZ: 'СЕН ЖЕҢІЛДІҢ!' },
  'play_again': { RU: 'СНОВА', EN: 'AGAIN', UK: 'ЗНОВУ', KZ: 'ҚАЙТА' },
  'jab': { RU: 'ДЖЕ', EN: 'JAB', UK: 'ДЖЕ', KZ: 'ДЖЕ' },
  'hook': { RU: 'ХУК', EN: 'HK', UK: 'ХУК', KZ: 'ХУК' },
  'uppercut': { RU: 'АПП', EN: 'UP', UK: 'АПП', KZ: 'АПП' },
  'kick': { RU: 'КИК', EN: 'KK', UK: 'КІК', KZ: 'КИК' },
  'block': { RU: 'БЛК', EN: 'BLK', UK: 'БЛК', KZ: 'БЛК' },
  'combo': { RU: 'КОМБО', EN: 'COMBO', UK: 'КОМБО', KZ: 'КОМБО' },

  // Shop
  'coming_soon': { RU: 'СКОРО', EN: 'COMING SOON', UK: 'НЕЗАБАРОМ', KZ: 'ЖАҚЫНДА' },

  // Profile
  'change_nickname': { RU: 'СМЕНИТЬ НИК', EN: 'CHANGE NICK', UK: 'ЗМІНИТИ НІК', KZ: 'ЛАҚАПАТТЫ ӨЗГЕРТУ' },
  'skin_color': { RU: 'ЦВЕТ КОЖИ', EN: 'SKIN COLOR', UK: 'КОЛІР ШКІРИ', KZ: 'ТЕРі ТҮСІ' },
  'hair_style': { RU: 'ПРИЧЁСКА', EN: 'HAIR STYLE', UK: 'ЗАЧІСКА', KZ: 'ШАШ ҮЛГІСІ' },
  'body_type': { RU: 'ТЕЛОСЛОЖЕНИЕ', EN: 'BODY TYPE', UK: 'ТІЛОБУДОВА', KZ: 'ДЕНЕ ТҮРІ' },
  'tattoos': { RU: 'ТАТУИРОВКИ', EN: 'TATTOOS', UK: 'ТАТУЮВАННЯ', KZ: 'ТАТУИРОВКАЛАР' },
  'shorts_color': { RU: 'ЦВЕТ ШОРТ', EN: 'SHORTS COLOR', UK: 'КОЛІР ШОРТІВ', KZ: 'ШАЛБАР ТҮСІ' },
  'gloves_color': { RU: 'ЦВЕТ ПЕРЧАТОК', EN: 'GLOVES COLOR', UK: 'КОЛІР РУКАВИЦЬ', KZ: 'ҚОЛҒАП ТҮСІ' },
  'save': { RU: 'СОХРАНИТЬ', EN: 'SAVE', UK: 'ЗБЕРЕГТИ', KZ: 'САҚТАУ' },

  // Settings
  'language': { RU: 'ЯЗЫК', EN: 'LANGUAGE', UK: 'МОВА', KZ: 'ТІЛ' },
  'sound': { RU: 'ЗВУК', EN: 'SOUND', UK: 'ЗВУК', KZ: 'ДЫБыС' },
  'vibration': { RU: 'ВИБРАЦИЯ', EN: 'VIBRATION', UK: 'ВІБРАЦІЯ', KZ: 'ДІРІЛ' },
  'controls': { RU: 'УПРАВЛЕНИЕ', EN: 'CONTROLS', UK: 'УПРАВЛІННЯ', KZ: 'БАСҚАРУ' },
  'left_hand': { RU: 'ЛЕВША', EN: 'LEFT HAND', UK: 'ЛІВОРУЧ', KZ: 'СОЛ ҚОЛ' },
  'right_hand': { RU: 'ПРАВША', EN: 'RIGHT HAND', UK: 'ПРАВОРУЧ', KZ: 'ОҢ ҚОЛ' },
  'on': { RU: 'ВКЛ', EN: 'ON', UK: 'УВК', KZ: 'ҚОСУ' },
  'off': { RU: 'ВЫКЛ', EN: 'OFF', UK: 'ВИМК', KZ: 'ОЖЕ' },
  'reset': { RU: 'СБРОС', EN: 'RESET', UK: 'СКИНУТИ', KZ: 'ҚАЛПЫНА КЕЛТІРУ' },
  'reset_confirm': { RU: 'СБРОС?', EN: 'RESET?', UK: 'СКИНУТИ?', KZ: 'ҚАЛПЫНА?' },

  // Hair styles
  'hair_short': { RU: 'КОРОТКИЕ', EN: 'SHORT', UK: 'КОРОТКІ', KZ: 'ҚЫСҚА' },
  'hair_mohawk': { RU: 'MOHAWK', EN: 'MOHAWK', UK: 'MOHAWK', KZ: 'MOHAWK' },
  'hair_dreads': { RU: 'ДРЕДЫ', EN: 'DREADS', UK: 'ДРЕДИ', KZ: 'ДРЕДЫ' },
  'hair_bald': { RU: 'ЛЫСЫЙ', EN: 'BALD', UK: 'ЛИСИЙ', KZ: 'ЛЫСЫЙ' },
  'hair_afro': { RU: 'АФРО', EN: 'AFRO', UK: 'АФРО', KZ: 'АФРО' },

  // Body types
  'body_slim': { RU: 'ХУДОЙ', EN: 'SLIM', UK: 'ХУДИЙ', KZ: 'АРЫҚ' },
  'body_average': { RU: 'СРЕДНИЙ', EN: 'AVERAGE', UK: 'СЕРЕДНІЙ', KZ: 'ОРТА' },
  'body_muscular': { RU: 'МУСКУЛИСТЫЙ', EN: 'MUSCULAR', UK: 'МУСКУЛИСТИЙ', KZ: 'БҰЛШЫҚЕТТІ' },

  // Tattoos
  'tattoo_none': { RU: 'НЕТ', EN: 'NONE', UK: 'НЕМАЄ', KZ: 'ЖОҚ' },
  'tattoo_arm': { RU: 'РУКа', EN: 'ARM', UK: 'РУКА', KZ: 'КОЛ' },
  'tattoo_chest': { RU: 'ГРУДЬ', EN: 'CHEST', UK: 'ГРУДИ', KZ: 'КЕУДЕ' },
  'tattoo_full': { RU: 'ПОЛНЫЕ', EN: 'FULL', UK: 'ПОВНІ', KZ: 'ТОЛЫҚ' },
};

export function t(key: string, lang: Language): string {
  const entry = translations[key];
  if (!entry) return key.toUpperCase();
  return entry[lang] || entry['EN'] || key.toUpperCase();
}
