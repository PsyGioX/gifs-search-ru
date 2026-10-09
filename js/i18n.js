/*!
 * GIFS Поисковик — js/i18n.js
 * Система переводов: русский, английский, польский (разговорный стиль)
 * Copyright (c) 2025–2026 PsyGioX <https://psygiox-dev.vercel.app/>
 * Licensed under the MIT License (see LICENSE)
 * https://github.com/PsyGioX/gifs-search-ru
 */

(function () {
  'use strict';

  const CFG = window.GIFS_CONFIG;
  const STORAGE_KEY = 'gifLang';

  const LOCALES = { ru: 'ru_RU', en: 'en_US', pl: 'pl_PL' };

  /* Значение-объект {one, few, many, other} — это склонение по числу {n}. */
  const DICT = {
    /* ───────────────────────── Русский ───────────────────────── */
    ru: {
      'meta.title': 'GIFS Поисковик — гифки, мемы и стикеры бесплатно',
      'meta.description': 'Ищи гифки, мемы и реакции, смотри превью и качай бесплатно. Котики, приколы, эмоции — всё в одном месте.',
      'a11y.skip': 'Перейти к содержимому',
      'lang.label': 'Язык интерфейса',
      'theme.toLight': 'Включить светлую тему',
      'theme.toDark': 'Включить тёмную тему',

      'hero.badge': 'Бесплатно и без регистрации',
      'hero.title': 'Находи гифки на любой случай',
      'hero.subtitle': 'Ищи, смотри превью и качай — всё за пару кликов.',
      'search.label': 'Поиск гифок',
      'search.placeholder': 'Например: котики, мемы, реакции…',
      'search.button': 'Искать',
      'search.clear': 'Очистить поле',
      'search.help': 'Пиши, что хочешь найти, а мы подберём гифки',

      'cat.title': 'Популярные категории',
      'cat.cats': 'Котики',
      'cat.memes': 'Мемы',
      'cat.reactions': 'Реакции',
      'cat.animals': 'Зверята',
      'q.cats': 'милые котики',
      'q.memes': 'смешные мемы',
      'q.reactions': 'реакции эмоции',
      'q.animals': 'животные',

      'trending.button': 'В тренде',
      'section.trending': 'Сейчас в тренде',
      'section.search': 'Результаты по запросу «{q}»',
      'results.loading': 'Секунду, загружаем…',
      'results.count': {
        one: 'Нашли {n} гифку', few: 'Нашли {n} гифки',
        many: 'Нашли {n} гифок', other: 'Нашли {n} гифки'
      },
      'results.shown': 'Показали {shown} из {total}',

      'history.title': 'Недавние запросы',
      'history.empty': 'Пока тут пусто — самое время что-нибудь поискать',
      'history.clear': 'Очистить историю',
      'history.search': 'Искать «{q}»',

      'load.more': 'Показать ещё',

      'gif.alt': 'Анимированная гифка',
      'gif.untitled': 'Гифка без названия',
      'gif.list': 'Коллекция гифок',
      'gif.view': 'Открыть гифку',
      'gif.download': 'Скачать гифку',
      'gif.copy': 'Скопировать ссылку',

      'modal.close': 'Закрыть',
      'modal.rating': 'Рейтинг',
      'modal.size': 'Размер',
      'modal.uploaded': 'Когда залили',
      'modal.copy': 'Скопировать ссылку',
      'modal.share': 'Поделиться',
      'modal.download': 'Скачать',
      'units.kb': 'КБ',
      'units.mb': 'МБ',

      'toast.downloaded': 'Готово, гифка скачана!',
      'toast.copied': 'Ссылка уже в буфере!',
      'toast.downloadFallback': 'Открыли гифку в новой вкладке — сохрани её оттуда',
      'error.empty': 'Ничего не нашлось. Попробуй другой запрос',
      'error.load': 'Не получилось загрузить. Проверь интернет и попробуй ещё раз',
      'error.download': 'Не вышло скачать. Попробуй ещё раз',
      'share.title': 'Гифка из GIFS Поисковика',
      'share.text': 'Глянь, какая годная гифка!',

      'footer.made': 'Сделано с',
      'footer.by': 'от',
      'footer.license': 'Лицензия MIT',
      'footer.source': 'Код на GitHub',
      'footer.giphy': 'Гифки от GIPHY'
    },

    /* ───────────────────────── English ───────────────────────── */
    en: {
      'meta.title': 'GIFS Search — free GIFs, memes and stickers',
      'meta.description': 'Search GIFs, memes and reactions, preview them and grab them for free. Cats, funny stuff, feels — all in one place.',
      'a11y.skip': 'Skip to content',
      'lang.label': 'Interface language',
      'theme.toLight': 'Switch to light theme',
      'theme.toDark': 'Switch to dark theme',

      'hero.badge': 'Free, no sign-up needed',
      'hero.title': 'Find a GIF for every mood',
      'hero.subtitle': 'Search, preview and download — just a couple of clicks.',
      'search.label': 'Search GIFs',
      'search.placeholder': 'Try: kittens, memes, reactions…',
      'search.button': 'Search',
      'search.clear': 'Clear the field',
      'search.help': 'Type whatever you\u2019re after and we\u2019ll dig up some GIFs',

      'cat.title': 'Popular categories',
      'cat.cats': 'Kitties',
      'cat.memes': 'Memes',
      'cat.reactions': 'Reactions',
      'cat.animals': 'Critters',
      'q.cats': 'cute cats',
      'q.memes': 'funny memes',
      'q.reactions': 'reaction emotions',
      'q.animals': 'animals',

      'trending.button': 'Trending',
      'section.trending': 'What\u2019s hot right now',
      'section.search': 'Results for \u201C{q}\u201D',
      'results.loading': 'Hang on, loading\u2026',
      'results.count': { one: 'We found {n} GIF', other: 'We found {n} GIFs' },
      'results.shown': 'Showing {shown} of {total}',

      'history.title': 'Recent searches',
      'history.empty': 'Nothing here yet \u2014 go search for something!',
      'history.clear': 'Clear history',
      'history.search': 'Search for \u201C{q}\u201D',

      'load.more': 'Show more',

      'gif.alt': 'Animated GIF',
      'gif.untitled': 'Untitled GIF',
      'gif.list': 'GIF collection',
      'gif.view': 'Open GIF',
      'gif.download': 'Download GIF',
      'gif.copy': 'Copy link',

      'modal.close': 'Close',
      'modal.rating': 'Rating',
      'modal.size': 'Size',
      'modal.uploaded': 'Uploaded',
      'modal.copy': 'Copy link',
      'modal.share': 'Share',
      'modal.download': 'Download',
      'units.kb': 'KB',
      'units.mb': 'MB',

      'toast.downloaded': 'Nailed it, GIF saved!',
      'toast.copied': 'Link\u2019s copied!',
      'toast.downloadFallback': 'We opened the GIF in a new tab \u2014 save it from there',
      'error.empty': 'No luck \u2014 try something else',
      'error.load': 'Couldn\u2019t load the GIFs. Check your connection and try again',
      'error.download': 'Couldn\u2019t download it. Give it another go',
      'share.title': 'A GIF from GIFS Search',
      'share.text': 'Check out this awesome GIF!',

      'footer.made': 'Made with',
      'footer.by': 'by',
      'footer.license': 'MIT License',
      'footer.source': 'Code on GitHub',
      'footer.giphy': 'GIFs powered by GIPHY'
    },

    /* ───────────────────────── Polski ───────────────────────── */
    pl: {
      'meta.title': 'GIFS Wyszukiwarka \u2014 gify, memy i naklejki za darmo',
      'meta.description': 'Szukaj gifów, memów i reakcji, oglądaj podgląd i pobieraj za darmo. Kotki, żarty, emocje \u2014 wszystko w jednym miejscu.',
      'a11y.skip': 'Przejdź do treści',
      'lang.label': 'Język interfejsu',
      'theme.toLight': 'Włącz jasny motyw',
      'theme.toDark': 'Włącz ciemny motyw',

      'hero.badge': 'Za darmo i bez rejestracji',
      'hero.title': 'Znajdź gifa na każdą okazję',
      'hero.subtitle': 'Szukaj, oglądaj podgląd i pobieraj \u2014 wystarczy kilka kliknięć.',
      'search.label': 'Szukaj gifów',
      'search.placeholder': 'Np. kotki, memy, reakcje…',
      'search.button': 'Szukaj',
      'search.clear': 'Wyczyść pole',
      'search.help': 'Wpisz, czego szukasz, a my wygrzebiemy dla Ciebie gify',

      'cat.title': 'Popularne kategorie',
      'cat.cats': 'Kotki',
      'cat.memes': 'Memy',
      'cat.reactions': 'Reakcje',
      'cat.animals': 'Zwierzaki',
      'q.cats': 'słodkie kotki',
      'q.memes': 'śmieszne memy',
      'q.reactions': 'reakcje emocje',
      'q.animals': 'zwierzęta',

      'trending.button': 'Na topie',
      'section.trending': 'Co jest teraz na czasie',
      'section.search': 'Wyniki dla \u201E{q}\u201D',
      'results.loading': 'Moment, ładujemy…',
      'results.count': {
        one: 'Mamy {n} gifa', few: 'Mamy {n} gify',
        many: 'Mamy {n} gifów', other: 'Mamy {n} gifa'
      },
      'results.shown': 'Pokazujemy {shown} z {total}',

      'history.title': 'Ostatnie wyszukiwania',
      'history.empty': 'Na razie pusto \u2014 wyszukaj coś!',
      'history.clear': 'Wyczyść historię',
      'history.search': 'Szukaj \u201E{q}\u201D',

      'load.more': 'Pokaż więcej',

      'gif.alt': 'Animowany gif',
      'gif.untitled': 'Gif bez tytułu',
      'gif.list': 'Kolekcja gifów',
      'gif.view': 'Otwórz gifa',
      'gif.download': 'Pobierz gifa',
      'gif.copy': 'Skopiuj link',

      'modal.close': 'Zamknij',
      'modal.rating': 'Ocena',
      'modal.size': 'Rozmiar',
      'modal.uploaded': 'Dodano',
      'modal.copy': 'Skopiuj link',
      'modal.share': 'Udostępnij',
      'modal.download': 'Pobierz',
      'units.kb': 'KB',
      'units.mb': 'MB',

      'toast.downloaded': 'Gotowe, gif pobrany!',
      'toast.copied': 'Link skopiowany!',
      'toast.downloadFallback': 'Otworzyliśmy gifa w nowej karcie \u2014 zapisz go stamtąd',
      'error.empty': 'Nic nie znaleźliśmy. Spróbuj czegoś innego',
      'error.load': 'Nie udało się załadować. Sprawdź internet i spróbuj jeszcze raz',
      'error.download': 'Nie wyszło z pobieraniem. Spróbuj jeszcze raz',
      'share.title': 'Gif z GIFS Wyszukiwarki',
      'share.text': 'Zobacz, jaki fajny gif!',

      'footer.made': 'Zrobione z',
      'footer.by': 'przez',
      'footer.license': 'Licencja MIT',
      'footer.source': 'Kod na GitHubie',
      'footer.giphy': 'Gify od GIPHY'
    }
  };

  let current = CFG.defaultLang;
  let pluralRules = new Intl.PluralRules(current);

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  }
  function safeSet(key, value) {
    try { localStorage.setItem(key, value); } catch (_) { /* приватный режим */ }
  }

  function isSupported(code) {
    return CFG.supportedLangs.includes(code);
  }

  function detect() {
    const fromUrl = new URLSearchParams(location.search).get('lang');
    if (isSupported(fromUrl)) return fromUrl;

    const stored = safeGet(STORAGE_KEY);
    if (isSupported(stored)) return stored;

    const prefs = navigator.languages && navigator.languages.length
      ? navigator.languages : [navigator.language || ''];
    for (const p of prefs) {
      const short = String(p).toLowerCase().split('-')[0];
      if (isSupported(short)) return short;
    }
    return CFG.defaultLang;
  }

  /** Перевод по ключу. Если в языке нет ключа — берём русский, затем сам ключ. */
  function t(key, params = {}) {
    let value = DICT[current][key];
    if (value === undefined) value = DICT.ru[key];
    if (value === undefined) return key;

    if (typeof value === 'object') {
      const n = Number(params.n);
      value = value[pluralRules.select(n)] || value.other;
    }
    return value.replace(/\{(\w+)\}/g, (_, name) => {
      if (params[name] === undefined) return `{${name}}`;
      return name === 'n'
        ? new Intl.NumberFormat(LOCALES[current].replace('_', '-')).format(params[name])
        : String(params[name]);
    });
  }

  function setMeta(selector, attr, value) {
    const el = document.querySelector(selector);
    if (el) el.setAttribute(attr, value);
  }

  function applyMeta() {
    document.documentElement.lang = current;
    document.title = t('meta.title');
    setMeta('meta[name="description"]', 'content', t('meta.description'));
    setMeta('meta[property="og:title"]', 'content', t('meta.title'));
    setMeta('meta[property="og:description"]', 'content', t('meta.description'));
    setMeta('meta[property="og:locale"]', 'content', LOCALES[current]);
    setMeta('meta[name="twitter:title"]', 'content', t('meta.title'));
    setMeta('meta[name="twitter:description"]', 'content', t('meta.description'));
  }

  /** data-i18n="key" → textContent; data-i18n-attr="placeholder:key;aria-label:key2" */
  function apply(root = document) {
    root.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    root.querySelectorAll('[data-i18n-attr]').forEach((el) => {
      el.dataset.i18nAttr.split(';').forEach((pair) => {
        const [attr, key] = pair.split(':').map((s) => s.trim());
        if (attr && key) el.setAttribute(attr, t(key));
      });
    });
  }

  function syncSwitcher() {
    document.querySelectorAll('[data-lang]').forEach((btn) => {
      const active = btn.dataset.lang === current;
      btn.setAttribute('aria-pressed', String(active));
      btn.classList.toggle('is-active', active);
    });
  }

  function setLang(code, { persist = true } = {}) {
    if (!isSupported(code)) return;
    current = code;
    pluralRules = new Intl.PluralRules(code);

    if (persist) {
      safeSet(STORAGE_KEY, code);
      const url = new URL(location.href);
      url.searchParams.set('lang', code);
      history.replaceState(null, '', url);
    }
    applyMeta();
    apply();
    syncSwitcher();
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: code } }));
  }

  function init() {
    setLang(detect(), { persist: false });
    document.querySelectorAll('[data-lang]').forEach((btn) => {
      btn.addEventListener('click', () => setLang(btn.dataset.lang));
    });
  }

  window.I18n = {
    t,
    apply,
    init,
    setLang,
    get lang() { return current; },
    get locale() { return LOCALES[current].replace('_', '-'); }
  };
})();
