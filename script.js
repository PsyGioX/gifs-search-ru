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
    cacheTTL: 10 * 60 * 1000,
    maxCacheSize: 100,
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
    imageObserver: null,
    currentModalGif: null
};

// Кэширование
const cacheManager = {
    get(key) {
        const cached = state.cache.get(key);
        if (cached && Date.now() - cached.timestamp < CONFIG.cacheTTL) {
            state.cache.delete(key);
            state.cache.set(key, cached);
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
}

// Сброс состояния
function resetState() {
    state.currentQuery = '';
    state.currentOffset = 0;
    state.currentPage = 1;
    state.currentGIFs = [];
    state.totalCount = 0;
}

// Настройка Intersection Observer
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

// Настройка обработчиков событий
function setupEventListeners() {
    const eventHandlers = [
        { element: elements.form, event: 'submit', handler: handleSearch },
        { element: elements.loadMoreBtn, event: 'click', handler: loadMoreGIFs },
        { element: elements.trendingBtn, event: 'click', handler: loadTrendingGIFs },
        { element: elements.closeButton, event: 'click', handler: closeModal },
        { element: elements.themeToggle, event: 'click', handler: toggleTheme },
        { element: elements.copyLink, event: 'click', handler: handleCopyLink },
        { element: elements.shareBtn, event: 'click', handler: handleShare },
        { element: elements.prevPage, event: 'click', handler: goToPreviousPage },
        { element: elements.nextPage, event: 'click', handler: goToNextPage }
    ];

    eventHandlers.forEach(({ element, event, handler }) => {
        if (element) {
            element.addEventListener(event, handler);
        }
    });

    // Делегирование событий
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

    // Автопоиск
    elements.input?.addEventListener('input', debounce((e) => {
        const query = e.target.value.trim();
        if (query.length > 2) {
            performSearch(query, true);
        } else if (query.length === 0) {
            loadTrendingGIFs();
        }
    }, CONFIG.debounceDelay));
}

// Настройка доступности
function setupAccessibility() {
    elements.modal?.setAttribute('aria-hidden', 'true');
    elements.loader?.setAttribute('aria-live', 'polite');
}

// Загрузка популярных GIF
async function loadTrendingGIFs() {
    if (state.isLoading) return;
    
    try {
        showLoader();
        hideError();
        
        if (state.abortController) {
            state.abortController.abort();
        }
        
        resetState();
        state.lastSearchType = 'trending';
        
        if (elements.gifContainer) {
            elements.gifContainer.innerHTML = '';
        }
        
        if (elements.sectionTitle) {
            elements.sectionTitle.textContent = '🔥 Популярные GIF';
        }
        
        updateActiveButton('trending');
        
        await fetchAndDisplayGIFs('trending');
        
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Error loading trending GIFs:', error);
            showError('Ошибка загрузки популярных GIF. Проверьте подключение к интернету.');
        }
    } finally {
        hideLoader();
    }
}

// Обновление активной кнопки
function updateActiveButton(activeType) {
    if (elements.trendingBtn) {
        if (activeType === 'trending') {
            elements.trendingBtn.classList.add('active');
            elements.trendingBtn.setAttribute('aria-pressed', 'true');
        } else {
            elements.trendingBtn.classList.remove('active');
            elements.trendingBtn.setAttribute('aria-pressed', 'false');
        }
    }
}

// Поиск по категории
function searchByCategory(category) {
    const categories = {
        cats: 'котики',
        memes: 'мемы',
        reactions: 'реакции',
        animals: 'животные'
    };
    
    if (elements.input) {
        elements.input.value = categories[category] || category;
    }
    handleSearch(new Event('submit'));
}

// Обработка поиска
async function handleSearch(e) {
    e.preventDefault();
    const query = elements.input ? elements.input.value.trim() : '';
    if (!query) return;

    performSearch(query);
}

// Выполнение поиска
async function performSearch(query, isAutoSearch = false) {
    state.currentQuery = query;
    state.currentOffset = 0;
    state.currentPage = 1;
    state.currentGIFs = [];
    state.totalCount = 0;
    
    if (!isAutoSearch) {
        addToSearchHistory(query);
    }
    
    await fetchAndDisplayGIFs('search', query);
    updateActiveButton('search');
    state.lastSearchType = 'search';
}

// Загрузка и отображение GIF
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
            updateResultsInfo(0);
            return;
        }
        
        displayGIFs(gifs);
        state.currentGIFs = [...state.currentGIFs, ...gifs];
        state.currentOffset += gifs.length;
        
        updatePagination();
        updateLoadMoreButton();
        updateResultsInfo(gifs.length);
        
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Error fetching GIFs:', error);
            handleFetchError(error, type, query);
        }
    } finally {
        hideLoader();
    }
}

// Загрузка GIF с API
async function fetchGIFs(type, query, offset = 0, signal = null, retryCount = 0) {
    const cacheKey = `${type}_${query}_${offset}`;
    const cached = cacheManager.get(cacheKey);
    
    if (cached) {
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
        
        if (type === 'trending') {
            state.totalCount = data.pagination?.total_count || 5000;
        } else {
            state.totalCount = data.pagination?.total_count || 0;
        }
        
        cacheManager.set(cacheKey, data.data);
        
        return data.data;
        
    } catch (error) {
        if (retryCount < CONFIG.maxRetries) {
            await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay * (retryCount + 1)));
            return fetchGIFs(type, query, offset, signal, retryCount + 1);
        }
        throw error;
    }
}

