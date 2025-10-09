const apiKey = 'nKgfbOgAYgouYwdAy51hqzbrbbgYIfVF';

// DOM Elements - оптимизированная инициализация
const elements = {};
const elementIds = [
    'search-form', 'search-input', 'gif-container', 'modal', 'modal-gif',
    'download-link', 'close-button', 'loader', 'section-title', 'load-more',
    'trending-btn', 'random-btn', 'search-history', 'theme-toggle', 'error-message',
    'copy-link', 'share-btn', 'modal-title', 'modal-rating', 'modal-size',
    'prev-page', 'next-page', 'current-page', 'total-pages', 'results-info', 'results-count'
];

// Инициализация элементов DOM
elementIds.forEach(id => {
    const element = document.getElementById(id) || document.querySelector(`.${id}`);
    if (element) {
        const key = id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        elements[key] = element;
    }
});

// Конфигурация
const CONFIG = {
    gifsPerPage: 24,
    maxSearchHistory: 8,
    apiBaseURL: 'https://api.giphy.com/v1/gifs',
    cacheTTL: 10 * 60 * 1000,
    maxCacheSize: 100,
    preloadThreshold: 0.8,
    debounceDelay: 300,
    maxRetries: 2,
    retryDelay: 1000
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
    lastSearchType: 'trending',
    abortController: null,
    retryCount: 0,
    imageObserver: null,
    currentModalGif: null
};

// Кэширование с улучшенной логикой
const cacheManager = {
    get(key) {
        const cached = state.cache.get(key);
        if (cached && Date.now() - cached.timestamp < CONFIG.cacheTTL) {
            // Move to end (LRU)
            state.cache.delete(key);
            state.cache.set(key, cached);
            return cached.data;
        }
        if (cached) state.cache.delete(key);
        return null;
    },
    
    set(key, data) {
        if (state.cache.size >= CONFIG.maxCacheSize) {
            const firstKey = state.cache.keys().next().value;
            state.cache.delete(firstKey);
        }
        state.cache.set(key, {
            data,
            timestamp: Date.now(),
            size: new Blob([JSON.stringify(data)]).size || 0
        });
    },
    
    clear() {
        state.cache.clear();
    }
};

// Инициализация приложения
function initApp() {
    if (!elements.gifContainer) {
        console.error('GIF container not found');
        return;
    }

    applyTheme();
    setupImageObserver();
    setupEventListeners();
    setupAccessibility();
    loadTrendingGIFs();
    renderSearchHistory();
    
    // Предзагрузка популярных тегов для случайных GIF
    preloadRandomTags();
}

// Предзагрузка данных для случайных GIF
async function preloadRandomTags() {
    try {
        const response = await fetch(
            `${CONFIG.apiBaseURL}/trending?api_key=${apiKey}&limit=10`
        );
        if (response.ok) {
            await response.json();
        }
    } catch (error) {
        // Игнорируем ошибки предзагрузки
    }
}

// Сброс состояния
function resetState() {
    state.currentQuery = '';
    state.currentOffset = 0;
    state.currentPage = 1;
    state.currentGIFs = [];
    state.totalCount = 0;
    state.retryCount = 0;
}

// Управление пагинацией
function showPagination() {
    if (elements.loadMoreBtn) elements.loadMoreBtn.style.display = 'block';
    const pagination = document.querySelector('.pagination');
    if (pagination) pagination.style.display = 'flex';
}

function hidePagination() {
    if (elements.loadMoreBtn) elements.loadMoreBtn.style.display = 'none';
    const pagination = document.querySelector('.pagination');
    if (pagination) pagination.style.display = 'none';
}

// Настройка Intersection Observer с улучшенной производительностью
function setupImageObserver() {
    state.imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const src = img.dataset.src;
                if (src) {
                    img.src = src;
                    img.classList.remove('lazy');
                    img.removeAttribute('data-src');
                    state.imageObserver.unobserve(img);
                }
            }
        });
    }, {
        rootMargin: '100px 0px',
        threshold: 0.01
    });
}

