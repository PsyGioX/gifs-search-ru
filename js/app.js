/*!
 * GIFS Поисковик — js/app.js
 * Copyright (c) 2025–2026 PsyGioX <https://psygiox-dev.vercel.app/>
 * Licensed under the MIT License (see LICENSE)
 * https://github.com/PsyGioX/gifs-search-ru
 */

(function () {
  'use strict';

  const CFG = window.GIFS_CONFIG;
  const { t } = window.I18n;
  const $ = (id) => document.getElementById(id);

  /* ───────────── DOM ───────────── */
  const el = {
    form: $('search-form'),
    input: $('search-input'),
    clearBtn: $('clear-btn'),
    grid: $('gif-container'),
    title: $('section-title'),
    count: $('results-count'),
    trendingBtn: $('trending-btn'),
    loadMore: $('load-more'),
    loadMoreLabel: $('load-more-label'),
    error: $('error-message'),
    errorText: $('error-text'),
    history: $('search-history'),
    clearHistory: $('clear-history'),
    themeToggle: $('theme-toggle'),
    toast: $('toast'),
    toastText: $('toast-text'),
    modal: $('modal'),
    modalClose: $('modal-close'),
    modalGif: $('modal-gif'),
    modalTitle: $('modal-title'),
    modalRating: $('modal-rating'),
    modalSize: $('modal-size'),
    modalUploaded: $('modal-uploaded'),
    modalDownload: $('modal-download'),
    copyLink: $('copy-link'),
    shareBtn: $('share-btn')
  };

  /* ───────────── Состояние ───────────── */
  const state = {
    mode: 'trending',        // 'trending' | 'search'
    query: '',
    offset: 0,
    total: 0,
    gifs: [],
    loading: false,
    requestId: 0,
    controller: null,
    modalGif: null,
    history: readJSON('gifSearchHistory', []),
    cache: new Map()
  };

  /* ───────────── Утилиты ───────────── */
  function readJSON(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return Array.isArray(fallback) && !Array.isArray(value) ? fallback : (value ?? fallback);
    } catch (_) { return fallback; }
  }
  function writeStore(key, value) {
    try { localStorage.setItem(key, value); } catch (_) { /* приватный режим */ }
  }

  const fmtNumber = (n) => new Intl.NumberFormat(window.I18n.locale).format(n);

  /* ───────────── Кэш ───────────── */
  const cache = {
    get(key) {
      const hit = state.cache.get(key);
      if (hit && Date.now() - hit.time < CFG.cacheTTL) return hit.value;
      state.cache.delete(key);
      return null;
    },
    set(key, value) {
      if (state.cache.size >= CFG.cacheMax) {
        state.cache.delete(state.cache.keys().next().value);
      }
      state.cache.set(key, { value, time: Date.now() });
    }
  };

  /* ───────────── API ───────────── */
  async function fetchGifs(mode, query, offset, signal) {
    const lang = window.I18n.lang;
    const key = `${mode}|${lang}|${query}|${offset}`;
    const cached = cache.get(key);
    if (cached) return cached;

    const params = new URLSearchParams({
      endpoint: mode === 'search' ? 'search' : 'trending',
      limit: String(CFG.perPage),
      offset: String(offset),
      lang
    });
    if (mode === 'search') params.set('q', query);

    const response = await fetch(`${CFG.apiEndpoint}?${params}`, { signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const json = await response.json();
    const result = {
      items: Array.isArray(json.data) ? json.data : [],
      total: json.pagination?.total_count ?? 0
    };
    cache.set(key, result);
    return result;
  }

  /* ───────────── Загрузка и отрисовка ───────────── */
  async function load({ reset }) {
    if (state.loading && !reset) return;

    if (state.controller) state.controller.abort();
    state.controller = new AbortController();
    const requestId = ++state.requestId;

    if (reset) {
      state.offset = 0;
      state.total = 0;
      state.gifs = [];
      el.grid.replaceChildren();
      renderSkeletons(CFG.perPage / 2);
      el.count.textContent = t('results.loading');
      el.loadMore.hidden = true;
    }

    state.loading = true;
    el.grid.setAttribute('aria-busy', 'true');
    el.loadMore.disabled = true;
    hideError();

    try {
      const { items, total } = await fetchGifs(state.mode, state.query, state.offset, state.controller.signal);
      if (requestId !== state.requestId) return; // устаревший ответ

      if (reset) el.grid.replaceChildren();

      if (items.length === 0 && state.offset === 0) {
        state.total = 0;
        renderMeta();
        showError(t('error.empty'));
        return;
      }

      state.total = total;
      state.gifs.push(...items);
      state.offset += items.length;
      appendCards(items);
      renderMeta();
    } catch (err) {
      if (err.name === 'AbortError') return;
      if (requestId !== state.requestId) return;
      if (reset) el.grid.replaceChildren();
      el.count.textContent = '';
      showError(t('error.load'));
    } finally {
      if (requestId === state.requestId) {
        state.loading = false;
        el.grid.setAttribute('aria-busy', 'false');
        el.loadMore.disabled = false;
        updateLoadMore();
      }
    }
  }

  function renderSkeletons(n) {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < n; i++) {
      const s = document.createElement('div');
      s.className = 'gif-card skeleton';
      s.setAttribute('aria-hidden', 'true');
      frag.appendChild(s);
    }
    el.grid.appendChild(frag);
  }

  function iconButton(action, icon, labelKey) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'gif-action';
    b.dataset.action = action;
    b.dataset.i18nAttr = `aria-label:${labelKey};title:${labelKey}`;
    b.setAttribute('aria-label', t(labelKey));
    b.title = t(labelKey);
    const i = document.createElement('i');
    i.className = `bi ${icon}`;
    i.setAttribute('aria-hidden', 'true');
    b.appendChild(i);
    return b;
  }

  function gifTitle(gif) {
    return (gif.title || '').trim() || t('gif.untitled');
  }

  function createCard(gif) {
    const preview = gif.images.fixed_width || gif.images.fixed_height_small || gif.images.original;

    const card = document.createElement('article');
    card.className = 'gif-card';
    card.setAttribute('role', 'listitem');
    card.dataset.gifId = gif.id;

    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'gif-open';
    open.dataset.action = 'view';
    open.setAttribute('aria-label', `${t('gif.view')}: ${gifTitle(gif)}`);

    const img = document.createElement('img');
    img.src = preview.url;
    img.alt = gifTitle(gif);
    img.loading = 'lazy';
    img.decoding = 'async';
    if (preview.width && preview.height) {
      img.width = Number(preview.width);
      img.height = Number(preview.height);
    }
    open.appendChild(img);

    const actions = document.createElement('div');
    actions.className = 'gif-actions';
    actions.append(
      iconButton('download', 'bi-download', 'gif.download'),
      iconButton('copy', 'bi-link-45deg', 'gif.copy')
    );

    card.append(open, actions);
    return card;
  }

  function appendCards(items) {
    const frag = document.createDocumentFragment();
    items.forEach((g) => frag.appendChild(createCard(g)));
    el.grid.appendChild(frag);
  }

  function reachableTotal() {
    return Math.min(state.total, CFG.maxOffset + 1);
  }

  function updateLoadMore() {
    const hasMore = state.gifs.length > 0 && state.offset < reachableTotal();
    el.loadMore.hidden = !hasMore;
  }

  /** Заголовок секции и счётчик — перерисовываются при смене языка. */
  function renderMeta() {
    el.title.textContent = state.mode === 'search'
      ? t('section.search', { q: state.query })
      : t('section.trending');

    if (state.gifs.length === 0) { el.count.textContent = ''; return; }

    el.count.textContent = state.gifs.length < state.total && state.offset > CFG.perPage
      ? t('results.shown', { shown: fmtNumber(state.gifs.length), total: fmtNumber(state.total) })
      : t('results.count', { n: state.total });

    el.trendingBtn.classList.toggle('is-active', state.mode === 'trending');
    el.trendingBtn.setAttribute('aria-pressed', String(state.mode === 'trending'));
  }

  function showError(message) {
    el.errorText.textContent = message;
    el.error.hidden = false;
  }
  function hideError() { el.error.hidden = true; }

  let toastTimer;
  function showToast(message) {
    el.toastText.textContent = message;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove('show'), 2800);
  }

  /* ───────────── Поиск ───────────── */
  function runSearch(query, { remember = true } = {}) {
    const q = query.trim();
    if (!q) return;
    state.mode = 'search';
    state.query = q;
    el.input.value = q;
    syncClearBtn();
    if (remember) addToHistory(q);
    el.trendingBtn.classList.remove('is-active');
    el.trendingBtn.setAttribute('aria-pressed', 'false');
    load({ reset: true });
  }

  function runTrending() {
    state.mode = 'trending';
    state.query = '';
    el.input.value = '';
    syncClearBtn();
    load({ reset: true });
  }

  function syncClearBtn() {
    el.clearBtn.hidden = el.input.value.length === 0;
  }

  /* ───────────── История ───────────── */
  function addToHistory(query) {
    state.history = [query, ...state.history.filter((x) => x.toLowerCase() !== query.toLowerCase())]
      .slice(0, CFG.historyMax);
    writeStore('gifSearchHistory', JSON.stringify(state.history));
    renderHistory();
  }

  function renderHistory() {
    el.history.replaceChildren();
    el.clearHistory.hidden = state.history.length === 0;

    if (state.history.length === 0) {
      const p = document.createElement('p');
      p.className = 'no-history';
      p.textContent = t('history.empty');
      el.history.appendChild(p);
      return;
    }

    state.history.forEach((query) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'history-item';
      b.dataset.query = query;
      b.textContent = query;                       // textContent — без XSS
      b.setAttribute('aria-label', t('history.search', { q: query }));
      el.history.appendChild(b);
    });
  }

  /* ───────────── Тема ───────────── */
  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function renderTheme() {
    const dark = currentTheme() === 'dark';
    el.themeToggle.firstElementChild.className = `bi ${dark ? 'bi-sun-fill' : 'bi-moon-stars-fill'}`;
    const label = t(dark ? 'theme.toLight' : 'theme.toDark');
    el.themeToggle.setAttribute('aria-label', label);
    el.themeToggle.title = label;
  }

  function toggleTheme() {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    writeStore('gifTheme', next);
    renderTheme();
  }

  /* ───────────── Действия с гифкой ───────────── */
  const findGif = (id) => state.gifs.find((g) => g.id === id);
  const originalUrl = (gif) => gif.images.original.url;

  async function copyLink(gif) {
    const url = originalUrl(gif);
    try {
      await navigator.clipboard.writeText(url);
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    showToast(t('toast.copied'));
  }

  async function downloadGif(gif) {
    try {
      const response = await fetch(originalUrl(gif));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `giphy-${gif.id}.gif`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 1000);
      showToast(t('toast.downloaded'));
    } catch (err) {
      // CORS или сеть: открываем гифку в новой вкладке
      const win = window.open(originalUrl(gif), '_blank', 'noopener');
      if (win) showToast(t('toast.downloadFallback'));
      else showError(t('error.download'));
    }
  }

  async function shareGif(gif) {
    if (!navigator.share) return copyLink(gif);
    try {
      await navigator.share({ title: t('share.title'), text: t('share.text'), url: originalUrl(gif) });
    } catch (err) {
      if (err.name !== 'AbortError') copyLink(gif);
    }
  }

  /* ───────────── Модальное окно ───────────── */
  function formatSize(bytes) {
    const n = Number(bytes);
    if (!n) return '—';
    return n >= 1024 * 1024
      ? `${(n / 1024 / 1024).toFixed(1)} ${t('units.mb')}`
      : `${Math.round(n / 1024)} ${t('units.kb')}`;
  }

  function formatDate(value) {
    if (!value || value.startsWith('0000')) return '—';
    const d = new Date(value.replace(' ', 'T') + 'Z');
    return Number.isNaN(d.getTime())
      ? '—'
      : new Intl.DateTimeFormat(window.I18n.locale, { dateStyle: 'medium' }).format(d);
  }

  function fillModal(gif) {
    el.modalTitle.textContent = gifTitle(gif);
    el.modalGif.alt = gifTitle(gif);
    el.modalRating.textContent = (gif.rating || '—').toUpperCase();
    el.modalSize.textContent = formatSize(gif.images.original.size);
    el.modalUploaded.textContent = formatDate(gif.import_datetime || gif.create_datetime);
  }

  function openModal(gif) {
    state.modalGif = gif;
    el.modalGif.src = originalUrl(gif);
    fillModal(gif);
    if (!el.modal.open) el.modal.showModal();
  }

  function closeModal() {
    if (el.modal.open) el.modal.close();
  }

  /* ───────────── Обработчики ───────────── */
  function bindEvents() {
    el.form.addEventListener('submit', (e) => {
      e.preventDefault();
      runSearch(el.input.value);
    });

    el.clearBtn.addEventListener('click', () => {
      el.input.value = '';
      syncClearBtn();
      el.input.focus();
    });

    let debounce;
    el.input.addEventListener('input', () => {
      syncClearBtn();
      clearTimeout(debounce);
      const q = el.input.value.trim();
      if (q.length >= CFG.minAutoSearchLength) {
        debounce = setTimeout(() => runSearch(q, { remember: false }), CFG.searchDebounce);
      }
    });

    el.trendingBtn.addEventListener('click', runTrending);
    el.loadMore.addEventListener('click', () => {
      load({ reset: false });
    });

    document.querySelectorAll('[data-category]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const category = btn.dataset.category;
        runSearch(t(`q.${category}`));
      });
    });

    el.history.addEventListener('click', (e) => {
      const item = e.target.closest('.history-item');
      if (item) runSearch(item.dataset.query);
    });

    el.clearHistory.addEventListener('click', () => {
      state.history = [];
      writeStore('gifSearchHistory', '[]');
      renderHistory();
    });

    el.grid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      const card = e.target.closest('.gif-card');
      if (!btn || !card) return;
      const gif = findGif(card.dataset.gifId);
      if (!gif) return;

      if (btn.dataset.action === 'view') openModal(gif);
      else if (btn.dataset.action === 'download') downloadGif(gif);
      else if (btn.dataset.action === 'copy') copyLink(gif);
    });

    el.themeToggle.addEventListener('click', toggleTheme);

    el.modalClose.addEventListener('click', closeModal);
    el.modal.addEventListener('click', (e) => { if (e.target === el.modal) closeModal(); });
    el.modal.addEventListener('close', () => {
      el.modalGif.removeAttribute('src');
      state.modalGif = null;
    });
    el.modalDownload.addEventListener('click', () => state.modalGif && downloadGif(state.modalGif));
    el.copyLink.addEventListener('click', () => state.modalGif && copyLink(state.modalGif));
    el.shareBtn.addEventListener('click', () => state.modalGif && shareGif(state.modalGif));

    // Смена языка: обновляем всё динамическое
    document.addEventListener('langchange', () => {
      renderTheme();
      renderHistory();
      renderMeta();
      if (!el.error.hidden && state.gifs.length === 0 && !state.loading) hideError();
      el.grid.querySelectorAll('.gif-card[data-gif-id]').forEach((card) => {
        const gif = findGif(card.dataset.gifId);
        if (!gif) return;
        card.querySelector('.gif-open').setAttribute('aria-label', `${t('gif.view')}: ${gifTitle(gif)}`);
        window.I18n.apply(card.querySelector('.gif-actions'));
      });
      if (state.modalGif) fillModal(state.modalGif);
      // Трендовая выдача зависит от языка — подгружаем заново
      if (state.mode === 'trending' && state.gifs.length) load({ reset: true });
    });

  }

  /* ───────────── Service Worker ───────────── */
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    const secure = location.protocol === 'https:' || location.hostname === 'localhost';
    if (!secure) return;
    navigator.serviceWorker.register('/sw.js').catch(() => { /* не критично */ });
  }

  /* ───────────── Старт ───────────── */
  function init() {
    window.I18n.init();

    const year = $('year');
    if (year) year.textContent = new Date().getFullYear();

    renderTheme();
    renderHistory();
    bindEvents();
    registerServiceWorker();

    renderMeta();
    const urlQuery = new URLSearchParams(location.search).get('q');
    if (urlQuery) runSearch(urlQuery, { remember: false });
    else load({ reset: true });

  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
