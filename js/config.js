/*!
 * GIFS Поисковик — js/config.js
 * Copyright (c) 2025–2026 PsyGioX <https://psygiox-dev.vercel.app/>
 * Licensed under the MIT License (see LICENSE)
 * https://github.com/PsyGioX/gifs-search-ru
 */

window.GIFS_CONFIG = Object.freeze({
  // Запросы идут через serverless-прокси (api/giphy.js).
  // Ключ GIPHY хранится только в переменных окружения Vercel (GIPHY_API_KEY).
  apiEndpoint: '/api/giphy',

  perPage: 24,
  maxOffset: 4999,          // лимит GIPHY на offset
  historyMax: 8,
  cacheTTL: 5 * 60 * 1000,  // 5 минут
  cacheMax: 60,
  searchDebounce: 600,
  minAutoSearchLength: 3,

  defaultLang: 'ru',
  supportedLangs: ['ru', 'en', 'pl']
});
