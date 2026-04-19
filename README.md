# 🔥 Fire Engineering Calculator

A fully interactive web-based fire safety engineering calculator. Converted from a Python/tkinter desktop application.

## Live Demo

👉 **[Open Calculator](https://your-username.github.io/fire-calculator/)**

## Modules Included

| Module | Description | Reference |
|--------|-------------|-----------|
| **Window Radiation to Point** | Incident heat flux from fire compartment window (solid flame method) | ISO 16733-1, SFPE Handbook |
| **Sprinkler Activation (Alpert)** | Sprinkler activation time using Alpert's ceiling jet correlation | SFPE Handbook |
| **Detector Activation (Alpert)** | Heat/smoke detector activation time | SFPE Handbook |
| **Fire Severity (Time Equiv.)** | Time equivalence using Law, CIB, and Eurocode methods | EN 1991-1-2 |
| **Occupant Movement Time** | Evacuation travel & queueing time | Buchanan (2008), §11.7 |
| **Compartment Burnout** | Ventilation-controlled burn duration | Buchanan (2008), §6.3 |
| **FDS Mesh Size (D*)** | Optimal FDS mesh cell size via characteristic fire diameter | NIST FDS User's Guide |
| **Smoke Layer Height** | Smoke descent time for DTS vs Performance solutions | Drysdale (2011), §11.2.2 |

## How to Host on GitHub Pages

1. **Create a new repository** on GitHub (e.g., `fire-calculator`)
2. **Upload the three files** to the repository:
   - `index.html`
   - `style.css`
   - `calc.js`
3. Go to **Settings → Pages**
4. Under **Source**, select `main` branch and `/ (root)` folder
5. Click **Save** — your site will be live at `https://your-username.github.io/fire-calculator/`

## File Structure

```
fire-calculator/
├── index.html      # Main HTML with all UI tabs
├── style.css       # Stylesheet
├── calc.js         # All calculation logic (JavaScript)
└── README.md       # This file
```

## Technologies Used

- Pure **HTML5 / CSS3 / JavaScript** — no build tools required
- **Chart.js** (CDN) — for interactive plots
- **IBM Plex Sans & Mono** (Google Fonts) — typography

## References

- SFPE Handbook of Fire Protection Engineering (5th Ed.)
- PD 7974-1:2019
- ISO 16733-1:2015
- EN 1991-1-2 (Eurocode 1)
- Buchanan, A.H. (2008). *Fire Engineering Design Guide*, 3rd Ed.
- Drysdale, D. (2011). *An Introduction to Fire Dynamics*, 3rd Ed., Wiley.

## Developer

Sambit Kumar Biswal  
© 2026 Fire Engineering Calculator
