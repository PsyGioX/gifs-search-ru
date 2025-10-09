const apiKey = 'nKgfbOgAYgouYwdAy51hqzbrbbgYIfVF';

// DOM Elements
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

// Конфигурация
const CONFIG = {
    gifsPerPage: 24,
    maxSearchHistory: 8,
    apiBaseURL: 'https://api.giphy.com/v1/gifs',
    cacheTTL: 5 * 60 * 1000, // 5 минут
    maxCacheSize: 50
};

// Состояние приложения
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
    lastSearchType: 'trending'
};

// Кэширование запросов
const cacheManager = {
    get(key) {
        const cached = state.cache.get(key);
        if (cached && Date.now() - cached.timestamp < CONFIG.cacheTTL) {
            return cached.data;
        }
        state.cache.delete(key);
        return null;
    },
    
    set(key, data) {
        if (state.cache.size >= CONFIG.maxCacheSize) {
            const firstKey = state.cache.keys().next().value;
            state.cache.delete(firstKey);
        }
        state.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    },
    
    clear() {
        state.cache.clear();
    }
};

// Инициализация приложения
function initApp() {
    applyTheme();
    loadTrendingGIFs();
    renderSearchHistory();
    setupEventListeners();
    setupAccessibility();
    trackAnalytics('page_view', { page: 'home' });
}

// Настройка обработчиков событий
function setupEventListeners() {
    elements.form.addEventListener('submit', handleSearch);
    elements.loadMoreBtn.addEventListener('click', loadMoreGIFs);
    elements.trendingBtn.addEventListener('click', loadTrendingGIFs);
    elements.closeButton.addEventListener('click', closeModal);
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.copyLink.addEventListener('click', handleCopyLink);
    elements.shareBtn.addEventListener('click', handleShare);
    elements.prevPage.addEventListener('click', goToPreviousPage);
    elements.nextPage.addEventListener('click', goToNextPage);

    // Делегирование событий для динамических элементов
    elements.gifContainer.addEventListener('click', (e) => {
        const card = e.target.closest('.gif-card');
        if (card) {
            const gifId = card.dataset.gifId;
            const gif = state.currentGIFs.find(g => g.id === gifId);
            if (gif) openModal(gif);
        }
        
        const actionBtn = e.target.closest('.gif-action-btn');
        if (actionBtn && card) {
            const gifId = card.dataset.gifId;
            const gif = state.currentGIFs.find(g => g.id === gifId);
            if (gif) handleGifAction(actionBtn, gif);
        }
    });

    elements.modal.addEventListener('click', (e) => {
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
    elements.searchHistory.addEventListener('click', (e) => {
        if (e.target.classList.contains('history-item')) {
            elements.input.value = e.target.textContent;
            handleSearch(new Event('submit'));
        }
    });

    // Закрытие по ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.modal.style.display === 'flex') {
            closeModal();
        }
    });

    // Автопоиск при вводе
    let searchTimeout;
    elements.input.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        if (query.length > 2) {
            searchTimeout = setTimeout(() => {
                performSearch(query, true);
            }, 500);
        }
    });
}

