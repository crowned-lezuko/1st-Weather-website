from __future__ import annotations

import json
import ssl
from datetime import date, datetime
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import certifi
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
WEATHER_CODES = {
    0: ("Clear sky", "sun"),
    1: ("Mainly clear", "sun-medium"),
    2: ("Partly cloudy", "cloud-sun"),
    3: ("Overcast", "cloud"),
    45: ("Foggy", "cloud-fog"),
    48: ("Depositing rime fog", "cloud-fog"),
    51: ("Light drizzle", "cloud-drizzle"),
    53: ("Drizzle", "cloud-drizzle"),
    55: ("Heavy drizzle", "cloud-drizzle"),
    56: ("Light freezing drizzle", "cloud-drizzle"),
    57: ("Freezing drizzle", "cloud-drizzle"),
    61: ("Light rain", "cloud-rain"),
    63: ("Rain", "cloud-rain"),
    65: ("Heavy rain", "cloud-rain"),
    66: ("Light freezing rain", "cloud-rain"),
    67: ("Freezing rain", "cloud-rain"),
    71: ("Light snow", "snowflake"),
    73: ("Snow", "snowflake"),
    75: ("Heavy snow", "snowflake"),
    77: ("Snow grains", "snowflake"),
    80: ("Light rain showers", "cloud-rain"),
    81: ("Rain showers", "cloud-rain"),
    82: ("Heavy rain showers", "cloud-rain"),
    85: ("Light snow showers", "cloud-snow"),
    86: ("Snow showers", "cloud-snow"),
    95: ("Thunderstorm", "cloud-lightning"),
    96: ("Thunderstorm with hail", "cloud-lightning"),
    99: ("Thunderstorm with heavy hail", "cloud-lightning"),
}


def fetch_json(url: str, params: dict[str, str | int]) -> dict:
    query = urlencode(params)
    request = Request(f"{url}?{query}", headers={"User-Agent": "Weatherly/1.0"})
    try:
        context = ssl.create_default_context(cafile=certifi.where())
        with urlopen(request, context=context, timeout=8) as response:
            return json.load(response)
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
        raise RuntimeError("The weather service is unavailable right now.") from error


def build_weather(location: dict) -> dict:
    """Fetch weather for a geocoded location and shape the UI response."""
    weather = fetch_json(
        FORECAST_URL,
        {
            "latitude": location["latitude"],
            "longitude": location["longitude"],
            "current": "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation,rain,showers",
            "hourly": "precipitation_probability",
            "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,rain_sum,showers_sum",
            "temperature_unit": "celsius",
            "wind_speed_unit": "kmh",
            "timezone": "auto",
            "forecast_days": 5,
        },
    )
    current = weather["current"]
    hourly = weather.get("hourly", {})
    precipitation_probability = (hourly.get("precipitation_probability") or [0])[0]
    daily = weather.get("daily", {})
    forecast = []
    for index, forecast_date in enumerate(daily.get("time", [])):
        code = daily["weather_code"][index]
        condition, icon = WEATHER_CODES.get(code, ("Forecast conditions", "cloud"))
        forecast.append({
            "date": forecast_date,
            "day": date.fromisoformat(forecast_date).strftime("%a"),
            "condition": condition,
            "icon": icon,
            "high": round(daily["temperature_2m_max"][index]),
            "low": round(daily["temperature_2m_min"][index]),
            "precipitation_probability": daily["precipitation_probability_max"][index],
            "rain": daily["rain_sum"][index],
            "showers": daily["showers_sum"][index],
        })
    code = current["weather_code"]
    condition, icon = WEATHER_CODES.get(code, ("Current conditions", "cloud"))
    local_time = datetime.fromisoformat(current["time"]).strftime("%A, %B %d at %I:%M %p").replace(" 0", " ")
    return {
        "city": location["name"],
        "country": location.get("country", ""),
        "country_code": location.get("country_code", ""),
        "latitude": location["latitude"],
        "longitude": location["longitude"],
        "temperature": round(current["temperature_2m"]),
        "feels_like": round(current["apparent_temperature"]),
        "humidity": current["relative_humidity_2m"],
        "wind_speed": round(current["wind_speed_10m"]),
        "precipitation": current["precipitation"],
        "precipitation_probability": precipitation_probability,
        "rain_intensity": round(current.get("rain", 0) + current.get("showers", 0), 1),
        "condition": condition,
        "icon": icon,
        "forecast": forecast,
        "updated_at": current["time"],
        "local_time": local_time,
        "timezone": weather.get("timezone", ""),
    }


def get_weather(city: str) -> dict:
    locations = fetch_json(
        GEOCODING_URL,
        {"name": city, "count": 1, "language": "en", "format": "json"},
    ).get("results", [])
    if not locations:
        raise LookupError(f'We could not find a city named "{city}".')

    location = locations[0]
    return build_weather(location)


def get_weather_by_coordinates(latitude: float, longitude: float) -> dict:
    location = {
        "name": "Your location",
        "country": "",
        "country_code": "",
        "latitude": latitude,
        "longitude": longitude,
    }
    return build_weather(location)


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/weather")
def weather():
    city = request.args.get("city", "").strip()
    if not city or len(city) > 80:
        return jsonify({"error": "Enter a city name to search."}), 400
    try:
        return jsonify(get_weather(city))
    except LookupError as error:
        return jsonify({"error": str(error)}), 404
    except RuntimeError as error:
        return jsonify({"error": str(error)}), 502


@app.get("/api/weather/location")
def weather_location():
    try:
        latitude = float(request.args.get("latitude", ""))
        longitude = float(request.args.get("longitude", ""))
        if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
            raise ValueError
        return jsonify(get_weather_by_coordinates(latitude, longitude))
    except (TypeError, ValueError):
        return jsonify({"error": "That location is not valid."}), 400
    except LookupError as error:
        return jsonify({"error": str(error)}), 404
    except RuntimeError as error:
        return jsonify({"error": str(error)}), 502


if __name__ == "__main__":
    app.run(debug=True)
