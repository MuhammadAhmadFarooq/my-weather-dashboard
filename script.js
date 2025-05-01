// Api Keys and import (gen AI)
const apiKey = "282154b67287b19c9d7ce1891430d1b6";
const WEATHER_API = 'https://api.openweathermap.org/data/2.5/weather';
const FORECAST_API = 'https://api.openweathermap.org/data/2.5/forecast';
import { GoogleGenerativeAI } from "@google/generative-ai";

// variables
let currentUnit = 'metric';
let weatherData = null;
let forecastDataArray = [];
let tempChartInstance = null;
let conditionChartInstance = null;
let tempLineChartInstance = null;

// DOM elements
const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const unitToggle = document.getElementById('unit-switch');
const currentWeather = document.getElementById('current-weather');
const forecastData = document.getElementById('forecast-data');
const loadingSpinner = document.getElementById('loading-spinner');
const cityName = document.getElementById('city-name');

// event listeners
if (searchBtn) searchBtn.addEventListener('click', () => getWeather(cityInput.value.trim()));
if (unitToggle) unitToggle.addEventListener('change', toggleUnit);

// geolocation and weather fetching
function getLocation() {
    if (navigator.geolocation) {
        showLoadingSpinner();
        navigator.geolocation.getCurrentPosition(
            position => getWeatherByCoords(position.coords.latitude, position.coords.longitude),
            error => {
                console.error("Geolocation error:", error);
                hideLoadingSpinner();
                getWeather("Islamabad");
            }
        );
    } else {
        console.log("Geolocation is not supported by this browser.");
        getWeather("Islamabad");
    }
}

async function getWeatherByCoords(lat, lon) {
    try {
        const weatherResponse = await fetch(`${WEATHER_API}?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${apiKey}`);
        const forecastResponse = await fetch(`${FORECAST_API}?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${apiKey}`);

        if (!weatherResponse.ok || !forecastResponse.ok) {
            throw new Error('City not found');
        }

        weatherData = await weatherResponse.json();
        const forecastData = await forecastResponse.json();
        forecastDataArray = forecastData.list;

        localStorage.setItem('lastSearchedCity', weatherData.name);
        localStorage.setItem('forecastData', JSON.stringify(forecastDataArray));

        if (document.getElementById('current-weather')) {
            displayCurrentWeather();
            displayForecast();
            createCharts();
        } else if (document.getElementById('data-table')) {
            displayForecastTable();
        }
    } catch (error) {
        console.error('Error:', error);
        if (currentWeather) currentWeather.innerHTML = `<p class="error">${error.message}</p>`;
    } finally {
        hideLoadingSpinner();
    }
}

// getting weather by user input
async function getWeather(city) {
    if (!city) {
        alert("Please enter a valid city name.");
        return;
    }

    showLoadingSpinner();

    try {
        const weatherResponse = await fetch(`${WEATHER_API}?q=${city}&units=${currentUnit}&appid=${apiKey}`);
        const forecastResponse = await fetch(`${FORECAST_API}?q=${city}&units=${currentUnit}&appid=${apiKey}`);

        if (!weatherResponse.ok || !forecastResponse.ok) {
            throw new Error('City not found');
        }

        weatherData = await weatherResponse.json();
        const forecastData = await forecastResponse.json();
        forecastDataArray = forecastData.list;

        localStorage.setItem('lastSearchedCity', city);
        localStorage.setItem('forecastData', JSON.stringify(forecastDataArray));

        if (document.getElementById('current-weather')) {
            displayCurrentWeather();
            displayForecast();
            createCharts();
        } else if (document.getElementById('data-table')) {
            displayForecastTable();
        }
    } catch (error) {
        console.error('Error:', error);
        if (currentWeather) currentWeather.innerHTML = `<p class="error">${error.message}</p>`;
    } finally {
        hideLoadingSpinner();
    }
}