// Настройка доступности
function setupAccessibility() {
    // Добавляем семантические атрибуты
    elements.modal.setAttribute('aria-hidden', 'true');
    elements.loader.setAttribute('aria-live', 'polite');
    
    // Обработка фокуса в модальном окне
    elements.modal.addEventListener('keydown', (e) => {
        if (e.key === 'Tab' && elements.modal.style.display === 'flex') {
            const focusableElements = elements.modal.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            
            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    });
}

// Поиск по категории
function searchByCategory(category) {
    const categories = {
        cats: 'милые котики',
        memes: 'смешные мемы',
        reactions: 'реакции эмоции',
        animals: 'животные'
    };
    
    elements.input.value = categories[category] || category;
    handleSearch(new Event('submit'));
    trackAnalytics('category_search', { category });
}

// Обработка поиска
async function handleSearch(e) {
    e.preventDefault();
    const query = elements.input.value.trim();
    if (!query) return;

    performSearch(query);
    trackAnalytics('search', { query, type: 'manual' });
}

// Выполнение поиска
async function performSearch(query, isAutoSearch = false) {
    state.currentQuery = query;
    state.currentOffset = 0;
    state.currentPage = 1;
    
    if (!isAutoSearch) {
        addToSearchHistory(query);
    }
    
    await fetchAndDisplayGIFs('search', query);
    elements.trendingBtn.classList.remove('active');
    state.lastSearchType = 'search';
}

// Загрузка популярных GIF
async function loadTrendingGIFs() {
    state.currentQuery = '';
    state.currentOffset = 0;
    state.currentPage = 1;
    elements.sectionTitle.textContent = '🔥 Популярные GIF';
    await fetchAndDisplayGIFs('trending');
    elements.trendingBtn.classList.add('active');
    state.lastSearchType = 'trending';
    trackAnalytics('view_trending');
}

// Загрузка и отображение GIF
async function fetchAndDisplayGIFs(type, query = '') {
    if (state.isLoading) return;
    
    try {
        showLoader();
        hideError();
        
        const gifs = await fetchGIFs(type, query, state.currentOffset);
        
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
        
        // Preload next page
        if (state.currentGIFs.length < state.totalCount) {
            preloadNextPage(type, query);
        }
        
    } catch (error) {
        console.error('Error fetching GIFs:', error);
        showError('Ошибка загрузки. Проверьте подключение к интернету.');
        trackAnalytics('error', { type: 'api_error', message: error.message });
    } finally {
        hideLoader();
    }
}

// Загрузка GIF с API
async function fetchGIFs(type, query, offset = 0) {
    const cacheKey = `${type}_${query}_${offset}`;
    const cached = cacheManager.get(cacheKey);
    
    if (cached) {
        console.log('Using cached data for:', cacheKey);
        return cached;
    }

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
    } else {
        params.set('q', query);
        url = `${CONFIG.apiBaseURL}/search?${params}`;
    }

    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    state.totalCount = data.pagination.total_count;
    
    cacheManager.set(cacheKey, data.data);
    return data.data;
}

// Предзагрузка следующей страницы
async function preloadNextPage(type, query) {
    const nextOffset = state.currentOffset + CONFIG.gifsPerPage;
    const cacheKey = `${type}_${query}_${nextOffset}`;
    
    if (!cacheManager.get(cacheKey)) {
        setTimeout(async () => {
            try {
                const gifs = await fetchGIFs(type, query, nextOffset);
                cacheManager.set(cacheKey, gifs);
            } catch (error) {
                console.log('Preload failed:', error);
            }
        }, 1000);
    }
}

// Отображение GIF
function displayGIFs(gifs) {
    const fragment = document.createDocumentFragment();
    
    gifs.forEach((gif) => {
        const gifCard = createGIFCard(gif);
        fragment.appendChild(gifCard);
    });
    
    elements.gifContainer.appendChild(fragment);
}

