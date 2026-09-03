# Weatherly

A Flask weather dashboard using Open-Meteo. It does not require an API key.

## Run locally

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m flask --app app run --debug
```

Open http://127.0.0.1:5000 in a browser.

## Open as a laptop app

Double-click `Open Weatherly.bat`. On the first launch it creates the local Python environment and installs the dependencies, then opens Weatherly in your browser. A desktop shortcut named `Weatherly` is also available if you created one with the setup instructions.

The custom app artwork is included as `weather-icon.png` and `weather-icon.ico`.