function displayCurrentWeather() {
    if (!weatherData) return;

    // store original temperature in Celsius
    const originalTemp = weatherData.main.temp; 

    // convert temperature
    let temp = currentUnit === 'imperial' 
        ? (originalTemp * 9 / 5) + 32 // C to F
        : originalTemp; // store in C

    // weather details
    const description = weatherData.weather[0].description; //condition description
    const icon = weatherData.weather[0].icon; //icon
    const humidity = weatherData.main.humidity; //humidity 
    const windSpeed = weatherData.wind.speed; // wind speed

    // set city name and weather details
    cityName.textContent = weatherData.name;
    currentWeather.innerHTML = `
    <div class="weather-container">
        <div class="weather-header">
            <div class="weather-icon">
                <img src="http://openweathermap.org/img/wn/${icon}@2x.png" alt="${description}">
            </div>
            <div class="weather-temp">
                <h2>${temp.toFixed(1)}° ${currentUnit === 'metric' ? 'C' : 'F'}</h2>
                <p class="description">${description.charAt(0).toUpperCase() + description.slice(1)}</p>
            </div>
        </div>
        <div class="weather-details">
            <div class="detail-item">
                <i class="fas fa-tint"></i>
                <p><strong>Humidity:</strong> ${humidity}%</p>
            </div>
            <div class="detail-item">
                <i class="fas fa-wind"></i>
                <p><strong>Wind Speed:</strong> ${windSpeed} ${currentUnit === 'metric' ? 'm/s' : 'mph'}</p>
            </div>
        </div>
    </div>
    `;
}

function displayForecast() {
    const forecastDisplay = document.querySelector('.forecast-display');
    if (!forecastDisplay) return;

    forecastDisplay.innerHTML = '';
    const dailyForecasts = {};
    let dayCounter = 0; // counter 
    const currentDate = new Date().toDateString(); // Get the current date

    forecastDataArray.forEach((day) => {
        const date = new Date(day.dt_txt).toDateString(); // date as a string

        if (date !== currentDate) { // Skip the current day
            if (!dailyForecasts[date]) {
                dailyForecasts[date] = {
                    temp: day.main.temp,
                    description: day.weather[0].description,
                    icon: day.weather[0].icon,
                    count: 1
                };
            } else {
                dailyForecasts[date].temp += day.main.temp;
                dailyForecasts[date].count += 1;
            }
        }
    });

    // forecast starting from the next day, up to 5 days
    Object.keys(dailyForecasts).forEach((date) => {
        if (dayCounter >= 5) return; // Stop after 5 days

        const forecast = dailyForecasts[date];
        let avgTemp = forecast.temp / forecast.count;

        avgTemp = currentUnit === 'imperial'
            ? (avgTemp * 9 / 5) + 32
            : avgTemp;

        const description = forecast.description;
        const icon = forecast.icon;

        const forecastHTML = `
            <div class="forecast-item">
                <div class="forecast-date">
                    <p>${date}</p>
                </div>
                <div class="forecast-content">
                    <div class="forecast-icon">
                        <img src="http://openweathermap.org/img/wn/${icon}@2x.png" alt="${description}">
                    </div>
                    <div class="forecast-details">
                        <p class="forecast-temp">${avgTemp.toFixed(1)}° ${currentUnit === 'metric' ? 'C' : 'F'}</p>
                        <p class="forecast-description">${description.charAt(0).toUpperCase() + description.slice(1)}</p>
                    </div>
                </div>
            </div>
        `;

        forecastDisplay.innerHTML += forecastHTML;
        dayCounter++; // Increment the counter 
    });
}


// Utility functions
function toggleUnit() {
    currentUnit = unitToggle.checked ? 'imperial' : 'metric';
    localStorage.setItem('currentUnit', currentUnit);
    if (weatherData) {
        displayCurrentWeather();
        displayForecast();
        createCharts();
    }
}



function showLoadingSpinner() {
    if (loadingSpinner) loadingSpinner.style.display = 'block';
}

function hideLoadingSpinner() {
    if (loadingSpinner) loadingSpinner.style.display = 'none';
}

// Chart functions 
function createCharts() {

    destroyCharts(); // Destroy existing charts if they exist

    createTemperatureChart();
    createConditionChart();
    createTemperatureLineChart();
}