// Создание карточки GIF
function createGIFCard(gif) {
    const card = document.createElement('div');
    card.className = 'gif-card';
    card.dataset.gifId = gif.id;
    
    const img = document.createElement('img');
    img.src = gif.images.fixed_height_small.url;
    img.alt = gif.title || 'Анимированное изображение GIF';
    img.loading = 'lazy';
    img.className = 'gif';
    img.width = gif.images.fixed_height_small.width;
    img.height = gif.images.fixed_height_small.height;
    
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

// Обработка действий с GIF
function handleGifAction(button, gif) {
    const action = button.classList[1]; // view-btn, download-btn, copy-btn
    
    switch (action) {
        case 'view-btn':
            openModal(gif);
            trackAnalytics('gif_view', { gifId: gif.id, source: 'overlay' });
            break;
        case 'download-btn':
            downloadGIF(gif);
            trackAnalytics('gif_download', { gifId: gif.id });
            break;
        case 'copy-btn':
            copyGIFLink(gif);
            trackAnalytics('gif_copy', { gifId: gif.id });
            break;
    }
}

// Открытие модального окна
function openModal(gif) {
    elements.modal.style.display = 'flex';
    elements.modal.setAttribute('aria-hidden', 'false');
    elements.modalGif.src = gif.images.original.url;
    elements.modalGif.alt = gif.title || 'Анимированное изображение GIF';
    
    updateModalInfo(gif);
    
    // Сохраняем текущий GIF для действий
    elements.modal.currentGif = gif;
    
    // Фокус на кнопке закрытия для доступности
    elements.closeButton.focus();
    
    trackAnalytics('modal_open', { gifId: gif.id });
}

// Обновление информации в модальном окне
function updateModalInfo(gif) {
    elements.modalTitle.textContent = gif.title || 'Без названия';
    elements.modalRating.innerHTML = `<strong>Рейтинг:</strong> <span>${gif.rating?.toUpperCase() || 'N/A'}</span>`;
    elements.modalSize.innerHTML = `<strong>Размер:</strong> <span>${Math.round(gif.images.original.size / 1024)} KB</span>`;
}

// Обработка копирования ссылки
function handleCopyLink() {
    if (elements.modal.currentGif) {
        copyGIFLink(elements.modal.currentGif);
    }
}

// Обработка поделиться
function handleShare() {
    if (elements.modal.currentGif) {
        shareGIF(elements.modal.currentGif);
    }
}

// Скачивание GIF
async function downloadGIF(gif) {
    try {
        showLoader();
        const response = await fetch(gif.images.original.url);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        const filename = `giphy-${gif.id}.gif`;
        const tempLink = document.createElement('a');
        tempLink.href = url;
        tempLink.download = filename;
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);
        URL.revokeObjectURL(url);
        
        showNotification('GIF успешно скачан!');
    } catch (error) {
        console.error('Download error:', error);
        showError('Ошибка при скачивании');
        trackAnalytics('error', { type: 'download_error', message: error.message });
    } finally {
        hideLoader();
    }
}

// Копирование ссылки
async function copyGIFLink(gif) {
    try {
        await navigator.clipboard.writeText(gif.images.original.url);
        showNotification('Ссылка скопирована в буфер обмена!');
    } catch (error) {
        console.error('Copy error:', error);
        // Fallback для старых браузеров
        const textArea = document.createElement('textarea');
        textArea.value = gif.images.original.url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Ссылка скопирована!');
    }
}

// Поделиться GIF
async function shareGIF(gif) {
    if (navigator.share) {
        try {
            await navigator.share({
                title: gif.title || 'GIF из GIFS Поисковика',
                text: 'Посмотри этот крутой GIF!',
                url: gif.images.original.url
            });
            trackAnalytics('share_success', { gifId: gif.id });
        } catch (error) {
            if (error.name !== 'AbortError') {
                copyGIFLink(gif);
            }
        }
    } else {
        copyGIFLink(gif);
    }
}

// Пагинация
function goToPreviousPage() {
    if (state.currentPage > 1) {
        state.currentPage--;
        state.currentOffset = (state.currentPage - 1) * CONFIG.gifsPerPage;
        loadCurrentPage();
    }
}

function goToNextPage() {
    const totalPages = Math.ceil(state.totalCount / CONFIG.gifsPerPage);
    if (state.currentPage < totalPages) {
        state.currentPage++;
        state.currentOffset = (state.currentPage - 1) * CONFIG.gifsPerPage;
        loadCurrentPage();
    }
}

function updatePagination() {
    const totalPages = Math.ceil(state.totalCount / CONFIG.gifsPerPage);
    
    elements.currentPage.textContent = state.currentPage;
    elements.totalPages.textContent = totalPages;
    
    elements.prevPage.disabled = state.currentPage <= 1;
    elements.nextPage.disabled = state.currentPage >= totalPages;
    
    // Показываем/скрываем пагинацию
    const pagination = document.querySelector('.pagination');
    if (pagination) {
        pagination.style.display = totalPages > 1 ? 'flex' : 'none';
    }
}

async function loadCurrentPage() {
    if (state.lastSearchType === 'trending') {
        await fetchAndDisplayGIFs('trending');
    } else {
        await fetchAndDisplayGIFs('search', state.currentQuery);
    }
}

