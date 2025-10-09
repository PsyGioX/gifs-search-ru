const apiKey = 'nKgfbOgAYgouYwdAy51hqzbrbbgYIfVF';
const form = document.getElementById('search-form');
const input = document.getElementById('search-input');
const gifContainer = document.getElementById('gif-container');
const modal = document.getElementById('modal');
const modalGif = document.getElementById('modal-gif');
const downloadLink = document.getElementById('download-link');
const closeButton = document.querySelector('.close-button');
const loader = document.getElementById('loader');
const sectionTitle = document.getElementById('section-title');
const loadMoreBtn = document.getElementById('load-more');
const trendingBtn = document.getElementById('trending-btn');
const searchHistory = document.getElementById('search-history');
const themeToggle = document.getElementById('theme-toggle');
const errorMessage = document.getElementById('error-message');

// Конфигурация
const CONFIG = {
  gifsPerPage: 25,
  maxSearchHistory: 10,
  apiBaseURL: 'https://api.giphy.com/v1/gifs'
};

// Состояние приложения
const state = {
  currentQuery: '',
  currentOffset: 0,
  totalCount: 0,
  isLoading: false,
  currentGIFs: [],
  searchHistory: JSON.parse(localStorage.getItem('searchHistory')) || [],
  isDarkTheme: localStorage.getItem('darkTheme') === 'true'
};

// Инициализация приложения
function initApp() {
  applyTheme();
  loadTrendingGIFs();
  renderSearchHistory();
  setupEventListeners();
}

// Настройка обработчиков событий
function setupEventListeners() {
  form.addEventListener('submit', handleSearch);
  loadMoreBtn.addEventListener('click', loadMoreGIFs);
  trendingBtn.addEventListener('click', loadTrendingGIFs);
  closeButton.addEventListener('click', closeModal);
  themeToggle.addEventListener('click', toggleTheme);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Бесконечная прокрутка
  window.addEventListener('scroll', throttle(handleInfiniteScroll, 300));
  
  // Закрытие по ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Поиск из истории
  searchHistory.addEventListener('click', (e) => {
    if (e.target.classList.contains('history-item')) {
      input.value = e.target.textContent;
      handleSearch(new Event('submit'));
    }
  });
}

// Загрузка популярных GIF
async function loadTrendingGIFs() {
  state.currentQuery = '';
  state.currentOffset = 0;
  sectionTitle.textContent = 'Популярные GIF';
  await fetchAndDisplayGIFs('trending');
  trendingBtn.classList.add('active');
}

// Обработка поиска
async function handleSearch(e) {
  e.preventDefault();
  const query = input.value.trim();
  if (!query) return;

  state.currentQuery = query;
  state.currentOffset = 0;
  
  addToSearchHistory(query);
  await fetchAndDisplayGIFs('search', query);
  trendingBtn.classList.remove('active');
}

// Добавление в историю поиска
function addToSearchHistory(query) {
  state.searchHistory = state.searchHistory.filter(item => item !== query);
  state.searchHistory.unshift(query);
  state.searchHistory = state.searchHistory.slice(0, CONFIG.maxSearchHistory);
  
  localStorage.setItem('searchHistory', JSON.stringify(state.searchHistory));
  renderSearchHistory();
}

// Отображение истории поиска
function renderSearchHistory() {
  searchHistory.innerHTML = state.searchHistory
    .map(query => `<button class="history-item">${query}</button>`)
    .join('');
}

// Загрузка и отображение GIF
async function fetchAndDisplayGIFs(type, query = '') {
  try {
    showLoader();
    hideError();
    
    const gifs = await fetchGIFs(type, query, state.currentOffset);
    
    if (state.currentOffset === 0) {
      gifContainer.innerHTML = '';
      state.currentGIFs = [];
    }
    
    if (gifs.length === 0 && state.currentOffset === 0) {
      showError('Ничего не найдено. Попробуйте другой запрос.');
      return;
    }
    
    displayGIFs(gifs);
    state.currentGIFs = [...state.currentGIFs, ...gifs];
    state.currentOffset += gifs.length;
    
    updateLoadMoreButton(gifs.length);
    
  } catch (error) {
    console.error('Error fetching GIFs:', error);
    showError('Ошибка загрузки. Проверьте подключение к интернету.');
  } finally {
    hideLoader();
  }
}