// Оптимизированная настройка обработчиков событий
function setupEventListeners() {
    const eventHandlers = [
        { element: elements.form, event: 'submit', handler: handleSearch },
        { element: elements.loadMoreBtn, event: 'click', handler: loadMoreGIFs },
        { element: elements.trendingBtn, event: 'click', handler: () => loadTrendingGIFs() },
        { element: elements.randomBtn, event: 'click', handler: () => loadRandomGIFs() },
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

    // Делегирование событий с улучшенной производительностью
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

    // Закрытие модального окна
    elements.modal?.addEventListener('click', (e) => {
        if (e.target === elements.modal || e.target.classList.contains('modal-backdrop')) {
            closeModal();
        }
    });

    // Быстрые категории
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const category = e.target.dataset.category;
            if (category) searchByCategory(category);
        });
    });

    // Поиск из истории
    elements.searchHistory?.addEventListener('click', (e) => {
        if (e.target.classList.contains('history-item')) {
            elements.input.value = e.target.textContent;
            handleSearch(new Event('submit'));
        }
    });

    // Глобальные обработчики
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.modal?.style.display === 'flex') {
            closeModal();
        }
    });

    // Автопоиск с дебаунсом
    elements.input?.addEventListener('input', debounce((e) => {
        const query = e.target.value.trim();
        if (query.length > 2) {
            performSearch(query, true);
        } else if (!query && state.lastSearchType !== 'trending') {
            loadTrendingGIFs();
        }
    }, CONFIG.debounceDelay));
}

// Настройка доступности
function setupAccessibility() {
    if (elements.modal) {
        elements.modal.setAttribute('aria-hidden', 'true');
        elements.modal.setAttribute('role', 'dialog');
        elements.modal.setAttribute('aria-labelledby', 'modal-title');
    }
    
    if (elements.loader) {
        elements.loader.setAttribute('aria-live', 'polite');
        elements.loader.setAttribute('aria-atomic', 'true');
    }
}

// Основные функции загрузки GIF
async function loadTrendingGIFs() {
    if (state.isLoading) return;
    
    try {
        showLoader();
        hideError();
        
        // Отменяем предыдущие запросы
        if (state.abortController) {
            state.abortController.abort();
        }
        
        resetState();
        state.lastSearchType = 'trending';
        
        clearGifContainer();
        elements.sectionTitle.textContent = '🔥 Популярные GIF';
        updateActiveButton('trending');
        showPagination();
        
        await fetchAndDisplayGIFs('trending');
        
    } catch (error) {
        handleLoadError(error, 'trending');
    } finally {
        hideLoader();
    }
}

async function loadRandomGIFs() {
    if (state.isLoading) return;
    
    try {
        showLoader();
        hideError();
        
        if (state.abortController) {
            state.abortController.abort();
        }
        
        resetState();
        state.lastSearchType = 'random';
        
        clearGifContainer();
        elements.sectionTitle.textContent = '🎲 Случайные GIF';
        updateActiveButton('random');
        hidePagination();
        
        const randomGIFs = await fetchRandomGIFs();
        
        if (randomGIFs.length === 0) {
            showError('Не удалось загрузить случайные GIF. Попробуйте еще раз.');
            return;
        }
        
        displayGIFs(randomGIFs);
        state.currentGIFs = randomGIFs;
        state.totalCount = randomGIFs.length;
        updateResultsInfo();
        
    } catch (error) {
        handleLoadError(error, 'random');
    } finally {
        hideLoader();
    }
}

// Оптимизированная загрузка случайных GIF
async function fetchRandomGIFs(count = CONFIG.gifsPerPage) {
    const cacheKey = `random_${count}_${Math.floor(Date.now() / 60000)}`;
    const cached = cacheManager.get(cacheKey);
    if (cached) return cached;

    try {
        const popularTags = ['funny', 'cat', 'dog', 'meme', 'reaction', 'animal', 'cute', 'happy'];
        const randomTag = popularTags[Math.floor(Math.random() * popularTags.length)];
        
        const response = await fetch(
            `${CONFIG.apiBaseURL}/search?api_key=${apiKey}&q=${encodeURIComponent(randomTag)}&limit=${count * 2}&rating=g&lang=ru`
        );
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        const shuffledGIFs = data.data.sort(() => Math.random() - 0.5);
        const randomGIFs = shuffledGIFs.slice(0, count);
        
        cacheManager.set(cacheKey, randomGIFs);
        return randomGIFs;
        
    } catch (error) {
        console.error('Error fetching random GIFs:', error);
        // Fallback to trending GIFs
        return fetchGIFs('trending', '', 0);
    }
}