function destroyCharts() {
    if (tempChartInstance) {
        tempChartInstance.destroy();
    }
    if (conditionChartInstance) {
        conditionChartInstance.destroy();
    }
    if (tempLineChartInstance) {
        tempLineChartInstance.destroy();
    }
}

function createTemperatureChart() {
    const ctx = document.getElementById('temp-chart').getContext('2d');
    
    const seenDates = new Set();
    const filteredForecast = forecastDataArray.filter((day) => {
        const date = new Date(day.dt_txt).toDateString();
        if (!seenDates.has(date)) {
            seenDates.add(date);
            return true;
        }
        return false;
    }).slice(1, 6); 

    const labels = filteredForecast.map(day => new Date(day.dt * 1000).toLocaleDateString());
    const temperatures = filteredForecast.map(day =>
        currentUnit === 'imperial'
            ? (day.main.temp * 9 / 5) + 32
            : day.main.temp
    );

    tempChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Temperature',
                data: temperatures,
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
                animation: {
                    delay: (context) => {
                        if (context.active || context.hovered) {
                            return 0;
                        }
                        return context.index * 300; // delay for each bar
                    }
                }
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: '5-Day Temperature Forecast'
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: currentUnit === 'metric' ? 'Temperature (°C)' : 'Temperature (°F)'
                    }
                }
            }
        }
    });
}

function createConditionChart() {
    const ctx = document.getElementById('condition-chart').getContext('2d');
    
    const seenDates = new Set();
    const filteredForecast = forecastDataArray.filter((day) => {
        const date = new Date(day.dt_txt).toDateString();
        if (!seenDates.has(date)) {
            seenDates.add(date);
            return true;
        }
        return false;
    }).slice(1, 6); 

    const conditions = filteredForecast.map(day => day.weather[0].main);
    const conditionCounts = conditions.reduce((acc, condition) => {
        acc[condition] = (acc[condition] || 0) + 1;
        return acc;
    }, {});

    conditionChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(conditionCounts),
            datasets: [{
                data: Object.values(conditionCounts),
                backgroundColor: ['rgba(255, 99, 132, 0.6)', 'rgba(54, 162, 235, 0.6)', 'rgba(255, 206, 86, 0.6)', 'rgba(75, 192, 192, 0.6)'],
                borderColor: ['rgba(255, 99, 132, 1)', 'rgba(54, 162, 235, 1)', 'rgba(255, 206, 86, 1)', 'rgba(75, 192, 192, 1)'],
                borderWidth: 1,
                animation: {
                    delay: (context) => {
                        if (context.active || context.hovered) {
                            return 0;
                        }
                        return context.index * 100; // delay for each segment
                    }
                }
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Weather Condition Distribution (Next 5 Days)'
                }
            }
        }
    });
}


function createTemperatureLineChart() {
    const ctx = document.getElementById('temp-line-chart').getContext('2d');
    
    // Collect distinct dates
    const seenDates = new Set();
    const filteredForecast = forecastDataArray.filter((day) => {
        const date = new Date(day.dt_txt).toDateString();
        if (!seenDates.has(date)) {
            seenDates.add(date);
            return true;
        }
        return false;
    }).slice(1, 6); 

    const labels = filteredForecast.map(day => new Date(day.dt * 1000).toLocaleDateString());
    const temperatures = filteredForecast.map(day =>
        currentUnit === 'imperial'
            ? (day.main.temp * 9 / 5) + 32
            : day.main.temp
    );

    tempLineChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Temperature Over Time',
                data: temperatures,
                backgroundColor: 'rgba(153, 102, 255, 0.6)',
                borderColor: 'rgba(153, 102, 255, 1)',
                borderWidth: 1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Temperature Variations (Next 5 Days)'
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: currentUnit === 'metric' ? 'Temperature (°C)' : 'Temperature (°F)'
                    }
                }
            }
        }
    });
}


// Sorting and filtering functions
function sortTemperatures(order) {
    forecastDataArray.sort((a, b) => order === 'asc' ? a.main.temp - b.main.temp : b.main.temp - a.main.temp);
    if (document.getElementById('data-table')) {
        displayForecastTable();
    } else {
        displayForecast();
        createCharts();
    }
}