// Отображение GIF
function displayGIFs(gifs) {
    if (!elements.gifContainer) return;
    
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
    img.dataset.src = gif.images.fixed_height_small.url;
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
    
    const viewBtn = document.createElement('button');
    viewBtn.className = 'gif-action-btn view-btn';
    viewBtn.setAttribute('aria-label', 'Посмотреть GIF в полном размере');
    viewBtn.textContent = '👁️';
    
    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'gif-action-btn download-btn';
    downloadBtn.setAttribute('aria-label', 'Скачать GIF');
    downloadBtn.textContent = '⬇️';
    
    const copyBtn = document.createElement('button');
    copyBtn.className = 'gif-action-btn copy-btn';
    copyBtn.setAttribute('aria-label', 'Копировать ссылку на GIF');
    copyBtn.textContent = '📋';
    
    overlay.appendChild(viewBtn);
    overlay.appendChild(downloadBtn);
    overlay.appendChild(copyBtn);
    
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

// Открытие модального окна
function openModal(gif) {
    if (!elements.modal) return;
    
    elements.modal.style.display = 'flex';
    elements.modal.setAttribute('aria-hidden', 'false');
    elements.modalGif.src = gif.images.original.url;
    elements.modalGif.alt = gif.title || 'Анимированное изображение GIF';
    
    updateModalInfo(gif);
    state.currentModalGif = gif;
    updateDownloadLink(gif);
    
    if (elements.closeButton) {
        elements.closeButton.focus();
    }
}

// Обновление информации в модальном окне
function updateModalInfo(gif) {
    if (!elements.modalTitle || !elements.modalRating || !elements.modalSize) return;
    
    elements.modalTitle.textContent = gif.title || 'Без названия';
    
    elements.modalRating.innerHTML = `<strong>Рейтинг:</strong> ${(gif.rating || 'N/A').toUpperCase()}`;
    elements.modalSize.innerHTML = `<strong>Размер:</strong> ${Math.round(gif.images.original.size / 1024)} KB`;
}

// Обновление ссылки скачивания в модальном окне
function updateDownloadLink(gif) {
    if (!elements.downloadLink) return;
    
    elements.downloadLink.href = gif.images.original.url;
    elements.downloadLink.download = `giphy-${gif.id}.gif`;
    elements.downloadLink.setAttribute('aria-label', `Скачать GIF ${gif.title || ''}`);
}

// Обработка копирования ссылки из модального окна
function handleCopyLink() {
    if (state.currentModalGif) {
        copyGIFLink(state.currentModalGif);
    }
}

// Обработка поделиться из модального окна
function handleShare() {
    if (state.currentModalGif) {
        shareGIF(state.currentModalGif);
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

// Обновление кнопки "Загрузить еще"
function updateLoadMoreButton() {
    if (!elements.loadMoreBtn) return;
    
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
    if (!elements.resultsCount) return;
    
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
    if (!elements.searchHistory) return;
    
    if (state.searchHistory.length === 0) {
        elements.searchHistory.innerHTML = '<p class="no-history">История поиска пуста</p>';
        return;
    }
    
    elements.searchHistory.innerHTML = '';
    
    state.searchHistory.forEach(query => {
        const button = document.createElement('button');
        button.className = 'history-item';
        button.setAttribute('aria-label', `Искать ${query}`);
        button.textContent = query;
        elements.searchHistory.appendChild(button);
    });
}

// Тема
function toggleTheme() {
    state.isDarkTheme = !state.isDarkTheme;
    localStorage.setItem('gifDarkTheme', state.isDarkTheme);
    applyTheme();
}

function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.isDarkTheme ? 'dark' : 'light');
    if (elements.themeToggle) {
        elements.themeToggle.innerHTML = state.isDarkTheme ? 
            '<span class="theme-icon">☀️</span>' : 
            '<span class="theme-icon">🌙</span>';
        elements.themeToggle.setAttribute('aria-label', 
            state.isDarkTheme ? 'Включить светлую тему' : 'Включить темную тему'
        );
    }
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

function showNotification(message) {
    const notification = document.getElementById('notification');
    if (!notification) return;
    
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

// Обработка ошибок
function handleFetchError(error, type, query) {
    let errorMessage = 'Ошибка загрузки. Попробуйте еще раз.';
    
    if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Проблемы с подключением к интернету. Проверьте соединение.';
    } else if (error.message.includes('404')) {
        errorMessage = 'Сервис временно недоступен. Попробуйте позже.';
    } else if (error.message.includes('429')) {
        errorMessage = 'Слишком много запросов. Подождите немного.';
    }
    
    showError(errorMessage);
    hideLoader();
}

// Инициализация при загрузке
window.addEventListener('DOMContentLoaded', () => {
    try {
        initApp();
    } catch (error) {
        console.error('Failed to initialize app:', error);
        showError('Не удалось загрузить приложение. Пожалуйста, обновите страницу.');
    }
});

// Очистка
window.addEventListener('beforeunload', () => {
    if (state.imageObserver) {
        state.imageObserver.disconnect();
    }
    
    if (state.abortController) {
        state.abortController.abort();
    }
});