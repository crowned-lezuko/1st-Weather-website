const form = document.querySelector('#search-form');
const input = document.querySelector('#city-input');
const error = document.querySelector('#search-error');
const empty = document.querySelector('#empty-state');
const loading = document.querySelector('#loading-state');
const card = document.querySelector('#weather-card');
const favoritesElement = document.querySelector('#favorites');
const favoriteButton = document.querySelector('#favorite-button');
const locationButton = document.querySelector('#location-button');
const forecastSection = document.querySelector('#forecast-section');
const forecastElement = document.querySelector('#forecast');
let currentWeather = null;
let favorites = JSON.parse(localStorage.getItem('weatherly-favorites') || '[]');
favorites = favorites.map(item => typeof item === 'string' ? { city: item, temperature: null, country_code: '' } : item);

lucide.createIcons();

function setState(state) {
  empty.hidden = state !== 'empty';
  loading.hidden = state !== 'loading';
  card.hidden = state !== 'weather';
  forecastSection.hidden = state !== 'weather' || !currentWeather?.forecast?.length;
}

function showError(message) {
  error.textContent = message;
  error.hidden = false;
  setState('empty');
}

function saveFavorites() {
  localStorage.setItem('weatherly-favorites', JSON.stringify(favorites));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function renderFavorites() {
  document.querySelector('#favorite-count').textContent = `${favorites.length} saved`;
  if (!favorites.length) {
    favoritesElement.innerHTML = '<p class="muted">Your saved cities will appear here.</p>';
    return;
  }
  favoritesElement.innerHTML = favorites.map(saved => `<button class="favorite-city" data-city="${escapeHtml(saved.city)}"><i data-lucide="map-pin"></i><span>${escapeHtml(saved.city)}${saved.country_code ? `, ${escapeHtml(saved.country_code)}` : ''}</span>${saved.temperature === null ? '' : `<strong>${saved.temperature}°</strong>`}<span class="remove-city" data-remove="${escapeHtml(saved.city)}" aria-label="Remove ${escapeHtml(saved.city)}"><i data-lucide="x"></i></span></button>`).join('');
  lucide.createIcons();
}

function renderWeather(data) {
  currentWeather = data;
  const country = (data.country_code || 'global').toLowerCase();
  const temperatureBand = data.temperature <= 5 ? 'cold' : data.temperature >= 25 ? 'hot' : 'mild';
  document.body.dataset.country = country;
  document.body.dataset.temperature = temperatureBand;
  document.querySelector('#location').textContent = `${data.city}, ${data.country_code}`;
  document.querySelector('#local-time').textContent = `Local time: ${data.local_time}`;
  document.querySelector('#condition').textContent = data.condition;
  document.querySelector('#temperature').textContent = data.temperature;
  document.querySelector('#feels-like').textContent = data.feels_like;
  document.querySelector('#humidity').textContent = `${data.humidity}%`;
  document.querySelector('#wind').textContent = data.wind_speed;
  document.querySelector('#precipitation').textContent = data.precipitation;
  document.querySelector('#precipitation-probability').textContent = data.precipitation_probability;
  const rainIntensity = Number(data.rain_intensity || 0);
  const intensityLabel = rainIntensity === 0 ? 'None' : rainIntensity < 2.5 ? 'Light' : rainIntensity < 7.6 ? 'Moderate' : 'Heavy';
  document.querySelector('#rain-intensity').textContent = `${intensityLabel} (${rainIntensity} mm/h)`;
  forecastSection.hidden = !data.forecast?.length;
  forecastElement.innerHTML = (data.forecast || []).map(day => `<article class="forecast-day"><strong>${day.day}</strong><i data-lucide="${day.icon}"></i><span>${escapeHtml(day.condition)}</span><b>${day.high}° <small>${day.low}°</small></b><em>${day.precipitation_probability}% rain</em></article>`).join('');
  const existingFavorite = favorites.find(saved => saved.city === data.city);
  if (existingFavorite) {
    existingFavorite.temperature = data.temperature;
    existingFavorite.country_code = data.country_code;
    saveFavorites();
    renderFavorites();
  }
  document.querySelector('#updated').textContent = `Updated ${data.updated_at.replace('T', ' ')}`;
  const icon = document.querySelector('#weather-icon');
  icon.setAttribute('data-lucide', data.icon);
  const isFavorite = favorites.some(saved => saved.city === data.city);
  favoriteButton.classList.toggle('active', isFavorite);
  favoriteButton.setAttribute('aria-label', isFavorite ? 'Remove from favorites' : 'Save city');
  lucide.createIcons();
  setState('weather');
}

function useCurrentLocation() {
  if (!navigator.geolocation) {
    showError('Location detection is not supported by this browser.');
    return;
  }
  error.hidden = true;
  setState('loading');
  navigator.geolocation.getCurrentPosition(async position => {
    try {
      const response = await fetch(`/api/weather/location?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load your location.');
      input.value = data.city;
      renderWeather(data);
    } catch (requestError) {
      showError(requestError.message);
    }
  }, locationError => {
    const message = locationError.code === 1 ? 'Location permission was denied. You can still search by city.' : 'We could not detect your location. Please search by city.';
    showError(message);
  }, { enableHighAccuracy: false, timeout: 10000 });
}

async function searchCity(city) {
  error.hidden = true;
  setState('loading');
  try {
    const response = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to load weather.');
    renderWeather(data);
  } catch (requestError) {
    showError(requestError.message);
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  const city = input.value.trim();
  if (city) searchCity(city);
});

favoriteButton.addEventListener('click', () => {
  if (!currentWeather) return;
  const city = currentWeather.city;
  favorites = favorites.some(saved => saved.city === city) ? favorites.filter(saved => saved.city !== city) : [...favorites, { city, country_code: currentWeather.country_code, temperature: currentWeather.temperature }];
  saveFavorites();
  renderFavorites();
  renderWeather(currentWeather);
});

favoritesElement.addEventListener('click', event => {
  const remove = event.target.closest('[data-remove]');
  if (remove) {
    event.stopPropagation();
    favorites = favorites.filter(saved => saved.city !== remove.dataset.remove);
    saveFavorites();
    renderFavorites();
    return;
  }
  const cityButton = event.target.closest('[data-city]');
  if (cityButton) {
    input.value = cityButton.dataset.city;
    searchCity(cityButton.dataset.city);
  }
});

locationButton.addEventListener('click', useCurrentLocation);

renderFavorites();
