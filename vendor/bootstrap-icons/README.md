<!--
  GIFS Поисковик — vendor/bootstrap-icons/README.md
  Copyright (c) 2025–2026 PsyGioX <https://psygiox-dev.vercel.app/> (MIT License)
-->
# Bootstrap Icons (локальная копия)

Иконочный шрифт проекта. Версия **1.11.3**, лицензия **MIT**,
© The Bootstrap Authors — https://github.com/twbs/icons

Файлы шрифта в репозиторий не вшиты, их скачивает одна команда:

```bash
npm run icons        # или: node scripts/fetch-icons.mjs
```

После неё здесь появятся `font/bootstrap-icons.min.css`, `font/fonts/*.woff2|woff`
и оригинальный `LICENSE` Bootstrap Icons. Закоммить их вместе с проектом.

Пока файлов нет, `index.html` автоматически подгружает ту же версию с jsDelivr.
