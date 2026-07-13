# Technical Specification & Requirements Sheet

## Data Schema & Processing Flow

### 1. Remote Data Sources
- **Theory Schedule URL:** `https://timetable-viewer-3952776694.vercel.app/data/theory_schedule.json`
- **Lab Schedule URL:** `https://timetable-viewer-3952776694.vercel.app/data/lab_schedule.json`

### 2. Normalization Engine (`lib/parser.js`)
- **Action:** Downloads files if missing, standardizes day labels (e.g. `wed` -> `Wednesday`, `thur` -> `Thursday`), and aggregates unique lists of Departments, Semesters, and Teachers.
- **Output:** Writes unified layout to `/data/master.json` containing:
  - `departments`: String array of unique departments sorted alphabetically.
  - `semesters`: Numeric array of unique semesters sorted.
  - `subjects` & `labs`: Aggregated course listings. Each course maps to its available list of teachers and schedule slots.

### 3. Mathematical Time & Conflict Representation
- **Formula:** Overlap exists between slot 1 and slot 2 if:
  $$\max(S_1, S_2) < \min(E_1, E_2)$$
  where $S_i, E_i$ represent the start and end times calculated in **minutes from midnight** (standardizing afternoons/PM by adding 12 to hours from 1 to 7).

## Endpoint Registries

### 1. Home / Page 1 (`routes/home.js`)
- `GET /` - Fetches departments/semesters from `master.json` and saved files from `/data/saved`, rendering the master selector.

### 2. Timetable Workspace / Page 2 (`routes/select.js`)
- `GET /select` - Accepts query parameters `department`, `semester`, and `savedId` (optional), rendering the dual-column layout.
- `POST /select/preview` - AJAX endpoint receiving the current user selection payload as JSON, compiling the active slots, checking conflicts, and returning compiled EJS HTML fragments.

### 3. State Persistence (`routes/save.js`)
- `POST /save` - Receives active selections, writes a new UUID file `/data/saved/{uuid}.json`.
- `DELETE /save/:id` - Deletes a specific saved schedule.

### 4. Binary Exporters (`routes/export.js`)
- `POST /export/pdf` - Generates vector PDF document via PDFKit.
- `POST /export/excel` - Generates a styled spreadsheet with cell borders and fills via ExcelJS.
- `POST /export/ics` - Generates raw iCalendar standard file containing weekly recurring calendar events.

## UI Design Grid Specification
- **System:** CSS Grid layout on a 7-column schema.
- **Columns:** Time (90px), Monday (1fr), Tuesday (1fr), Wednesday (1fr), Thursday (1fr), Friday (1fr), Saturday (1fr).
- **Rows:** 1 header row (45px) + 9 time-slot rows (100px each or 65px on compact view).
- **Interactive Layers:** Multi-hour lab slots are mathematically projected onto the grid rows and rendered using CSS Grid `grid-row` merging (e.g. `grid-row: 4 / 6` for a double slot).
