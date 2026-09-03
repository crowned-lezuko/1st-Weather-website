const form = document.querySelector('#search-form');
const input = document.querySelector('#city-input');
const error = document.querySelector('#search-error');
const empty = document.querySelector('#empty-state');
const loading = document.querySelector('#loading-state');
const card = document.querySelector('#weather-card');
const favoritesElement = document.querySelector('#favorites');
const favoriteButton = document.querySelector('#favorite-button');
let currentWeather = null;
let favorites = JSON.parse(localStorage.getItem('weatherly-favorites') || '[]');

lucide.createIcons();

function setState(state) {
  empty.hidden = state !== 'empty';
  loading.hidden = state !== 'loading';
  card.hidden = state !== 'weather';
}

function showError(message) {
  error.textContent = message;
  error.hidden = false;
  setState('empty');
}

function saveFavorites() {
  localStorage.setItem('weatherly-favorites', JSON.stringify(favorites));
}

function renderFavorites() {
  document.querySelector('#favorite-count').textContent = `${favorites.length} saved`;
  if (!favorites.length) {
    favoritesElement.innerHTML = '<p class="muted">Your saved cities will appear here.</p>';
    return;
  }
  favoritesElement.innerHTML = favorites.map(city => `<button class="favorite-city" data-city="${city.replaceAll('"', '&quot;')}"><i data-lucide="map-pin"></i>${city}<span class="remove-city" data-remove="${city.replaceAll('"', '&quot;')}" aria-label="Remove ${city}"><i data-lucide="x"></i></span></button>`).join('');
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
  document.querySelector('#updated').textContent = `Updated ${data.updated_at.replace('T', ' ')}`;
  const icon = document.querySelector('#weather-icon');
  icon.setAttribute('data-lucide', data.icon);
  favoriteButton.classList.toggle('active', favorites.includes(data.city));
  favoriteButton.setAttribute('aria-label', favorites.includes(data.city) ? 'Remove from favorites' : 'Save city');
  lucide.createIcons();
  setState('weather');
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
  favorites = favorites.includes(city) ? favorites.filter(item => item !== city) : [...favorites, city];
  saveFavorites();
  renderFavorites();
  renderWeather(currentWeather);
});

favoritesElement.addEventListener('click', event => {
  const remove = event.target.closest('[data-remove]');
  if (remove) {
    event.stopPropagation();
    favorites = favorites.filter(city => city !== remove.dataset.remove);
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

renderFavorites();
