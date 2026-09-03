# Weatherly

A Flask weather dashboard using Open-Meteo. It does not require an API key.

## Run locally

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
py -m pip install -r requirements.txt
py -m flask --app app run --debug
```

Open http://127.0.0.1:5000 in a browser.
