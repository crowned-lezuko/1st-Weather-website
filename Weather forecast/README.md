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

## Publish online and install on a phone

1. Create a Render account at https://render.com and choose **New > Blueprint**.
2. Connect the `crowned-lezuko/1st-Weather-website` GitHub repository.
3. Select the `Weather forecast` folder as the service root and deploy.
4. Open the Render URL on your phone.
5. Choose **Add to Home Screen** in the browser menu.

Future pushes to `main` can trigger a redeploy. The service worker refreshes the installed app assets when the new deployment is opened.
