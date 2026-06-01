// OpenWeatherMap API Configuration
// Sign up for free API key at: https://openweathermap.org/api
const API_KEY = 'YOUR_API_KEY_HERE'; // Replace with your API key
const API_BASE_URL = 'https://api.openweathermap.org/data/2.5';
const GEO_API_URL = 'https://api.openweathermap.org/geo/1.0';

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const initialLocationBtn = document.getElementById('initialLocationBtn');
const suggestionsDiv = document.getElementById('suggestions');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const weatherContent = document.getElementById('weatherContent');
const initialState = document.getElementById('initialState');

// Event Listeners
searchBtn.addEventListener('click', searchWeather);
locationBtn.addEventListener('click', useCurrentLocation);
initialLocationBtn.addEventListener('click', useCurrentLocation);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchWeather();
});
searchInput.addEventListener('input', handleSearchInput);
suggestionsDiv.addEventListener('click', handleSuggestionClick);

/**
 * Fetch weather data from OpenWeatherMap
 */
async function fetchWeatherData(lat, lon) {
    try {
        showLoading(true);
        hideError();

        // Fetch current weather and forecast
        const [currentResponse, forecastResponse, uvResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`),
            fetch(`${API_BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`),
            fetch(`${API_BASE_URL}/uvi?lat=${lat}&lon=${lon}&appid=${API_KEY}`)
        ]);

        if (!currentResponse.ok) {
            throw new Error('Failed to fetch weather data. Please check your API key.');
        }

        const currentData = await currentResponse.json();
        const forecastData = forecastResponse.ok ? await forecastResponse.json() : null;
        const uvData = uvResponse.ok ? await uvResponse.json() : null;

        displayWeather(currentData, forecastData, uvData);
        showLoading(false);
    } catch (error) {
        console.error('Error fetching weather:', error);
        showError(error.message || 'Failed to fetch weather data. Please try again.');
        showLoading(false);
    }
}

/**
 * Search for weather by city name
 */
async function searchWeather() {
    const query = searchInput.value.trim();
    if (!query) return;

    try {
        // Try to parse as coordinates first (lat,lon)
        const coordMatch = query.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
        if (coordMatch) {
            const lat = parseFloat(coordMatch[1]);
            const lon = parseFloat(coordMatch[2]);
            fetchWeatherData(lat, lon);
            suggestionsDiv.classList.remove('active');
            return;
        }

        // Search by city name
        showLoading(true);
        const response = await fetch(`${GEO_API_URL}/direct?q=${encodeURIComponent(query)}&limit=1&appid=${API_KEY}`);
        
        if (!response.ok) {
            throw new Error('City not found. Please try again.');
        }

        const data = await response.json();
        if (data.length === 0) {
            throw new Error('City not found. Please try again.');
        }

        const { lat, lon } = data[0];
        fetchWeatherData(lat, lon);
        suggestionsDiv.classList.remove('active');
    } catch (error) {
        console.error('Error searching weather:', error);
        showError(error.message);
        showLoading(false);
    }
}

/**
 * Handle city search suggestions
 */
async function handleSearchInput(e) {
    const query = e.target.value.trim();
    
    if (query.length < 2) {
        suggestionsDiv.classList.remove('active');
        return;
    }

    try {
        const response = await fetch(`${GEO_API_URL}/direct?q=${encodeURIComponent(query)}&limit=5&appid=${API_KEY}`);
        const data = await response.json();

        if (data.length === 0) {
            suggestionsDiv.classList.remove('active');
            return;
        }

        suggestionsDiv.innerHTML = data.map(city => `
            <div class="suggestion-item" data-lat="${city.lat}" data-lon="${city.lon}">
                ${city.name}${city.state ? ', ' + city.state : ''}, ${city.country}
            </div>
        `).join('');

        suggestionsDiv.classList.add('active');
    } catch (error) {
        console.error('Error fetching suggestions:', error);
        suggestionsDiv.classList.remove('active');
    }
}

/**
 * Handle suggestion click
 */
function handleSuggestionClick(e) {
    if (e.target.classList.contains('suggestion-item')) {
        const lat = parseFloat(e.target.dataset.lat);
        const lon = parseFloat(e.target.dataset.lon);
        searchInput.value = e.target.textContent;
        suggestionsDiv.classList.remove('active');
        fetchWeatherData(lat, lon);
    }
}

/**
 * Use current geolocation
 */
function useCurrentLocation() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser');
        return;
    }

    showLoading(true);
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            fetchWeatherData(latitude, longitude);
        },
        (error) => {
            console.error('Geolocation error:', error);
            showError('Unable to access your location. Please enable location services.');
            showLoading(false);
        }
    );
}

/**
 * Display weather data on the page
 */
function displayWeather(currentData, forecastData, uvData) {
    // Update location info
    document.getElementById('cityName').textContent = `${currentData.name}, ${currentData.sys.country}`;
    document.getElementById('lastUpdated').textContent = `Last updated: ${new Date().toLocaleTimeString()}`;

    // Update current weather
    document.getElementById('temperature').textContent = `${Math.round(currentData.main.temp)}°C`;
    document.getElementById('weatherDesc').textContent = currentData.weather[0].main;
    document.getElementById('weatherIcon').src = `https://openweathermap.org/img/wn/${currentData.weather[0].icon}@4x.png`;
    document.getElementById('feelsLike').textContent = `${Math.round(currentData.main.feels_like)}°C`;
    document.getElementById('tempMax').textContent = `${Math.round(currentData.main.temp_max)}°C`;
    document.getElementById('tempMin').textContent = `${Math.round(currentData.main.temp_min)}°C`;

    // Update details
    document.getElementById('humidity').textContent = `${currentData.main.humidity}%`;
    document.getElementById('windSpeed').textContent = `${currentData.wind.speed.toFixed(1)} m/s`;
    document.getElementById('windDirection').textContent = `${currentData.wind.deg}°`;
    document.getElementById('pressure').textContent = `${currentData.main.pressure} hPa`;
    document.getElementById('visibility').textContent = `${(currentData.visibility / 1000).toFixed(1)} km`;
    document.getElementById('cloudCover').textContent = `${currentData.clouds.all}%`;
    document.getElementById('uvIndex').textContent = uvData ? uvData.value.toFixed(1) : '--';
    document.getElementById('dewPoint').textContent = `${calculateDewPoint(currentData.main.temp, currentData.main.humidity).toFixed(1)}°C`;

    // Update sunrise/sunset
    const sunrise = new Date(currentData.sys.sunrise * 1000);
    const sunset = new Date(currentData.sys.sunset * 1000);
    document.getElementById('sunrise').textContent = sunrise.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('sunset').textContent = sunset.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // Display forecasts
    if (forecastData) {
        displayHourlyForecast(forecastData);
        displayDailyForecast(forecastData);
    }

    // Show weather content, hide initial state
    weatherContent.style.display = 'block';
    initialState.style.display = 'none';
}

/**
 * Display hourly forecast
 */
function displayHourlyForecast(forecastData) {
    const hourlyForecast = document.getElementById('hourlyForecast');
    const hourlyData = forecastData.list.slice(0, 8); // Next 24 hours (8 * 3-hour intervals)

    hourlyForecast.innerHTML = hourlyData.map(item => {
        const time = new Date(item.dt * 1000);
        const hour = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        return `
            <div class="hourly-item">
                <div class="time">${hour}</div>
                <div class="icon" title="${item.weather[0].main}">
                    ${getWeatherEmoji(item.weather[0].main)}
                </div>
                <div class="temp">${Math.round(item.main.temp)}°</div>
            </div>
        `;
    }).join('');
}

/**
 * Display 5-day daily forecast
 */
function displayDailyForecast(forecastData) {
    const dailyForecast = document.getElementById('dailyForecast');
    const dailyData = {};

    // Group by day
    forecastData.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const day = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

        if (!dailyData[day]) {
            dailyData[day] = {
                temps: [],
                descriptions: [],
                weather: item.weather[0]
            };
        }

        dailyData[day].temps.push(item.main.temp);
        dailyData[day].descriptions.push(item.weather[0].main);
    });

    // Display top 5 days
    dailyForecast.innerHTML = Object.entries(dailyData).slice(0, 5).map(([day, data]) => {
        const maxTemp = Math.max(...data.temps);
        const minTemp = Math.min(...data.temps);
        const mostCommonDescription = getMostCommon(data.descriptions);

        return `
            <div class="daily-item">
                <div class="day">${day}</div>
                <div class="icon">${getWeatherEmoji(mostCommonDescription)}</div>
                <div class="description">${mostCommonDescription}</div>
                <div class="temps">
                    <span class="high">${Math.round(maxTemp)}°</span>
                    <span class="low">${Math.round(minTemp)}°</span>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Calculate dew point
 */
function calculateDewPoint(temp, humidity) {
    const a = 17.27;
    const b = 237.7;
    const alpha = ((a * temp) / (b + temp)) + Math.log(humidity / 100);
    return (b * alpha) / (a - alpha);
}

/**
 * Get weather emoji
 */
function getWeatherEmoji(description) {
    const desc = description.toLowerCase();
    const emojiMap = {
        'clear': '☀️',
        'clouds': '☁️',
        'rain': '🌧️',
        'drizzle': '🌦️',
        'thunderstorm': '⛈️',
        'snow': '❄️',
        'mist': '🌫️',
        'smoke': '💨',
        'haze': '🌫️',
        'dust': '🌪️',
        'fog': '🌫️',
        'sand': '🌪️',
        'ash': '💨',
        'squall': '💨',
        'tornado': '🌪️'
    };

    for (const [key, emoji] of Object.entries(emojiMap)) {
        if (desc.includes(key)) {
            return emoji;
        }
    }
    return '🌤️';
}

/**
 * Get most common item in array
 */
function getMostCommon(arr) {
    const frequency = {};
    let maxCount = 0;
    let mostCommon = arr[0];

    arr.forEach(item => {
        frequency[item] = (frequency[item] || 0) + 1;
        if (frequency[item] > maxCount) {
            maxCount = frequency[item];
            mostCommon = item;
        }
    });

    return mostCommon;
}

/**
 * Show loading state
 */
function showLoading(show) {
    loadingDiv.style.display = show ? 'flex' : 'none';
}

/**
 * Show error message
 */
function showError(message) {
    errorDiv.textContent = '❌ ' + message;
    errorDiv.style.display = 'block';
    weatherContent.style.display = 'none';
    initialState.style.display = 'none';
}

/**
 * Hide error message
 */
function hideError() {
    errorDiv.style.display = 'none';
}

/**
 * Check if API key is configured
 */
function checkApiKey() {
    if (API_KEY === 'YOUR_API_KEY_HERE') {
        showError('⚠️ Weather API key not configured. Please get a free API key from https://openweathermap.org/api and replace "YOUR_API_KEY_HERE" in weather-script.js');
        return false;
    }
    return true;
}

// Initialize
if (checkApiKey()) {
    // Ready to use
}
