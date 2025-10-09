const apiKey = 'nKgfbOgAYgouYwdAy51hqzbrbbgYIfVF';

// DOM Elements with null checks
const elements = {
    form: document.getElementById('search-form'),
    input: document.getElementById('search-input'),
    gifContainer: document.getElementById('gif-container'),
    modal: document.getElementById('modal'),
    modalGif: document.getElementById('modal-gif'),
    downloadLink: document.getElementById('download-link'),
    closeButton: document.querySelector('.close-button'),
    loader: document.getElementById('loader'),
    sectionTitle: document.getElementById('section-title'),
    loadMoreBtn: document.getElementById('load-more'),
    trendingBtn: document.getElementById('trending-btn'),
    randomBtn: document.getElementById('random-btn'),
    searchHistory: document.getElementById('search-history'),
    themeToggle: document.getElementById('theme-toggle'),
    errorMessage: document.getElementById('error-message'),
    copyLink: document.getElementById('copy-link'),
    shareBtn: document.getElementById('share-btn'),
    modalTitle: document.getElementById('modal-title'),
    modalRating: document.getElementById('modal-rating'),
    modalSize: document.getElementById('modal-size'),
    prevPage: document.getElementById('prev-page'),
    nextPage: document.getElementById('next-page'),
    currentPage: document.getElementById('current-page'),
    totalPages: document.getElementById('total-pages'),
    resultsInfo: document.getElementById('results-info'),
    resultsCount: document.getElementById('results-count')
};

// Конфигурация с оптимизацией
const CONFIG = {
    gifsPerPage: 24,
    maxSearchHistory: 8,
    apiBaseURL: 'https://api.giphy.com/v1/gifs',
    cacheTTL: 10 * 60 * 1000, // 10 минут
    maxCacheSize: 100,
    preloadThreshold: 0.8, // Предзагрузка когда осталось 80% контента
    debounceDelay: 300,
    maxRetries: 2,
    retryDelay: 1000
};

// Состояние приложения с оптимизацией
const state = {
    currentQuery: '',
    currentOffset: 0,
    totalCount: 0,
    isLoading: false,
    currentGIFs: [],
    searchHistory: JSON.parse(localStorage.getItem('gifSearchHistory')) || [],
    isDarkTheme: localStorage.getItem('gifDarkTheme') === 'true',
    currentPage: 1,
    cache: new Map(),
    lastSearchType: 'trending',
    abortController: null,
    retryCount: 0,
    imageObserver: null
};

// Улучшенное кэширование с LRU стратегией
const cacheManager = {
    get(key) {
        const cached = state.cache.get(key);
        if (cached && Date.now() - cached.timestamp < CONFIG.cacheTTL) {
            // Перемещаем в конец (самый новый)
            state.cache.delete(key);
            state.cache.set(key, cached);
            return cached.data;
        }
        state.cache.delete(key);
        return null;
    },
    
    set(key, data) {
        if (state.cache.size >= CONFIG.maxCacheSize) {
            // Удаляем самый старый элемент (первый в Map)
            const firstKey = state.cache.keys().next().value;
            state.cache.delete(firstKey);
        }
        state.cache.set(key, {
            data,
            timestamp: Date.now(),
            size: this.calculateSize(data)
        });
    },
    
    calculateSize(data) {
        try {
            return new Blob([JSON.stringify(data)]).size;
        } catch {
            return 0;
        }
    },
    
    clear() {
        state.cache.clear();
    },
    
    getStats() {
        return {
            size: state.cache.size,
            totalSize: Array.from(state.cache.values()).reduce((sum, item) => sum + item.size, 0)
        };
    }
};

// Оптимизированная инициализация приложения
function initApp() {
    if (!elements.gifContainer) {
        console.error('GIF container not found');
        return;
    }

    applyTheme();
    setupImageObserver();
    loadTrendingGIFs();
    renderSearchHistory();
    setupEventListeners();
    setupAccessibility();
    trackAnalytics('page_view', { page: 'home' });
    
    // Preload critical resources
    preloadCriticalResources();
}

// Предзагрузка критических ресурсов
function preloadCriticalResources() {
    const preloads = [
        { href: 'https://api.giphy.com/v1/gifs/trending', as: 'fetch' },
        { href: '/styles.css', as: 'style' }
    ];
    
    preloads.forEach(({ href, as }) => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.href = href;
        link.as = as;
        document.head.appendChild(link);
    });
}

// Настройка Intersection Observer для ленивой загрузки
function setupImageObserver() {
    state.imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                state.imageObserver.unobserve(img);
            }
        });
    }, {
        rootMargin: '50px 0px',
        threshold: 0.1
    });
}

