# Frontend Build Log

## 2026-02-01
- Created `frontend/` directory.
- Created `index.html`: Simple container for 500x500 canvas.
- Created `styles.css`: Dark mode pixel-art friendly styling.
- Created `app.js`: 
  - Handles WebSocket connection to `ws://localhost:3000/stream`.
  - Fetches initial state from `GET /canvas`.
  - Implements 16-color r/place palette.
  - Efficiently updates canvas via `fillRect` for single pixel updates.
  - Added mouse hover coordinate display.
