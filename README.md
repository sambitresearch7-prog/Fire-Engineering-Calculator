# 🔥 Fire Engineering Calculator

A browser-based fire safety engineering toolkit covering nine calculation modules — from heat radiation and sprinkler activation to compartment burnout and live station routing. No installation required; all calculations run entirely client-side.

> **Developed by Sambit Kumar Biswal, 2026**
> Standards: SFPE Handbook (5th Ed.) · PD 7974-1:2019 · ISO 16733-1 · EN 1991-1-2 · Buchanan (2008) · Drysdale (2011)

---

## Table of Contents

- [Overview](#overview)
- [Files](#files)
- [Deployment](#deployment)
  - [Option A — GitHub Pages (static)](#option-a--github-pages-static)
  - [Option B — Python Server (persistent DB updates)](#option-b--python-server-persistent-db-updates)
- [Modules](#modules)
  - [1. Window Radiation](#1-window-radiation)
  - [2. Sprinkler Activation](#2-sprinkler-activation)
  - [3. Detector Activation](#3-detector-activation)
  - [4. Fire Severity](#4-fire-severity)
  - [5. Occupant Movement](#5-occupant-movement)
  - [6. Compartment Burnout](#6-compartment-burnout)
  - [7. FDS Mesh Size](#7-fds-mesh-size)
  - [8. Smoke Layer Height](#8-smoke-layer-height)
  - [9. Nearest Fire Stations](#9-nearest-fire-stations)
- [Nearest Fire Stations — Deep Dive](#nearest-fire-stations--deep-dive)
- [Updating the Station Database](#updating-the-station-database)
- [Excel Format Requirements](#excel-format-requirements)
- [Third-Party Libraries](#third-party-libraries)
- [Disclaimer](#disclaimer)

---

## Overview

The Fire Engineering Calculator is a single-page web application providing nine modules used in fire safety engineering assessments. It is fully self-contained — the only runtime dependencies are CDN-hosted libraries (Chart.js, Leaflet.js, SheetJS). All calculation logic lives in `calc.js`; the station database is embedded directly in that file.

The tool supports two usage modes:

- **Static / offline** — open `index.html` directly in a browser or host on any static server (e.g. GitHub Pages). The 605-station database is baked in; Excel uploads update the session only.
- **Server mode** — run `server.py` (Flask) to enable persistent database updates via the REST API.

---

## Files

| File | Purpose |
|---|---|
| `index.html` | Main UI — all 9 module tabs |
| `style.css` | Stylesheet (IBM Plex Sans / Mono, CSS variables, responsive grid) |
| `calc.js` | All calculation logic + embedded fire station database |
| `server.py` | Optional Python/Flask backend for persistent database updates |
| `README.md` | This file |
| `Australia_Urban_Fire_Stations_All_States.xlsx` | Source Excel file for station data (optional, for re-uploads) |

---

## Deployment

### Option A — GitHub Pages (static)

1. Push `index.html`, `style.css`, and `calc.js` to a GitHub repository.
2. Go to **Settings → Pages → Deploy from branch → main / root**.
3. The site is live at `https://<username>.github.io/<repo>/`.

The 605-station database is baked into `calc.js` and always available. Excel uploads in the browser update the active session only; reloading the page resets to the built-in dataset.

### Option B — Python Server (persistent DB updates)

The Flask server serves all static files and exposes a REST endpoint that patches `calc.js` on disk, so uploaded station databases persist across page reloads and for all visitors.

**Installation:**

```bash
pip install flask openpyxl pandas
```

**Run:**

```bash
python server.py
# Open http://localhost:5000
```

**REST API:**

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Serve `index.html` |
| `GET` | `/<filename>` | Serve any static file |
| `POST` | `/api/upload-stations` | Upload new Excel, patch `calc.js` |
| `GET` | `/api/stations` | Return current station list as JSON |

**Upload endpoint example:**

```
POST /api/upload-stations
Content-Type: multipart/form-data
Field: file (.xlsx)
```

Success response:
```json
{ "ok": true, "count": 612, "msg": "Successfully loaded 612 stations. calc.js has been updated — reload the browser page." }
```

Error response:
```json
{ "ok": false, "error": "Sheet 'QLD' is missing columns: LATITUDE" }
```

---

## Modules

### 1. Window Radiation

**Tab:** Window Radiation

Calculates incident heat flux at a target point from a fire compartment window using the **solid flame radiation method** (ISO 16733-1, SFPE Handbook).

**Inputs:**

| Parameter | Symbol | Unit | Description |
|---|---|---|---|
| Window width | a | m | Horizontal dimension of the opening |
| Window height | b | m | Vertical dimension of the opening |
| Separation distance | d | m | Perpendicular distance from wall to target |
| Flame temperature | Tf | K | Typical range 1073–1473 K (800–1200°C) |
| Ambient temperature | T∞ | K | Typically 293 K (20°C) |
| Flame emissivity | εf | — | 0–1.0; typically 1.0 |
| Screen effectiveness | — | % | Optional; reduces incident flux |

**Outputs:** View factor F, window area, incident heat flux q″ (kW/m²), attenuated flux (if screen enabled), colour-coded safety classification.

**Formula:**

```
q'' = εf · σ · F · (Tf⁴ − T∞⁴)

F = (2/π) · [ X/√(1+X²) · tan⁻¹(Y/√(1+X²)) + Y/√(1+Y²) · tan⁻¹(X/√(1+Y²)) ]

where X = a/(2d),  Y = b/(2d),  σ = 5.67 × 10⁻¹¹ kW/m²K⁴
```

**Safety thresholds:**

| Heat Flux | Classification |
|---|---|
| ≥ 12.5 kW/m² | ⛔ Spontaneous ignition risk |
| ≥ 4.0 kW/m² | ⚠ Piloted ignition possible |
| ≥ 1.5 kW/m² | ⚠ Above safe separation threshold |
| < 1.5 kW/m² | ✓ Within safe criteria |

A schematic diagram (plan view + elevation view) is rendered live as inputs change.

---

### 2. Sprinkler Activation

**Tab:** Sprinkler Activation

Calculates the activation time of a ceiling sprinkler head under a growing (t²) fire using **Alpert's ceiling jet correlation** (SFPE Handbook).

**Inputs:** Fire growth time tg (s), combustion efficiency χc, ceiling height Hc (m), fuel height Hf (m), sprinkler spacing (X × Y in m), ambient temperature To (°C), activation temperature Te (°C), Response Time Index RTI (m½s½). Option to evaluate the second-row sprinkler.

**Outputs:** Activation time (s), HRR at activation (kW), radial distance R from plume axis (m). Two charts: gas vs. detector temperature over time, and HRR vs. time.

---

### 3. Detector Activation

**Tab:** Detector Activation

Uses the same Alpert ceiling jet engine as the sprinkler module, with an additional **conductance factor C** for heat detector lag. Evaluates first-row detector position only.

**Inputs:** Same as Module 2, plus conductance factor C (m½s⁻½, typically 0–1.0 for standard detectors).

**Outputs:** Activation time, HRR at activation, radial distance. Same two-chart display.

---

### 4. Fire Severity

**Tab:** Fire Severity

Calculates equivalent fire severity (time-equivalent) using three parallel methods: **Law (1983)**, **CIB (1986)**, and **Eurocode (EN 1991-1-2 Annex F)**.

**Inputs:** Floor area Af (m²), total enclosure surface area At (m²), compartment height H (m), vertical opening area Av (m²), mean opening height heq (m), horizontal opening area Ah (m²), glass breakage percentage, fire load density qfd (MJ/m²), heat of combustion Hc (MJ/kg), thermal inertia b (J/m²s½K).

**Outputs:** Time-equivalent fire severity Ted (minutes) from each of the three methods, along with intermediate computed parameters (K, Lfk, c, w, Kb, bv, wf).

---

### 5. Occupant Movement

**Tab:** Occupant Movement

Estimates egress time using the **hydraulic (Predtechenskii & Milinskii / SFPE)** flow model.

**Inputs:** Enclosure dimensions Lr × Wr (m), travel distance Lt (m), exit types (doors/stairs/ramps) and counts, number of occupants No, unimpeded travel speed S (m/s), cumulative exit width W (m).

**Outputs:** Occupant density Do, effective exit width We, specific flow Fs, actual flow Fa, travel time Ttr, queuing time TQ, and total movement time Tm (seconds and minutes). A scaled plan-view diagram of the enclosure and exits is rendered.

---

### 6. Compartment Burnout

**Tab:** Compartment Burnout

Calculates the **burnout time** of a fully-involved fire compartment using the ventilation-controlled burning rate formula.

**Inputs:** Compartment dimensions Lf × Wf × H (m), window dimensions h × w (m), fuel load density ef (MJ/m²), heat of combustion Hc (MJ/kg).

**Outputs:** Floor area Af, opening area Av, total surface area At, total fuel load Q (MJ), fuel mass m (kg), ventilation-limited burning rate ṁb (kg/s), burnout duration tb in both seconds and minutes. An oblique 3D projection of the compartment with the window is rendered.

**Burning rate formula:**

```
ṁb = 0.092 · Av · √h
tb  = m / ṁb
```

---

### 7. FDS Mesh Size

**Tab:** FDS Mesh Size

Calculates the **characteristic fire diameter D\*** and recommends FDS cell sizes for coarse, medium, and fine simulations.

**Inputs:** Heat release rate Q (kW), air density ρ (kg/m³), specific heat cp (kJ/kg·K), gravity g (m/s²), ambient temperature T (K), proposed cell size dx (m).

**Outputs:** D* (m), D*/dx resolution ratio, and recommended cell sizes for coarse (D*/dx = 4), medium (D*/dx = 10), and fine (D*/dx = 16) meshes. A chart of cell size vs. HRR for all three quality levels is displayed.

**Formula:**

```
D* = [ Q / (ρ · cp · T · √g) ]^0.4
```

**Resolution quality guide:**

| D*/dx | Classification |
|---|---|
| < 4 | Very Coarse |
| 4–9 | Coarse |
| 10–15 | Medium |
| ≥ 16 | Fine |

---

### 8. Smoke Layer Height

**Tab:** Smoke Layer Height

Calculates the time for a smoke layer to descend to a critical height, based on **Drysdale (2011)** / PD 7974-1:2019 smoke filling equations.

**Inputs:** Floor area A (m²), DTS ceiling height Hd (m), performance ceiling height Hp (m), target smoke-free height y (m), gravity g (m/s²), fire dimensions L × W (m). Fire size can be taken from a built-in table (by building class and sprinkler status) or entered manually.

**Outputs:** Fire perimeter Pf (m), DTS descent time Td (s), performance descent time Tp (s), and time gain ΔT = Tp − Td (s). A chart of smoke layer height vs. time for both ceiling scenarios is displayed.

---

### 9. Nearest Fire Stations

**Tab:** 🚒 Nearest Fire Stations

Finds and maps the five nearest Australian urban fire stations to any address or coordinate, using real road routing.

See [Nearest Fire Stations — Deep Dive](#nearest-fire-stations--deep-dive) below for full details.

---

## Nearest Fire Stations — Deep Dive

### How it works

**Step 1 — Geocoding:** Enter a street address (e.g. `123 Main St, Sydney`) or decimal coordinates (e.g. `-33.8688, 151.2093`). Addresses are geocoded via the OpenStreetMap Nominatim API.

**Step 2 — Pre-filter:** All stations in the built-in database within the selected radius (50 / 100 / 200 / 500 km) are identified using the Haversine straight-line distance formula. Up to 15 candidates are forwarded to routing.

**Step 3 — Road routing:** Each candidate station is routed to the site via the **OSRM public API** (OpenStreetMap) to obtain actual driving distance (km) and estimated travel time.

**Step 4 — Rank and display:** Stations are ranked by driving distance. The top 5 are shown in a results table and on an interactive **Leaflet** map with colour-coded route lines.

### Map features

- **Colour-coded routes** — each of the five stations has a distinct route colour (red, blue, orange, green, purple), drawn with a glow halo and dot markers.
- **Draggable site pin** — drag the red site marker to a new location; routes are automatically recalculated.
- **Draggable station pins** — drag any numbered station pin to correct its mapped position; the affected route updates immediately.
- **Show / Hide toggles** — after results load, individual station routes and pins can be toggled on/off using the checkboxes in the "Show / Hide Routes on Map" panel below the results table.
- **Station popups** — click any station pin to see its name, address, state, type, position source (geocoded vs. coordinate), driving distance, and estimated travel time.

### Address input formats

```
123 Main St, Sydney
Martin Place, Sydney NSW 2000
-33.8688, 151.2093
(-33.8688, 151.2093)
```

---

## Updating the Station Database

The built-in database contains **605 Australian urban fire stations** across all states and territories. It can be updated without editing any code.

### Session-only update (GitHub Pages / static)

1. Open the **🚒 Nearest Fire Stations** tab.
2. Under *Update Station Database*, select a `.xlsx` file and click **Upload & Apply**.
3. SheetJS parses the file in the browser. The new stations are used for the session; reloading the page resets to the 605-station built-in database.

### Persistent update (Python server)

Same steps as above. The server receives the file at `POST /api/upload-stations`, validates it, patches `FS_BUILTIN_STATIONS` inside `calc.js` on disk, and saves a copy as `fire_stations.xlsx`. All subsequent page loads use the new data.

---

## Excel Format Requirements

The upload file must follow this structure exactly:

- **Sheet names:** `NSW`, `VIC`, `QLD`, `SA`, `WA`, `ACT`, `NT`, `TAS` (any subset is accepted)
- **Row 0:** Sheet title (ignored)
- **Row 1:** Column headers (must include `STATION`, `LATITUDE`, `LONGITUDE`)
- **Rows 2+:** Station data

| Column | Required | Description |
|---|---|---|
| `STATION` | ✅ | Station name |
| `LATITUDE` | ✅ | Decimal degrees (negative for Australia, e.g. `-33.8688`) |
| `LONGITUDE` | ✅ | Decimal degrees (e.g. `151.2093`) |
| `ADDRESS` | optional | Street address (used for geocoding) |
| `LOCALITY` | optional | Suburb or postcode |
| `STATIONTYPE` | optional | e.g. Urban, Industrial, Airport |

Rows with missing or non-numeric latitude/longitude are silently skipped.

---

## Third-Party Libraries

All loaded from CDN; no local installation needed.

| Library | Version | Purpose |
|---|---|---|
| [Chart.js](https://www.chartjs.org/) | 4.4.1 | Temperature, HRR, FDS, and smoke layer charts |
| [Leaflet.js](https://leafletjs.com/) | 1.9.4 | Interactive route map in the fire stations module |
| [SheetJS (xlsx)](https://sheetjs.com/) | 0.18.5 | Client-side Excel parsing for database uploads |
| [OpenStreetMap Nominatim](https://nominatim.org/) | — | Address geocoding and reverse geocoding |
| [OSRM](https://project-osrm.org/) | — | Road routing and driving distance |
| [IBM Plex Sans / Mono](https://fonts.google.com/specimen/IBM+Plex+Sans) | — | UI typography (Google Fonts) |

---

## Disclaimer

This tool is intended to **assist** qualified fire safety engineers in preliminary calculations and design checks. Results should always be verified against applicable codes and standards, and reviewed by a competent practitioner before being used in any formal fire engineering report or building permit submission. The authors accept no liability for decisions made solely on the basis of outputs from this tool.

---

*© 2026 Fire Engineering Calculator — Sambit Kumar Biswal*