// Оптимизированная настройка обработчиков событий
function setupEventListeners() {
    const eventHandlers = [
        { element: elements.form, event: 'submit', handler: handleSearch },
        { element: elements.loadMoreBtn, event: 'click', handler: loadMoreGIFs },
        { element: elements.trendingBtn, event: 'click', handler: loadTrendingGIFs },
        { element: elements.randomBtn, event: 'click', handler: loadRandomGIFs },
        { element: elements.closeButton, event: 'click', handler: closeModal },
        { element: elements.themeToggle, event: 'click', handler: toggleTheme },
        { element: elements.copyLink, event: 'click', handler: handleCopyLink },
        { element: elements.shareBtn, event: 'click', handler: handleShare },
        { element: elements.prevPage, event: 'click', handler: goToPreviousPage },
        { element: elements.nextPage, event: 'click', handler: goToNextPage }
    ];

    eventHandlers.forEach(({ element, event, handler }) => {
        element?.addEventListener(event, handler);
    });

    // Делегирование событий для динамических элементов
    elements.gifContainer?.addEventListener('click', (e) => {
        const card = e.target.closest('.gif-card');
        if (!card) return;

        const gifId = card.dataset.gifId;
        const gif = state.currentGIFs.find(g => g.id === gifId);
        if (!gif) return;

        const actionBtn = e.target.closest('.gif-action-btn');
        if (actionBtn) {
            handleGifAction(actionBtn, gif);
        } else {
            openModal(gif);
        }
    });

    elements.modal?.addEventListener('click', (e) => {
        if (e.target === elements.modal || e.target.classList.contains('modal-backdrop')) {
            closeModal();
        }
    });

    // Быстрые категории
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const category = e.target.dataset.category;
            searchByCategory(category);
        });
    });

    // Поиск из истории
    elements.searchHistory?.addEventListener('click', (e) => {
        if (e.target.classList.contains('history-item')) {
            elements.input.value = e.target.textContent;
            handleSearch(new Event('submit'));
        }
    });

    // Закрытие по ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.modal?.style.display === 'flex') {
            closeModal();
        }
    });

    // Оптимизированный автопоиск с debounce
    let searchTimeout;
    elements.input?.addEventListener('input', debounce((e) => {
        const query = e.target.value.trim();
        if (query.length > 2) {
            performSearch(query, true);
        } else if (query.length === 0 && state.lastSearchType !== 'trending') {
            loadTrendingGIFs();
        }
    }, CONFIG.debounceDelay));
}

// Функция для кнопки "Случайные"
async function loadRandomGIFs() {
    if (state.isLoading) return;
    
    try {
        showLoader();
        hideError();
        
        // Отменяем предыдущие запросы
        if (state.abortController) {
            state.abortController.abort();
        }
        
        state.currentQuery = '';
        state.currentOffset = 0;
        state.currentPage = 1;
        
        // Сбрасываем контейнер
        elements.gifContainer.innerHTML = '';
        state.currentGIFs = [];
        
        // Загружаем случайные GIF
        const randomGIFs = await fetchRandomGIFs();
        
        if (randomGIFs.length === 0) {
            showError('Не удалось загрузить случайные GIF. Попробуйте еще раз.');
            return;
        }
        
        // Отображаем GIF
        displayGIFs(randomGIFs);
        state.currentGIFs = randomGIFs;
        state.totalCount = randomGIFs.length;
        
        // Обновляем UI
        elements.sectionTitle.textContent = '🎲 Случайные GIF';
        updateActiveButton('random');
        updatePagination();
        updateLoadMoreButton();
        updateResultsInfo(randomGIFs.length);
        
        // Скрываем пагинацию для случайных GIF
        const pagination = document.querySelector('.pagination');
        if (pagination) {
            pagination.style.display = 'none';
        }
        
        state.lastSearchType = 'random';
        trackAnalytics('view_random');
        
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Error loading random GIFs:', error);
            showError('Ошибка загрузки случайных GIF. Проверьте подключение к интернету.');
            trackAnalytics('error', { type: 'random_load_error', message: error.message });
        }
    } finally {
        hideLoader();
    }
}

