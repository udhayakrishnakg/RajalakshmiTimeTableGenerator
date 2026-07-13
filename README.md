# University Teacher Timetable Generator

A modern, production-ready, full-stack Node.js web application designed to automatically fetch university schedules, normalize them into a unified local data layout, and provide an interactive, single-view workspace to generate class schedules with live conflict-detection and detailed statistics.

## Tech Stack
- **Backend:** Node.js, Express.js, EJS Templates, `express-ejs-layouts`
- **Frontend:** Bootstrap 5, Bootstrap Icons, Vanilla JS, Google Fonts
- **Storage:** Local JSON file persistence (`/data/saved/` selections using UUIDs)
- **Export Formats:** PDF (`pdfkit`), Excel (`exceljs`), ICS Calendar subscriptions, PNG captures (`html-to-image`)

## Key Capabilities
- **Automated Data Normalization:** On startup, the server automatically downloads raw theory and lab schedule files from remote Vercel endpoints and normalizes them into a highly optimized index `data/master.json`.
- **Live Interactive Timetable Grid:** Features CSS Grid cells which dynamically merge multi-hour lab sessions and adapt padding depending on whether "Compact View" is enabled.
- **Microsecond Conflict Checking:** Identifies overlapping day/time slots using an exact mathematical overlap check (`Math.max(start1, start2) < Math.min(end1, end2)`) across all selections.
- **Rich Schedule Statistics:** Instant computation of metrics such as theory/lab hour sums, free study periods, earliest starts/latest ends, and the longest daily gap between classes.
- **Client & Server Exporters:**
  - **PDF Export:** Generates vector grid layouts with cell styling using PDFKit.
  - **Excel Export:** Creates spreadsheet files containing correct colors and grid borders using ExcelJS.
  - **ICS Calendar Export:** Generates standard `.ics` recurring events (`FREQ=WEEKLY`) for calendar syncing.
  - **PNG Export:** Converts the live DOM element directly into a PNG image using `html-to-image`.

## Setup and Run
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the application:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000` inside your browser.