// Обновление активной кнопки
function updateActiveButton(activeType) {
    const buttons = {
        trending: elements.trendingBtn,
        random: elements.randomBtn
    };
    
    Object.values(buttons).forEach(btn => {
        if (btn) {
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
        }
    });
    
    const activeButton = buttons[activeType];
    if (activeButton) {
        activeButton.classList.add('active');
        activeButton.setAttribute('aria-pressed', 'true');
    }
}

// Поиск
async function handleSearch(e) {
    e.preventDefault();
    const query = elements.input.value.trim();
    if (!query) return;

    performSearch(query);
}

async function performSearch(query, isAutoSearch = false) {
    state.currentQuery = query;
    state.currentOffset = 0;
    state.currentPage = 1;
    state.currentGIFs = [];
    state.totalCount = 0;
    
    if (!isAutoSearch) {
        addToSearchHistory(query);
    }
    
    showPagination();
    
    try {
        await fetchAndDisplayGIFs('search', query);
        updateActiveButton('search');
        state.lastSearchType = 'search';
    } catch (error) {
        handleLoadError(error, 'search');
    }
}

// Основная функция загрузки и отображения GIF
async function fetchAndDisplayGIFs(type, query = '') {
    if (state.isLoading) return;
    
    try {
        showLoader();
        
        if (state.abortController) {
            state.abortController.abort();
        }
        state.abortController = new AbortController();
        
        const gifs = await fetchGIFs(type, query, state.currentOffset, state.abortController.signal);
        
        if (gifs.length === 0 && state.currentOffset === 0) {
            showError('Ничего не найдено. Попробуйте другой запрос.');
            updateResultsInfo();
            return;
        }
        
        displayGIFs(gifs);
        state.currentGIFs.push(...gifs);
        state.currentOffset += gifs.length;
        
        if (type !== 'random') {
            updatePagination();
            updateLoadMoreButton();
        }
        updateResultsInfo();
        
    } catch (error) {
        if (error.name !== 'AbortError') {
            handleFetchError(error, type, query);
        }
    } finally {
        hideLoader();
    }
}

// Оптимизированная загрузка GIF
async function fetchGIFs(type, query, offset = 0, signal = null, retryCount = 0) {
    const cacheKey = `${type}_${query}_${offset}`;
    const cached = cacheManager.get(cacheKey);
    if (cached) return cached;

    try {
        const params = new URLSearchParams({
            api_key: apiKey,
            limit: CONFIG.gifsPerPage,
            offset: offset,
            rating: 'g',
            lang: 'ru',
            bundle: 'messaging_non_clips'
        });

        let url;
        if (type === 'trending') {
            url = `${CONFIG.apiBaseURL}/trending?${params}`;
        } else if (type === 'random') {
            return await fetchRandomGIFs(CONFIG.gifsPerPage);
        } else {
            params.set('q', query);
            url = `${CONFIG.apiBaseURL}/search?${params}`;
        }

        const response = await fetch(url, { signal });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Устанавливаем общее количество
        if (type === 'trending') {
            state.totalCount = 500; // Приблизительное количество для trending
        } else {
            state.totalCount = data.pagination?.total_count || 0;
        }
        
        cacheManager.set(cacheKey, data.data);
        return data.data;
        
    } catch (error) {
        if (retryCount < CONFIG.maxRetries && shouldRetry(error)) {
            await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay * (retryCount + 1)));
            return fetchGIFs(type, query, offset, signal, retryCount + 1);
        }
        throw error;
    }
}

