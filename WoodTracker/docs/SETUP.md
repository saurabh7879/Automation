# Setup Guide — Wood Trading POS System

## Prerequisites

- A Google account (for Google Sheets + Apps Script)
- Access to your web server (to upload `index.html`)
- A modern browser (Chrome, Firefox, or Edge)

---

## Step 1 — Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a **New spreadsheet**
2. Name it something like `Wood Trading POS - Database`
3. Copy the URL — you will need the Spreadsheet ID from it later

> The Spreadsheet ID is the long string in the URL:
> `https://docs.google.com/spreadsheets/d/`**`SPREADSHEET_ID`**`/edit`

---

## Step 2 — Create the Google Apps Script Project

1. With your spreadsheet open, click **Extensions → Apps Script**
2. A new Apps Script project opens, bound to your spreadsheet
3. Rename the project to `Wood Trading POS`

---

## Step 3 — Add the Code Files

### Code.gs

1. In the Apps Script editor, click on `Code.gs` in the left panel
2. Delete all existing content
3. Paste the full contents of `WoodTracker/Code.gs` from this repository
4. Click **Save** (Ctrl+S)

### index.html

1. Click the **+** button next to "Files" in the left panel
2. Choose **HTML**
3. Name it exactly `index` (do not add `.html` — Apps Script adds it automatically)
4. Delete all default content
5. Paste the full contents of `WoodTracker/index.html`
6. Click **Save**

---

## Step 4 — Authorize the Script

The script needs permission to access Google Sheets and send emails.

1. In the function dropdown (top toolbar), select `setupDemoData`
2. Click **Run**
3. A dialog appears: **"Authorization required"** → click **Review permissions**
4. Choose your Google account
5. You may see **"Google hasn't verified this app"** → click **Advanced → Go to Wood Trading POS (unsafe)**
6. Click **Allow**

> This authorization is one-time. It grants the script access to Sheets and Gmail on your behalf.

---

## Step 5 — Seed Demo Data

After authorization completes, `setupDemoData` runs automatically. Check the execution log at the bottom of the editor — you should see:

```
{ success: true, message: "Demo Data Setup Complete." }
```

This creates all 14 sheets in your spreadsheet and populates them with demo records:

| Sheet | Demo Records |
|-------|-------------|
| Users | 4 users (admin, manager, cashier, warehouse) |
| Wood_Stocks | 3 stock items (W-001, W-002, W-003) |
| Customers | 2 customers |
| Sales | 2 historical sales |
| Expenses | 2 expense entries |
| Others | Empty (ready for real data) |

> **Warning:** Running `setupDemoData` again will **clear and recreate all sheets**. Only run it once during initial setup or to fully reset the database.

---

## Step 6 — Deploy as Web App

1. In the Apps Script editor, click **Deploy → New deployment**
2. Click the gear icon next to "Select type" → choose **Web app**
3. Fill in the settings:
   - **Description:** `v1` (or any label)
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
4. Click **Deploy**
5. Copy the **Web app URL** — it looks like:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```

> Save this URL — you need it in the next step.

---

## Step 7 — Configure the Frontend

Open `WoodTracker/index.html` and find line ~293:

```javascript
const BACKEND_URL = 'PASTE_YOUR_APPS_SCRIPT_URL_HERE';
```

Replace the placeholder with your actual Apps Script URL:

```javascript
const BACKEND_URL = 'https://script.google.com/macros/s/AKfycb.../exec';
```

Save the file.

---

## Step 8 — Upload to Your Web Server

Upload the updated `index.html` to your web server at the path where you want the app to be accessible.

**Example:** To serve it at `https://framegenai.cloud/WoodTracker/`, upload `index.html` to the `WoodTracker/` directory on your server.

No other files need to be uploaded — all dependencies (jQuery, DataTables, Chart.js) are loaded from CDN.

---

## Step 9 — Verify the Setup

Open your web app URL in a browser. Test with the demo credentials:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | admin123 |
| Manager | manager@example.com | manager123 |
| Cashier | cashier@example.com | cashier123 |
| Warehouse | warehouse@example.com | warehouse123 |

**Checklist:**
- [ ] Login succeeds and shows dashboard
- [ ] Dashboard cards show sales and expense totals
- [ ] POS tab shows wood stock cards
- [ ] Adding items to cart updates total
- [ ] Completing a sale shows success modal
- [ ] Inventory tab shows the DataTable
- [ ] Logout clears the session

---

## Updating the Code After Changes

Every time you edit `Code.gs`, you must create a **new deployment version** — Apps Script always serves the last deployed version, not the latest saved file.

1. Go to **Deploy → Manage deployments**
2. Click the **pencil (edit) icon** on your existing deployment
3. Change the version dropdown to **"New version"**
4. Click **Deploy**

> The `/exec` URL stays the same across versions — you do not need to update `index.html`.

---

## Troubleshooting

### "Verifying credentials..." modal stays open
The fetch request is not completing. Check:
- `BACKEND_URL` in `index.html` is set to the correct `/exec` URL (not the editor URL)
- The deployment exists and is set to **"Anyone"** access
- Open browser DevTools → Network tab → look for the failed request and inspect the response

### "Backend error: The page cannot be found"
The Apps Script deployment URL is wrong or has been deleted. Create a new deployment and update `BACKEND_URL`.

### "Backend error: The script has failed..."
An unhandled error occurred in `Code.gs`. Open the Apps Script editor → **Executions** (left panel) to see the error stack trace.

### JSON parse error on login
The Apps Script is returning HTML instead of JSON. Most common causes:
1. `BACKEND_URL` still contains the placeholder text
2. The deployment is not set to **Execute as: Me** + **Who has access: Anyone**
3. You edited the wrong deployment (check Manage deployments)

### OTP email not received
- Check spam folder
- The script must be authorized to use `MailApp` (re-run `setupDemoData` and re-authorize if needed)
- Gmail daily sending limits apply (~100 emails/day for free accounts)

### DataTables not loading
- Check browser console for CDN errors
- Ensure jQuery loads before DataTables (it does by default in the current HTML)

### Inventory/Reports table appears broken after navigating back
This is normal DataTables behaviour when reinitialising. The code already handles this with `.DataTable().destroy()` before reinit. If it persists, check the browser console for errors.

---

## Adding Real Users

To add staff accounts, open the **Users** sheet in your Google Spreadsheet and append a row:

```
id     | name         | email              | phone      | password  | role            | avatar_drive_id | is_active | created_at              | updated_at              | otp | otp_expires
u5     | New Cashier  | cashier2@your.com  | 5559999    | pass123   | cashier         |                 | TRUE      | 2026-05-08T00:00:00Z    | 2026-05-08T00:00:00Z    |     |
```

Valid roles: `admin`, `manager`, `cashier`, `warehouse_staff`

Set `is_active` to `TRUE` to allow login, `FALSE` to disable without deleting.

---

## File Reference

```
WoodTracker/
├── Code.gs          ← Google Apps Script backend (deploy to Apps Script)
├── index.html       ← Frontend SPA (upload to web server)
└── docs/
    ├── SETUP.md          ← This file
    ├── project_context.md
    ├── prd.md
    ├── hld.md
    └── lld.md
```