// Загрузка GIF с API
async function fetchGIFs(type, query, offset = 0) {
  const params = new URLSearchParams({
    api_key: apiKey,
    limit: CONFIG.gifsPerPage,
    offset: offset,
    rating: 'g', // Только контент для всех возрастов
    lang: 'ru'
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
  
  return data.data;
}

// Отображение GIF
function displayGIFs(gifs) {
  const fragment = document.createDocumentFragment();
  
  gifs.forEach((gif) => {
    const gifCard = createGIFCard(gif);
    fragment.appendChild(gifCard);
  });
  
  gifContainer.appendChild(fragment);
}

// Создание карточки GIF
function createGIFCard(gif) {
  const card = document.createElement('div');
  card.className = 'gif-card';
  
  const img = document.createElement('img');
  img.src = gif.images.fixed_height_small.url;
  img.alt = gif.title || 'GIF';
  img.loading = 'lazy';
  img.className = 'gif';
  
  // Оптимизация: предзагрузка оригинального размера
  const preloadLink = document.createElement('link');
  preloadLink.rel = 'preload';
  preloadLink.as = 'image';
  preloadLink.href = gif.images.original.url;
  document.head.appendChild(preloadLink);
  
  const overlay = document.createElement('div');
  overlay.className = 'gif-overlay';
  overlay.innerHTML = `
    <button class="gif-action-btn view-btn" title="Посмотреть">
      👁️
    </button>
    <button class="gif-action-btn download-btn" title="Скачать">
      ⬇️
    </button>
    <button class="gif-action-btn copy-btn" title="Копировать ссылку">
      📋
    </button>
  `;
  
  // Обработчики действий
  img.addEventListener('click', () => openModal(gif));
  overlay.querySelector('.view-btn').addEventListener('click', () => openModal(gif));
  overlay.querySelector('.download-btn').addEventListener('click', () => downloadGIF(gif));
  overlay.querySelector('.copy-btn').addEventListener('click', () => copyGIFLink(gif));
  
  card.appendChild(img);
  card.appendChild(overlay);
  
  return card;
}

// Открытие модального окна
function openModal(gif) {
  modal.style.display = 'flex';
  modalGif.src = gif.images.original.url;
  modalGif.alt = gif.title || 'GIF';
  
  // Обновление ссылки скачивания
  downloadLink.onclick = (e) => {
    e.preventDefault();
    downloadGIF(gif);
  };
  
  // Добавление информации о GIF
  updateModalInfo(gif);
}

// Обновление информации в модальном окне
function updateModalInfo(gif) {
  let infoDiv = modal.querySelector('.gif-info');
  if (!infoDiv) {
    infoDiv = document.createElement('div');
    infoDiv.className = 'gif-info';
    modal.querySelector('.modal-content').appendChild(infoDiv);
  }
  
  infoDiv.innerHTML = `
    <h3>${gif.title || 'Без названия'}</h3>
    <p>Рейтинг: ${gif.rating || 'N/A'}</p>
    <p>Размер: ${Math.round(gif.images.original.size / 1024)} KB</p>
    <div class="modal-actions">
      <button class="btn secondary" onclick="copyGIFLink(${JSON.stringify(gif).replace(/"/g, '&quot;')})">
        📋 Копировать ссылку
      </button>
      <button class="btn primary" onclick="shareGIF(${JSON.stringify(gif).replace(/"/g, '&quot;')})">
        📤 Поделиться
      </button>
    </div>
  `;
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
        title: gif.title || 'GIF from Giphy',
        url: gif.images.original.url
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  } else {
    copyGIFLink(gif);
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

// Бесконечная прокрутка
function handleInfiniteScroll() {
  const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
  const isNearBottom = scrollTop + clientHeight >= scrollHeight - 500;
  
  if (isNearBottom && !state.isLoading && state.currentGIFs.length < state.totalCount) {
    loadMoreGIFs();
  }
}

// Обновление кнопки "Загрузить еще"
function updateLoadMoreButton(newGifsCount) {
  const hasMoreGIFs = state.currentGIFs.length < state.totalCount;
  loadMoreBtn.style.display = hasMoreGIFs ? 'block' : 'none';
  
  if (hasMoreGIFs) {
    loadMoreBtn.textContent = `Загрузить еще (${state.totalCount - state.currentGIFs.length})`;
  }
}

// Переключение темы
function toggleTheme() {
  state.isDarkTheme = !state.isDarkTheme;
  localStorage.setItem('darkTheme', state.isDarkTheme);
  applyTheme();
}

// Применение темы
function applyTheme() {
  document.body.classList.toggle('dark-theme', state.isDarkTheme);
  themeToggle.textContent = state.isDarkTheme ? '☀️' : '🌙';
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
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
}

function hideError() {
  errorMessage.style.display = 'none';
}

function showLoader() {
  loader.style.display = 'flex';
  state.isLoading = true;
}

function hideLoader() {
  loader.style.display = 'none';
  state.isLoading = false;
}

function closeModal() {
  modal.style.display = 'none';
  modalGif.src = '';
}

// Инициализация при загрузке
window.addEventListener('DOMContentLoaded', initApp);