// Оптимизированное отображение GIF
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
    img.dataset.src = gif.images.fixed_height.webp || gif.images.fixed_height.url;
    img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgdmlld0JveD0iMCAwIDE2MCAxNjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjE2MCIgaGVpZ2h0PSIxNjAiIGZpbGw9IiNGMEYwRjAiLz48L3N2Zz4=';
    img.alt = gif.title || 'Анимированное изображение GIF';
    img.loading = 'lazy';
    img.className = 'gif lazy';
    img.width = 160;
    img.height = 160;
    
    if (state.imageObserver) {
        state.imageObserver.observe(img);
    }
    
    const overlay = document.createElement('div');
    overlay.className = 'gif-overlay';
    overlay.innerHTML = `
        <button class="gif-action-btn view-btn" aria-label="Посмотреть GIF в полном размере">👁️</button>
        <button class="gif-action-btn download-btn" aria-label="Скачать GIF">⬇️</button>
        <button class="gif-action-btn copy-btn" aria-label="Копировать ссылку на GIF">📋</button>
    `;
    
    card.appendChild(img);
    card.appendChild(overlay);
    
    return card;
}

// Обработка действий с GIF
function handleGifAction(button, gif) {
    const action = button.classList[1];
    
    switch (action) {
        case 'view-btn':
            openModal(gif);
            break;
        case 'download-btn':
            downloadGIF(gif);
            break;
        case 'copy-btn':
            copyGIFLink(gif);
            break;
    }
}

// Модальное окно
function openModal(gif) {
    if (!elements.modal) return;
    
    elements.modal.style.display = 'flex';
    elements.modal.setAttribute('aria-hidden', 'false');
    elements.modalGif.src = gif.images.original.url;
    elements.modalGif.alt = gif.title || 'Анимированное изображение GIF';
    
    updateModalInfo(gif);
    state.currentModalGif = gif;
    updateDownloadLink(gif);
    
    elements.closeButton.focus();
}

function updateModalInfo(gif) {
    if (elements.modalTitle) {
        elements.modalTitle.textContent = gif.title || 'Без названия';
    }
    
    if (elements.modalRating) {
        elements.modalRating.innerHTML = `<strong>Рейтинг:</strong> ${(gif.rating || 'N/A').toUpperCase()}`;
    }
    
    if (elements.modalSize) {
        const sizeKB = Math.round((gif.images.original.size || 0) / 1024);
        elements.modalSize.innerHTML = `<strong>Размер:</strong> ${sizeKB} KB`;
    }
}

function updateDownloadLink(gif) {
    if (!elements.downloadLink) return;
    
    elements.downloadLink.href = gif.images.original.url;
    elements.downloadLink.download = `giphy-${gif.id}.gif`;
    elements.downloadLink.setAttribute('aria-label', `Скачать GIF ${gif.title || ''}`);
}

// Действия с GIF
async function downloadGIF(gif) {
    try {
        showLoader();
        
        const response = await fetch(gif.images.original.url);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `giphy-${gif.id}.gif`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        showNotification('GIF успешно скачан!');
        
    } catch (error) {
        console.error('Download error:', error);
        showError('Ошибка при скачивании');
    } finally {
        hideLoader();
    }
}

