# High-Level Design — Wood Trading POS System

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      User's Browser                      │
│                                                          │
│   framegenai.cloud/WoodTracker/index.html                │
│   ┌────────────┐ ┌──────────┐ ┌───────────┐ ┌────────┐  │
│   │ Auth View  │ │Dashboard │ │   POS     │ │Inventory│  │
│   │ Login/OTP  │ │Charts    │ │Cart+Items │ │Reports │  │
│   └────────────┘ └──────────┘ └───────────┘ └────────┘  │
│                         │                               │
│              callGAS(action, params)                     │
│              fetch GET ?payload={...}                    │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────┐
│           Google Apps Script Web App                     │
│           (script.google.com/.../exec)                   │
│                                                          │
│   doGet(e)  ──►  routeAction(data)                       │
│                       │                                  │
│      ┌────────────────┼──────────────────┐               │
│      ▼                ▼                  ▼               │
│  loginUser()    getSWRData()       processSale()         │
│  forgotPassword()                 resetPassword()        │
│                                                          │
│   LockService (concurrent write protection)              │
│   MailApp     (OTP email delivery)                       │
└─────────────────────────┬───────────────────────────────┘
                          │ SpreadsheetApp API
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Google Sheets                          │
│                                                          │
│  Users │ Wood_Stocks │ Sales │ Sale_Items │ Payments     │
│  Customers │ Expenses │ Categories │ Suppliers │ ...     │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Component Breakdown

### 2.1 Frontend (index.html)

A single-page application with no build step. All logic runs in the browser.

| Component | Description |
|-----------|-------------|
| Auth View | Login form and forgot-password/OTP flow. Overlays the entire screen until authenticated. |
| Sidebar Navigation | Links to Dashboard, POS, Inventory, Reports. Collapsible. Hidden items based on role. |
| Topbar | Displays logged-in user name and role. Logout button. |
| Dashboard View | Four KPI cards + two Chart.js canvases (line + doughnut). |
| POS View | Two-column layout: wood item grid (left) and cart panel (right). |
| Inventory View | jQuery DataTable with server-synced wood stock data. |
| Reports View | jQuery DataTable with sales history. |
| Custom Modal | Reusable notification/confirmation overlay replacing browser alerts. |

**Key libraries:**
- jQuery 3.7.0 — DOM manipulation and DataTables dependency
- DataTables 1.13.6 — Paginated, searchable tables
- Chart.js — Dashboard charts
- Native `fetch` — API communication

### 2.2 Backend (Code.gs)

A single Google Apps Script file acting as an HTTP API.

| Function | Role |
|----------|------|
| `doGet(e)` | Entry point. Routes to `routeAction` if `?payload` param present; otherwise serves `index.html` |
| `doPost(e)` | Alternative entry point for direct POST calls; routes to same `routeAction` |
| `routeAction(data)` | Switch-based router dispatching to the correct function by `data.action` |
| `loginUser` | Email + password authentication against Users sheet |
| `forgotPassword` | Generates OTP, writes to sheet, sends via `MailApp` |
| `resetPassword` | Validates OTP, updates password in sheet |
| `getSWRData` | Bulk-fetches all data needed by the frontend in one call |
| `processSale` | Atomic write: Sales + Sale_Items + Payments + stock deduction + activity log |
| `getRowsAsObjects` | Utility: converts sheet rows to array of objects keyed by header row |
| `setupDemoData` | One-time setup: creates all sheets and seeds demo records |

### 2.3 Data Store (Google Sheets)

14 sheets acting as relational tables. No native foreign key enforcement — relationships are maintained by the application layer.

---

## 3. Data Flow

### Login Flow
```
Browser → callGAS('loginUser', {email, password})
        → GET ?payload={"action":"loginUser","email":"...","password":"..."}
        → doGet → routeAction → loginUser()
        → Sheets: read Users sheet, find matching row
        → Return {success, user: {id, name, role, email}}
        → Browser: store in localStorage, hide auth view, load dashboard
```

### Sale Processing Flow
```
Browser → processPOS() → callGAS('processSale', {payload, userId, role})
        → doGet → routeAction → processSale()
        → LockService.waitLock(10000)
        → Sheets: append Sales row
        → Sheets: append Sale_Items rows
        → Sheets: deduct qty from Wood_Stocks
        → Sheets: append Payments row (if paid > 0)
        → Sheets: append Activity_Logs row
        → LockService.releaseLock()
        → Return {success, sale_id}
        → Browser: clear cart, trigger SWR revalidation
```

### SWR Cache Flow
```
Browser login → initSWR()
  ├── appData in localStorage? → repaintApp() immediately (instant UI)
  └── fetchSWRData() always → background GET to getSWRData
                            → update localStorage
                            → repaintApp() with fresh data
```

---

## 4. Security Model

| Concern | Current Approach |
|---------|-----------------|
| Authentication | Email + plaintext password matched in Users sheet |
| Session | User object stored in browser `localStorage`; no server-side session |
| Authorization | Role checked on both frontend (UI hiding) and backend (`processSale` role check) |
| OTP | 6-digit numeric, 10-minute expiry, stored in Users sheet, cleared on use |
| Concurrent Writes | `LockService.getScriptLock()` prevents race conditions on sales and password resets |
| CORS | Apps Script serves with `Access-Control-Allow-Origin: *` for "Anyone" deployments |

**Known limitations:**
- Passwords stored in plaintext in Google Sheets
- No HTTPS-enforced token or JWT — localStorage session can be forged
- Role enforcement only on `processSale`; other endpoints accept any authenticated role

---

## 5. Deployment Model

| Layer | Technology | Host |
|-------|-----------|------|
| Frontend | HTML/CSS/JS (single file) | framegenai.cloud/WoodTracker/ |
| Backend API | Google Apps Script | script.google.com (Google infrastructure) |
| Database | Google Sheets (14 tabs) | Google Drive |
| Email | Google MailApp | Gmail SMTP via Apps Script |

**Deployment process:**
1. Edit `Code.gs` in Apps Script editor
2. Create a new deployment version (Deploy → Manage deployments → New version)
3. Upload updated `index.html` to web server
4. `BACKEND_URL` in `index.html` must match the current Apps Script `/exec` URL

---

## 6. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| GET instead of POST for API calls | Cross-origin POST to Apps Script redirects to a GET at `script.googleusercontent.com`, causing `doPost` to never fire. Using GET with `?payload=` avoids this. |
| Single `getSWRData` call | Fetches all 7 collections in one round trip instead of separate calls per view, reducing latency and Apps Script quota usage. |
| `LockService` on writes | Google Sheets has no native transaction support; script-level locking prevents partial writes under concurrent access. |
| `localStorage` session | Avoids requiring re-login on page refresh without any server-side session infrastructure. |
| Custom modal over `alert()` | `alert()` is blocked in cross-origin iframes and is visually inconsistent; custom modal stays within the app's design system. |