function filterRainyDays() {
    const rainyDays = forecastDataArray.filter(day => day.weather[0].main.toLowerCase().includes('rain'));
    if (rainyDays.length === 0) {
        alert("No rainy days in the forecast.");
    } else {
        forecastDataArray = rainyDays;
        if (document.getElementById('data-table')) {
            displayForecastTable();
        } else {
            displayForecast();
            createCharts();
        }
    }
}

function showHighestTemperature() {
    const highestTempDay = forecastDataArray.reduce((prev, current) => (prev.main.temp > current.main.temp) ? prev : current);
    forecastDataArray = [highestTempDay];
    if (document.getElementById('data-table')) {
        displayForecastTable();
    } else {
        displayForecast();
        createCharts();
    }
}


// initialize the page
window.addEventListener('load', () => {
    const lastCity = localStorage.getItem('lastSearchedCity');
    const storedForecastData = localStorage.getItem('forecastData');
    
    if (storedForecastData) {
        forecastDataArray = JSON.parse(storedForecastData);
    }
    
    if (lastCity) {
        getWeather(lastCity);
    } else {
        getLocation();
    }

    if (document.getElementById('data-table')) {
        displayForecastTable();
    }
});

// event listeners for table view
if (document.getElementById('sort-asc')) {
    document.getElementById('sort-asc').addEventListener('click', () => sortTemperatures('asc'));
}
if (document.getElementById('sort-desc')) {
    document.getElementById('sort-desc').addEventListener('click', () => sortTemperatures('desc'));
}
if (document.getElementById('filter-rain')) {
    document.getElementById('filter-rain').addEventListener('click', filterRainyDays);
}
if (document.getElementById('highest-temp')) {
    document.getElementById('highest-temp').addEventListener('click', showHighestTemperature);
}
function updatePagination(currentPage) {
    const totalPages = Math.ceil(forecastDataArray.length / 10);
    const paginationElement = document.getElementById('pagination');
    if (!paginationElement) return;

    let paginationHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `<button onclick="displayForecastTable(${i})" ${i === currentPage ? 'disabled' : ''}>${i}</button>`;
    }
    paginationElement.innerHTML = paginationHTML;
}

let unit = localStorage.getItem('currentUnit') || 'metric'; 

function toggleUnit1() {
    unit = unit === 'metric' ? 'imperial' : 'metric';
    localStorage.setItem('unit', unit);
    displayForecastTable();
}