// Оптимизированная загрузка случайных GIF
async function fetchRandomGIFs(count = CONFIG.gifsPerPage) {
    const cacheKey = `random_${count}_${Date.now()}`; // Добавляем timestamp для уникальности
    
    try {
        // Используем более эффективный подход с search API вместо множественных random запросов
        const tags = ['funny', 'cat', 'dog', 'meme', 'reaction', 'animal', 'cute', 'happy'];
        const randomTag = tags[Math.floor(Math.random() * tags.length)];
        
        const response = await fetch(
            `${CONFIG.apiBaseURL}/search?api_key=${apiKey}&q=${randomTag}&limit=${count}&rating=g&lang=ru`
        );
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const gifs = data.data;
        
        // Перемешиваем результаты для большей случайности
        const shuffledGIFs = gifs.sort(() => Math.random() - 0.5);
        
        cacheManager.set(cacheKey, shuffledGIFs);
        return shuffledGIFs;
        
    } catch (error) {
        console.error('Error in fetchRandomGIFs:', error);
        
        // Fallback: загружаем трендовые если случайные не работают
        console.log('Fallback to trending GIFs');
        return fetchGIFs('trending', '', 0, count);
    }
}

// Функция для обновления активной кнопки
function updateActiveButton(activeType) {
    const buttons = {
        trending: elements.trendingBtn,
        random: elements.randomBtn
    };
    
    // Сбрасываем все кнопки
    Object.values(buttons).forEach(btn => {
        if (btn) {
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
        }
    });
    
    // Активируем нужную кнопку
    const activeButton = buttons[activeType];
    if (activeButton) {
        activeButton.classList.add('active');
        activeButton.setAttribute('aria-pressed', 'true');
    }
}

// Оптимизированная загрузка и отображение GIF
async function fetchAndDisplayGIFs(type, query = '') {
    if (state.isLoading) return;
    
    try {
        showLoader();
        hideError();
        
        // Отменяем предыдущие запросы
        if (state.abortController) {
            state.abortController.abort();
        }
        state.abortController = new AbortController();
        
        const gifs = await fetchGIFs(type, query, state.currentOffset, state.abortController.signal);
        
        if (state.currentOffset === 0) {
            elements.gifContainer.innerHTML = '';
            state.currentGIFs = [];
        }
        
        if (gifs.length === 0 && state.currentOffset === 0) {
            showError('Ничего не найдено. Попробуйте другой запрос.');
            updateResultsInfo(0);
            return;
        }
        
        displayGIFs(gifs);
        state.currentGIFs = [...state.currentGIFs, ...gifs];
        state.currentOffset += gifs.length;
        
        updatePagination();
        updateLoadMoreButton();
        updateResultsInfo(gifs.length);
        
        // Предзагрузка следующей страницы при достижении порога
        if (shouldPreloadNextPage()) {
            preloadNextPage(type, query);
        }
        
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Error fetching GIFs:', error);
            handleFetchError(error, type, query);
        }
    } finally {
        hideLoader();
    }
}

