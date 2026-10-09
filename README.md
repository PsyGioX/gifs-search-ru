<!--
  GIFS Поисковик — README.md
  Copyright (c) 2025–2026 PsyGioX <https://psygiox-dev.vercel.app/> — MIT License
-->
![GIFS Поисковик](https://i.postimg.cc/FzWVShS0/GIFS.png)

# GIFS Поисковик

Поиск гифок, мемов и стикеров с превью и скачиванием. Интерфейс на **русском, английском и польском** (разговорный стиль).

[Демо](https://gifs-search-ru.netlify.app/) · [Автор — PsyGioX](https://psygiox-dev.vercel.app/) · [GitHub](https://github.com/PsyGioX/gifs-search-ru)

## Возможности

- Поиск и трендовая лента GIPHY, подгрузка по кнопке «Показать ещё»
- Просмотр в диалоге, скачивание, копирование ссылки, «Поделиться»
- Тёмная и светлая темы (по умолчанию как в системе)
- RU / EN / PL: автоопределение языка, переключатель, параметр `?lang=pl`
- История запросов, категории, скелетоны загрузки, PWA с офлайн-оболочкой
- Иконки Bootstrap Icons вместо эмодзи
- Ключ GIPHY спрятан за serverless-прокси (`api/giphy.js`)

## Запуск

```bash
npm run icons                 # скачать Bootstrap Icons в vendor/
cp .env.example .env.local    # вписать GIPHY_API_KEY
npx vercel dev                # http://localhost:3000
```

### Деплой на Vercel

1. Импортируй репозиторий в Vercel.
2. Project → Settings → Environment Variables → добавь `GIPHY_API_KEY`.
3. Redeploy.

> Старый ключ был в открытом виде в истории Git — перевыпусти его в [GIPHY Developers](https://developers.giphy.com/dashboard/).

## Структура

```
index.html            разметка
css/styles.css        стили и темы
js/config.js          настройки
js/i18n.js            переводы и движок i18n
js/app.js             логика приложения
api/giphy.js          прокси к GIPHY (ключ из env)
sw.js                 service worker
scripts/fetch-icons.mjs   загрузка Bootstrap Icons
vendor/bootstrap-icons/   локальная копия иконок
```

## Как добавить язык

1. В `js/i18n.js` скопируй блок `ru` в `DICT` и переведи значения.
2. Добавь код в `LOCALES` (например `de: 'de_DE'`) и в `supportedLangs` (`js/config.js`) и `LANGS` (`api/giphy.js`).
3. Добавь кнопку `<button data-lang="de">DE</button>` в `index.html`.

Для склонений используй объект `{ one, few, many, other }`, подстановки — `{n}`, `{q}`.

## Лицензия

[MIT](LICENSE) © 2025–2026 PsyGioX. Bootstrap Icons — MIT, © The Bootstrap Authors. Гифки предоставлены GIPHY.