async function copyGIFLink(gif) {
    try {
        await navigator.clipboard.writeText(gif.images.original.url);
        showNotification('Ссылка скопирована в буфер обмена!');
    } catch (error) {
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
    
    if (elements.currentPage) elements.currentPage.textContent = state.currentPage;
    if (elements.totalPages) elements.totalPages.textContent = totalPages;
    if (elements.prevPage) elements.prevPage.disabled = state.currentPage <= 1;
    if (elements.nextPage) elements.nextPage.disabled = state.currentPage >= totalPages;
    
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
}

function updateLoadMoreButton() {
    if (!elements.loadMoreBtn) return;
    
    const hasMoreGIFs = state.currentGIFs.length < state.totalCount;
    elements.loadMoreBtn.style.display = hasMoreGIFs ? 'block' : 'none';
    
    if (hasMoreGIFs) {
        const remaining = state.totalCount - state.currentGIFs.length;
        elements.loadMoreBtn.innerHTML = `
            <span class="load-more-icon">⬇️</span>
            Загрузить еще (${Math.min(remaining, CONFIG.gifsPerPage)})
        `;
    }
}

// Обновление информации о результатах
function updateResultsInfo() {
    if (!elements.resultsCount) return;
    
    if (state.lastSearchType === 'random') {
        elements.resultsCount.textContent = `Случайные GIF: ${state.currentGIFs.length}`;
    } else if (state.currentOffset === 0) {
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
    if (!elements.searchHistory) return;
    
    if (state.searchHistory.length === 0) {
        elements.searchHistory.innerHTML = '<p class="no-history">История поиска пуста</p>';
        return;
    }
    
    elements.searchHistory.innerHTML = state.searchHistory.map(query => 
        `<button class="history-item" aria-label="Искать ${escapeHtml(query)}">${escapeHtml(query)}</button>`
    ).join('');
}

// Тема
function toggleTheme() {
    state.isDarkTheme = !state.isDarkTheme;
    localStorage.setItem('gifDarkTheme', state.isDarkTheme);
    applyTheme();
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

function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    const div = document.createElement('div');
    div.textContent = unsafe;
    return div.innerHTML;
}

function showNotification(message) {
    // Создаем уведомление если его нет
    let notification = document.getElementById('notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; background: #4CAF50; 
            color: white; padding: 12px 20px; border-radius: 4px; 
            z-index: 10000; display: none;
        `;
        document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.style.display = 'block';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

function showError(message) {
    if (!elements.errorMessage) return;
    elements.errorMessage.textContent = message;
    elements.errorMessage.style.display = 'block';
}

function hideError() {
    if (!elements.errorMessage) return;
    elements.errorMessage.style.display = 'none';
}

function showLoader() {
    if (!elements.loader) return;
    elements.loader.style.display = 'flex';
    state.isLoading = true;
}

function hideLoader() {
    if (!elements.loader) return;
    elements.loader.style.display = 'none';
    state.isLoading = false;
}

function closeModal() {
    if (!elements.modal) return;
    elements.modal.style.display = 'none';
    elements.modal.setAttribute('aria-hidden', 'true');
    elements.modalGif.src = '';
    state.currentModalGif = null;
}

function clearGifContainer() {
    if (elements.gifContainer) {
        elements.gifContainer.innerHTML = '';
    }
}

// Обработка ошибок
function handleLoadError(error, type) {
    if (error.name !== 'AbortError') {
        console.error(`Error loading ${type} GIFs:`, error);
        showError(getErrorMessage(error));
    }
}

function handleFetchError(error, type, query) {
    showError(getErrorMessage(error));
    hideLoader();
}

function getErrorMessage(error) {
    if (error.message.includes('Failed to fetch')) {
        return 'Проблемы с подключением к интернету. Проверьте соединение.';
    } else if (error.message.includes('404')) {
        return 'Сервис временно недоступен. Попробуйте позже.';
    } else if (error.message.includes('429')) {
        return 'Слишком много запросов. Подождите немного.';
    } else if (error.message.includes('500')) {
        return 'Ошибка сервера. Попробуйте позже.';
    } else {
        return 'Ошибка загрузки. Попробуйте еще раз.';
    }
}

function shouldRetry(error) {
    return error.message.includes('Failed to fetch') || 
           error.message.includes('Network') ||
           error.message.includes('5');
}

// Вспомогательные функции
function searchByCategory(category) {
    const categories = {
        cats: 'котики',
        memes: 'мемы',
        reactions: 'реакции',
        animals: 'животные'
    };
    
    elements.input.value = categories[category] || category;
    handleSearch(new Event('submit'));
}

// Инициализация при загрузке
window.addEventListener('DOMContentLoaded', initApp);

// Очистка
window.addEventListener('beforeunload', () => {
    if (state.imageObserver) state.imageObserver.disconnect();
    if (state.abortController) state.abortController.abort();
});

// Export для отладки
if (process.env.NODE_ENV === 'development') {
    window.gifApp = { state, cacheManager, elements, CONFIG };
}