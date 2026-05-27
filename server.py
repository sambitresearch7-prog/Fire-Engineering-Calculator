#!/usr/bin/env python3
"""
Fire Engineering Calculator — Backend Server
Serves static files and provides an endpoint to upload an updated
fire station Excel database, which regenerates the embedded JS data.

Usage:
    pip install flask openpyxl pandas
    python server.py

Then open http://localhost:5000 in your browser.
"""

import json
import os
import re
import shutil
from pathlib import Path

import pandas as pd
from flask import Flask, jsonify, request, send_from_directory

app = Flask(__name__, static_folder=".")

BASE_DIR = Path(__file__).parent
CALC_JS  = BASE_DIR / "calc.js"
EXCEL_DB = BASE_DIR / "fire_stations.xlsx"   # saved copy of latest upload

# ─── Marker in calc.js that wraps the embedded station array ────────────────
JS_MARKER_START = "const FS_BUILTIN_STATIONS = "
JS_MARKER_END   = ";"   # ends at the first semicolon after the opening bracket


def read_stations_from_excel(path: Path) -> list[dict]:
    """Parse an Excel file and return a list of station dicts."""
    xl   = pd.ExcelFile(path)
    rows = []
    state_sheets = [s for s in xl.sheet_names if s in
                    ("NSW", "VIC", "QLD", "SA", "WA", "ACT", "NT", "TAS")]
    if not state_sheets:
        raise ValueError(
            "No recognised state sheets found. "
            "Sheets must be named NSW, VIC, QLD, SA, WA, ACT, NT or TAS."
        )

    for state in state_sheets:
        df = pd.read_excel(xl, sheet_name=state, header=0)
        # Row 0 is a title row; row 1 contains the real column headers
        df.columns = df.iloc[0].astype(str).str.strip().str.upper()
        df = df.iloc[1:].reset_index(drop=True)

        required = {"STATION", "LATITUDE", "LONGITUDE"}
        missing  = required - set(df.columns)
        if missing:
            raise ValueError(
                f"Sheet '{state}' is missing columns: {', '.join(missing)}"
            )

        df = df[df["LATITUDE"].notna() & df["LONGITUDE"].notna()]

        def safe(row, col):
            v = row.get(col, "")
            return str(v).strip() if pd.notna(v) else ""

        for _, row in df.iterrows():
            try:
                lat = float(row["LATITUDE"])
                lon = float(row["LONGITUDE"])
            except (ValueError, TypeError):
                continue
            rows.append(
                {
                    "name":     safe(row, "STATION"),
                    "address":  safe(row, "ADDRESS"),
                    "locality": safe(row, "LOCALITY"),
                    "type":     safe(row, "STATIONTYPE"),
                    "state":    state,
                    "lat":      round(lat, 6),
                    "lon":      round(lon, 6),
                }
            )
    return rows


def patch_calc_js(stations: list[dict]) -> None:
    """Replace the embedded station array inside calc.js in-place."""
    src = CALC_JS.read_text(encoding="utf-8")

    # Find the start position of the assignment
    idx_start = src.find(JS_MARKER_START)
    if idx_start == -1:
        raise RuntimeError(
            f"Could not find '{JS_MARKER_START}' in calc.js. "
            "Has the file been manually edited?"
        )

    # The JSON array starts right after the marker
    arr_start = idx_start + len(JS_MARKER_START)
    if src[arr_start] != "[":
        raise RuntimeError("Expected '[' immediately after FS_BUILTIN_STATIONS = ")

    # Walk forward to find the matching ']'
    depth = 0
    arr_end = arr_start
    for i in range(arr_start, len(src)):
        if src[i] == "[":
            depth += 1
        elif src[i] == "]":
            depth -= 1
            if depth == 0:
                arr_end = i
                break

    # Build new source: everything before array + new array + rest
    new_json = json.dumps(stations, separators=(",", ":"))
    new_src  = src[:arr_start] + new_json + src[arr_end + 1:]

    # Atomic write via temp file
    tmp = CALC_JS.with_suffix(".js.tmp")
    tmp.write_text(new_src, encoding="utf-8")
    tmp.replace(CALC_JS)


# ─── Routes ─────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return send_from_directory(str(BASE_DIR), "index.html")


@app.route("/<path:filename>")
def static_files(filename):
    return send_from_directory(str(BASE_DIR), filename)


@app.route("/api/upload-stations", methods=["POST"])
def upload_stations():
    """
    POST /api/upload-stations
    Accepts a multipart/form-data upload with field name 'file'.
    Validates the Excel, replaces the embedded JS array, and saves a backup copy.
    """
    if "file" not in request.files:
        return jsonify({"ok": False, "error": "No file field in request"}), 400

    f = request.files["file"]
    if not f.filename.lower().endswith((".xlsx", ".xls")):
        return jsonify({"ok": False, "error": "Only .xlsx files are accepted"}), 400

    # Save to a temp path first so we can parse before committing
    tmp_path = BASE_DIR / "_upload_tmp.xlsx"
    f.save(str(tmp_path))

    try:
        stations = read_stations_from_excel(tmp_path)
        if not stations:
            raise ValueError("The file contained no usable station rows.")

        # Patch calc.js
        patch_calc_js(stations)

        # Keep a backup of the uploaded file
        shutil.move(str(tmp_path), str(EXCEL_DB))

        return jsonify(
            {
                "ok":    True,
                "count": len(stations),
                "msg":   (
                    f"Successfully loaded {len(stations)} stations. "
                    "calc.js has been updated — reload the browser page."
                ),
            }
        )
    except Exception as exc:
        tmp_path.unlink(missing_ok=True)
        return jsonify({"ok": False, "error": str(exc)}), 422


@app.route("/api/stations", methods=["GET"])
def list_stations():
    """Return the current station list as JSON (useful for debugging)."""
    src = CALC_JS.read_text(encoding="utf-8")
    idx = src.find(JS_MARKER_START)
    if idx == -1:
        return jsonify([])
    arr_start = idx + len(JS_MARKER_START)
    depth, arr_end = 0, arr_start
    for i in range(arr_start, len(src)):
        if src[i] == "[":
            depth += 1
        elif src[i] == "]":
            depth -= 1
            if depth == 0:
                arr_end = i
                break
    return app.response_class(
        response=src[arr_start : arr_end + 1],
        status=200,
        mimetype="application/json",
    )


if __name__ == "__main__":
    print("=" * 60)
    print("Fire Engineering Calculator — Server")
    print("Open http://localhost:5000 in your browser")
    print("Upload a new Excel DB at POST /api/upload-stations")
    print("=" * 60)
    app.run(debug=True, port=5000)
