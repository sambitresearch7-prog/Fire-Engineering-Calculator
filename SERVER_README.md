# Fire Engineering Calculator — Server & Deployment Guide

## Files

| File | Purpose |
|------|---------|
| `index.html` | Main UI (all 9 modules) |
| `style.css` | Stylesheet |
| `calc.js` | All calculation logic + fire station data embedded |
| `server.py` | Optional Python backend (for persistent DB updates) |
| `Australia_Urban_Fire_Stations_All_States.xlsx` | Source Excel (optional, for re-uploads) |

---

## Option A — GitHub Pages (static, no server)

1. Push `index.html`, `style.css`, `calc.js` to a GitHub repo.
2. Enable **Settings → Pages → main / root**.
3. The fire station database is baked into `calc.js` — 605 stations, always available.
4. **To update the database without a server:** upload the new Excel via the in-browser *Update Station Database* panel in the Nearest Fire Stations tab. SheetJS parses it client-side and updates the session (reloading the page resets to the baked-in 605 stations).

---

## Option B — Python Server (persistent DB updates)

The backend server (`server.py`) serves the static files AND provides a REST endpoint that patches `calc.js` on disk so updates persist across page reloads.

### Installation

```bash
pip install flask openpyxl pandas
```

### Run

```bash
python server.py
# → http://localhost:5000
```

### How uploading works

1. Open the **Nearest Fire Stations** tab.
2. Under *Update Station Database*, choose a `.xlsx` file and click **Upload & Apply**.
3. The browser POSTs to `POST /api/upload-stations`.
4. The server validates the file, parses all state sheets, rewrites the `FS_BUILTIN_STATIONS` array in `calc.js`, and saves a copy as `fire_stations.xlsx`.
5. Reload the browser — the new stations are now live for all visitors.

### REST API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Serve `index.html` |
| `POST` | `/api/upload-stations` | Upload new Excel, patch `calc.js` |
| `GET` | `/api/stations` | Return current station list as JSON |

#### `POST /api/upload-stations`

Request: `multipart/form-data` with field `file` (`.xlsx`).

Response (success):
```json
{ "ok": true, "count": 612, "msg": "Successfully loaded 612 stations. calc.js has been updated — reload the browser page." }
```

Response (error):
```json
{ "ok": false, "error": "Sheet 'QLD' is missing columns: LATITUDE" }
```

---

## Excel Format Requirements

The uploaded file must match this structure:

- **Sheets named:** `NSW`, `VIC`, `QLD`, `SA`, `WA`, `ACT`, `NT`, `TAS` (any subset is fine)
- **Row 0:** Sheet title (ignored)
- **Row 1:** Column headers (must include `STATION`, `LATITUDE`, `LONGITUDE`)
- **Rows 2+:** Station data

| Column | Required | Description |
|--------|----------|-------------|
| `STATION` | ✅ | Station name |
| `LATITUDE` | ✅ | Decimal latitude (negative for Australia) |
| `LONGITUDE` | ✅ | Decimal longitude |
| `ADDRESS` | optional | Street address |
| `LOCALITY` | optional | Suburb / postcode |
| `STATIONTYPE` | optional | e.g. Urban, Industrial, Airport |

---

## Nearest Fire Stations Module — How It Works

1. **Pre-filter:** All stations within the selected radius (straight-line Haversine distance) are identified. Default 100 km, configurable up to 500 km.
2. **Road routing:** The closest 15 pre-filtered stations are routed via the **OSRM public API** (OpenStreetMap) to get actual driving distance and estimated travel time.
3. **Rank & Display:** Stations are ranked by road distance; the top 5 are shown in a table and on an interactive Leaflet map with colour-coded route lines.

### Address input formats

- **Street address:** `123 Main St, Sydney` — geocoded via OpenStreetMap Nominatim
- **Coordinates:** `(-33.8688, 151.2093)` or `-33.8688, 151.2093`

---

© 2026 Fire Engineering Calculator — Sambit Kumar Biswal