// Оптимизированная загрузка GIF с API
async function fetchGIFs(type, query, offset = 0, signal = null, retryCount = 0) {
    const cacheKey = `${type}_${query}_${offset}`;
    const cached = cacheManager.get(cacheKey);
    
    if (cached) {
        console.log('Using cached data for:', cacheKey);
        return cached;
    }

    try {
        const params = new URLSearchParams({
            api_key: apiKey,
            limit: CONFIG.gifsPerPage,
            offset: offset,
            rating: 'g',
            lang: 'ru',
            bundle: 'messaging_non_clips'
        });

        let url = '';
        if (type === 'trending') {
            url = `${CONFIG.apiBaseURL}/trending?${params}`;
        } else if (type === 'random') {
            return await fetchRandomGIFs(CONFIG.gifsPerPage);
        } else {
            params.set('q', query);
            url = `${CONFIG.apiBaseURL}/search?${params}`;
        }

        const options = signal ? { signal } : {};
        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        state.totalCount = data.pagination.total_count;
        
        cacheManager.set(cacheKey, data.data);
        state.retryCount = 0; // Сбрасываем счетчик повторов при успехе
        
        return data.data;
        
    } catch (error) {
        // Повторная попытка при временных ошибках
        if (retryCount < CONFIG.maxRetries && shouldRetry(error)) {
            console.log(`Retrying request (${retryCount + 1}/${CONFIG.maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay * (retryCount + 1)));
            return fetchGIFs(type, query, offset, signal, retryCount + 1);
        }
        throw error;
    }
}

// Оптимизированное отображение GIF
function displayGIFs(gifs) {
    const fragment = document.createDocumentFragment();
    
    gifs.forEach((gif, index) => {
        const gifCard = createGIFCard(gif, index);
        fragment.appendChild(gifCard);
    });
    
    elements.gifContainer.appendChild(fragment);
}

// Оптимизированное создание карточки GIF
function createGIFCard(gif, index) {
    const card = document.createElement('div');
    card.className = 'gif-card';
    card.dataset.gifId = gif.id;
    
    const img = document.createElement('img');
    // Используем data-src для ленивой загрузки
    img.dataset.src = gif.images.fixed_height_small.url;
    img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgdmlld0JveD0iMCAwIDE2MCAxNjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjE2MCIgaGVpZ2h0PSIxNjAiIGZpbGw9IiNGMEYwRjAiLz48L3N2Zz4='; // Плейсхолдер
    img.alt = gif.title || 'Анимированное изображение GIF';
    img.loading = 'lazy';
    img.className = 'gif lazy';
    img.width = 160;
    img.height = 160;
    
    // Добавляем в observer для ленивой загрузки
    if (state.imageObserver) {
        state.imageObserver.observe(img);
    }
    
    const overlay = document.createElement('div');
    overlay.className = 'gif-overlay';
    overlay.innerHTML = `
        <button class="gif-action-btn view-btn" aria-label="Посмотреть GIF в полном размере">
            👁️
        </button>
        <button class="gif-action-btn download-btn" aria-label="Скачать GIF">
            ⬇️
        </button>
        <button class="gif-action-btn copy-btn" aria-label="Копировать ссылку на GIF">
            📋
        </button>
    `;
    
    card.appendChild(img);
    card.appendChild(overlay);
    
    return card;
}

// Оптимизированная обработка ошибок
function handleFetchError(error, type, query) {
    const errorMessage = getErrorMessage(error);
    showError(errorMessage);
    
    trackAnalytics('error', { 
        type: 'api_error', 
        message: error.message,
        searchType: type,
        query: query
    });
    
    // Автоматическое восстановление для некоторых ошибок
    if (error.message.includes('Failed to fetch')) {
        setTimeout(() => {
            if (type === 'trending') {
                loadTrendingGIFs();
            } else {
                performSearch(query);
            }
        }, 3000);
    }
}

function getErrorMessage(error) {
    if (error.message.includes('Failed to fetch')) {
        return 'Проблемы с подключением к интернету. Проверьте соединение.';
    } else if (error.message.includes('404')) {
        return 'Сервис временно недоступен. Попробуйте позже.';
    } else if (error.message.includes('429')) {
        return 'Слишком много запросов. Подождите немного.';
    } else {
        return 'Ошибка загрузки. Попробуйте еще раз.';
    }
}

// Оптимизированная логика предзагрузки
function shouldPreloadNextPage() {
    if (state.currentGIFs.length >= state.totalCount) return false;
    
    const scrollPosition = elements.gifContainer.scrollTop;
    const scrollHeight = elements.gifContainer.scrollHeight;
    const clientHeight = elements.gifContainer.clientHeight;
    
    return (scrollPosition + clientHeight) / scrollHeight > CONFIG.preloadThreshold;
}

function shouldRetry(error) {
    return error.message.includes('Failed to fetch') || 
           error.message.includes('Network') ||
           error.message.includes('5');
}

// Оптимизированные утилиты
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Оптимизированное управление памятью
function cleanup() {
    // Очистка observers
    if (state.imageObserver) {
        state.imageObserver.disconnect();
    }
    
    // Очистка таймеров
    const highestId = window.setTimeout(() => {}, 0);
    for (let i = 0; i < highestId; i++) {
        window.clearTimeout(i);
    }
    
    // Очистка кэша при низкой памяти
    if (performance.memory && performance.memory.usedJSHeapSize > 500000000) { // 500MB
        cacheManager.clear();
    }
}

// Обработка событий памяти
if ('memory' in performance) {
    setInterval(() => {
        if (performance.memory.usedJSHeapSize > 800000000) { // 800MB
            cacheManager.clear();
            console.log('Cache cleared due to memory pressure');
        }
    }, 30000);
}

// Обработка видимости страницы
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Приостанавливаем не критичные операции
        if (state.abortController && !state.isLoading) {
            state.abortController.abort();
        }
    }
});

// Инициализация при загрузке с обработкой ошибок
window.addEventListener('DOMContentLoaded', () => {
    try {
        initApp();
    } catch (error) {
        console.error('Failed to initialize app:', error);
        showError('Не удалось загрузить приложение. Пожалуйста, обновите страницу.');
    }
});

// Очистка при выгрузке страницы
window.addEventListener('beforeunload', cleanup);

// Export для отладки
if (process.env.NODE_ENV === 'development') {
    window.gifApp = {
        state,
        cacheManager,
        elements,
        CONFIG
    };
}