// Загрузка дополнительных GIF
function loadMoreGIFs() {
    if (state.isLoading) return;
    
    if (state.currentQuery) {
        fetchAndDisplayGIFs('search', state.currentQuery);
    } else {
        fetchAndDisplayGIFs('trending');
    }
    
    trackAnalytics('load_more', { 
        type: state.lastSearchType, 
        currentCount: state.currentGIFs.length 
    });
}

// Обновление кнопки "Загрузить еще"
function updateLoadMoreButton() {
    const hasMoreGIFs = state.currentGIFs.length < state.totalCount;
    elements.loadMoreBtn.style.display = hasMoreGIFs ? 'block' : 'none';
    
    if (hasMoreGIFs) {
        const remaining = state.totalCount - state.currentGIFs.length;
        elements.loadMoreBtn.innerHTML = `
            <span class="load-more-icon">⬇️</span>
            Загрузить еще (${remaining})
        `;
    }
}

// Обновление информации о результатах
function updateResultsInfo(newGifsCount) {
    if (state.currentOffset === 0) {
        elements.resultsCount.textContent = `Найдено: ${state.totalCount} GIF`;
    } else {
        elements.resultsCount.textContent = `Показано: ${state.currentGIFs.length} из ${state.totalCount}`;
    }
}

// История поиска
function addToSearchHistory(query) {
    state.searchHistory = state.searchHistory.filter(item => 
        item.toLowerCase() !== query.toLowerCase()
    );
    state.searchHistory.unshift(query);
    state.searchHistory = state.searchHistory.slice(0, CONFIG.maxSearchHistory);
    
    localStorage.setItem('gifSearchHistory', JSON.stringify(state.searchHistory));
    renderSearchHistory();
}

function renderSearchHistory() {
    if (state.searchHistory.length === 0) {
        elements.searchHistory.innerHTML = '<p class="no-history">История поиска пуста</p>';
        return;
    }
    
    elements.searchHistory.innerHTML = state.searchHistory
        .map(query => `
            <button class="history-item" aria-label="Искать ${query}">
                ${query}
            </button>
        `).join('');
}

// Тема
function toggleTheme() {
    state.isDarkTheme = !state.isDarkTheme;
    localStorage.setItem('gifDarkTheme', state.isDarkTheme);
    applyTheme();
    trackAnalytics('theme_toggle', { theme: state.isDarkTheme ? 'dark' : 'light' });
}

function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.isDarkTheme ? 'dark' : 'light');
    elements.themeToggle.innerHTML = state.isDarkTheme ? 
        '<span class="theme-icon">☀️</span>' : 
        '<span class="theme-icon">🌙</span>';
    elements.themeToggle.setAttribute('aria-label', 
        state.isDarkTheme ? 'Включить светлую тему' : 'Включить темную тему'
    );
}

// Утилиты
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.style.display = 'block';
}

function hideError() {
    elements.errorMessage.style.display = 'none';
}

function showLoader() {
    elements.loader.style.display = 'flex';
    state.isLoading = true;
}

function hideLoader() {
    elements.loader.style.display = 'none';
    state.isLoading = false;
}

function closeModal() {
    elements.modal.style.display = 'none';
    elements.modal.setAttribute('aria-hidden', 'true');
    elements.modalGif.src = '';
    delete elements.modal.currentGif;
}

// Аналитика
function trackAnalytics(event, data = {}) {
    // Yandex Metrika
    if (window.ym) {
        ym(99425095, 'reachGoal', event, data);
    }
    
    // Google Analytics
    if (window.gtag) {
        gtag('event', event, data);
    }
    
    console.log(`Analytics: ${event}`, data);
}

// Обработка ошибок
window.addEventListener('error', (e) => {
    trackAnalytics('javascript_error', {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno
    });
});

// Инициализация при загрузке
window.addEventListener('DOMContentLoaded', initApp);

// Service Worker для оффлайн работы (опционально)
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(registration => console.log('SW registered'))
        .catch(error => console.log('SW registration failed'));
}