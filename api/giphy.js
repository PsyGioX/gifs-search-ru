/*!
 * GIFS Поисковик — api/giphy.js (Vercel Serverless Function)
 * Прокси к GIPHY API: ключ берётся из переменной окружения GIPHY_API_KEY
 * и никогда не попадает в браузер.
 * Copyright (c) 2025–2026 PsyGioX <https://psygiox-dev.vercel.app/>
 * Licensed under the MIT License (see LICENSE)
 * https://github.com/PsyGioX/gifs-search-ru
 */

const GIPHY_BASE = 'https://api.giphy.com/v1/gifs';
const ENDPOINTS = new Set(['trending', 'search']);
const LANGS = new Set(['ru', 'en', 'pl']);

const clampInt = (value, min, max, fallback) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
};

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GIPHY_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GIPHY_API_KEY is not configured' });
  }

  const { endpoint = 'trending', q = '', limit, offset, lang } = req.query;

  if (!ENDPOINTS.has(endpoint)) {
    return res.status(400).json({ error: 'Unknown endpoint' });
  }
  if (endpoint === 'search' && !String(q).trim()) {
    return res.status(400).json({ error: 'Query is required' });
  }

  const params = new URLSearchParams({
    api_key: apiKey,
    limit: String(clampInt(limit, 1, 50, 24)),
    offset: String(clampInt(offset, 0, 4999, 0)),
    rating: 'g',
    lang: LANGS.has(lang) ? lang : 'en',
    bundle: 'messaging_non_clips'
  });
  if (endpoint === 'search') params.set('q', String(q).trim().slice(0, 100));

  try {
    const upstream = await fetch(`${GIPHY_BASE}/${endpoint}?${params}`);
    if (!upstream.ok) {
      return res.status(upstream.status === 429 ? 429 : 502).json({ error: 'Upstream error' });
    }
    const data = await upstream.json();

    // Кэш на CDN Vercel: 5 минут, ещё 10 — отдаём устаревшее пока обновляем
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ data: data.data, pagination: data.pagination });
  } catch (err) {
    return res.status(502).json({ error: 'Upstream unavailable' });
  }
};