function displayForecastTable(page = 1) {
    const tableBody = document.getElementById('table-body');
    if (!tableBody) return;

    const itemsPerPage = 10;
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = forecastDataArray.slice(startIndex, endIndex);

    tableBody.innerHTML = '';
    paginatedData.forEach(day => {
        let temp = day.main.temp;
        let windSpeed = day.wind.speed;
        
        if (unit === 'imperial') {
            temp = (temp * 9 / 5) + 32;
            windSpeed = windSpeed * 2.23694; // convert m/s to mph
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${new Date(day.dt * 1000).toLocaleDateString()}</td>
            <td>${day.weather[0].description}</td>
            <td>${temp.toFixed(1)}° ${unit === 'metric' ? 'C' : 'F'}</td>
            <td>${day.main.humidity} %</td>
            <td>${windSpeed.toFixed(2)} ${unit === 'metric' ? 'm/s' : 'mph'}</td>
        `;
        tableBody.appendChild(row);
    });

    updatePagination(page);
}

function clearTableData() {
    forecastDataArray = [];
    localStorage.removeItem('forecastData');
    localStorage.removeItem('lastSearchedCity');
    displayForecastTable();
    document.getElementById('pagination').innerHTML = '';
}

if (unitToggle) {
    unitToggle.checked = unit === 'imperial';
    unitToggle.addEventListener('change', toggleUnit1);
}

const clearButton = document.getElementById('clear-data');
if (clearButton) {
    clearButton.addEventListener('click', clearTableData);
}


// call this function when the page loads
window.addEventListener('load', () => {
    const storedForecastData = localStorage.getItem('forecastData');
    if (storedForecastData) {
        forecastDataArray = JSON.parse(storedForecastData);
        displayForecastTable();
    } else {
        console.log('No forecast data available');
    }
});



// AI ChatBot
// Gemini API key 
const GEMINI_API_KEY = 'AIzaSyDhLS9tvnr58jIJpaP71K3SxDp3UxKJLO4';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

// Weather API key
const WEATHER_API_KEY = "282154b67287b19c9d7ce1891430d1b6";
const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather';

// DOM elements
const chatbotModal = document.getElementById('chatbot-modal');
const chatbotToggle = document.getElementById('chatbot-toggle');
const chatbotInput = document.getElementById('chatbot-input');
const chatbotSend = document.getElementById('chatbot-send');
const chatbotMessages = document.getElementById('chatbot-messages');

// event listeners
chatbotToggle.addEventListener('click', toggleChatbot);
chatbotSend.addEventListener('click', sendMessage);

chatbotInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

function toggleChatbot() {
    chatbotModal.style.display = chatbotModal.style.display === 'none' ? 'block' : 'none';
}

// func of send message
async function sendMessage() {
    const userMessage = chatbotInput.value.trim();
    if (!userMessage) return; // prevent empty messages

    addMessageToChat('You', userMessage); // print user mssg
    chatbotInput.value = ''; //clear input
    
    const response = await handleChatbotQuery(userMessage);
    addMessageToChat('Bot', response); // print chatbot replies
}

// fetch weather data
async function fetchWeatherData(location) {
    try {
        const response = await fetch(`${WEATHER_API_URL}?q=${location}&units=metric&appid=${WEATHER_API_KEY}`);
        if (!response.ok) throw new Error('Weather data not found.');
        const data = await response.json();
        return formatWeatherData(data);
    } catch (error) {
        console.error('Error fetching weather data:', error);
        return "Sorry, I couldn't fetch the weather information. Please try again later.";
    }
}

//format weather data
function formatWeatherData(data) {
    const { name, weather, main, wind } = data;
    const description = weather[0].description;
    const temp = main.temp;
    const humidity = main.humidity;
    const windSpeed = wind.speed;
    
    return `The weather in ${name} is currently ${description} with a temperature of ${temp}°C, humidity of ${humidity}%, and wind speed of ${windSpeed} m/s.`;
}


//call Gemini API
async function callGeminiAPI(message) {
    showLoadingSpinner();
    try {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(message);
        const response = await result.response;
        const text = response.text();
        hideLoadingSpinner();
        return text;
    } catch (error) {
        hideLoadingSpinner();
        console.error('Error calling Gemini API:', error);
        return "I'm sorry, I couldn't process your request at the moment. Please try again later.";
    }
}



//chatbot queries
async function handleChatbotQuery(message) {
    if (message.toLowerCase().includes('weather')) {
        const locationMatch = message.match(/weather\s+in\s+([a-zA-Z\s]+)/i);
        const location = locationMatch ? locationMatch[1].trim() : 'Islamabad'; 
        return await fetchWeatherData(location);
    } else {
        return await callGeminiAPI(message);
    }
}

function addMessageToChat(sender, message) {
    const messageElement = document.createElement('div');
    messageElement.innerHTML = `<strong>${sender}:</strong> ${message}`;
    messageElement.className = sender === 'You' ? 'user-message' : 'bot-message'; 
    chatbotMessages.appendChild(messageElement);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}


chatbotSend.addEventListener('click', async () => {
    const userMessage = chatbotInput.value.trim();
    if (!userMessage) return;
    
    addMessageToChat('You', userMessage);
    chatbotInput.value = '';
    
    const response = await handleChatbotQuery(userMessage);
    addMessageToChat('Bot', response);
});

chatbotInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        chatbotSend.click();
    }
});


window.displayForecastTable = displayForecastTable;

document.addEventListener('DOMContentLoaded', () => {
    displayForecastTable();
});