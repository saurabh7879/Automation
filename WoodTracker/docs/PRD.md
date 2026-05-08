# Product Requirements Document — Wood Trading POS System

## 1. Purpose

This document defines the functional and non-functional requirements for the Wood Trading POS System. It serves as the single source of truth for what the product must do.

---

## 2. User Personas

### Admin
- Full access to all modules
- Manages user accounts and system settings
- Views all financial reports

### Manager
- Access to POS, inventory, and reports
- Cannot manage users or system settings

### Cashier
- Access to POS module only
- Can process sales, select customers, and apply payment methods

### Warehouse Staff
- Read-only access to inventory
- Cannot process sales or view financial data

---

## 3. Functional Requirements

### 3.1 Authentication

| ID | Requirement |
|----|-------------|
| AUTH-01 | Users must log in with email and password |
| AUTH-02 | System must validate credentials against the Users sheet |
| AUTH-03 | Inactive users (`is_active = false`) must be denied login |
| AUTH-04 | Successful login must persist session in `localStorage` |
| AUTH-05 | Users can request a password reset via email OTP |
| AUTH-06 | OTP must be 6 digits and expire after 10 minutes |
| AUTH-07 | Users must provide email + valid OTP + new password to reset |
| AUTH-08 | Logout must clear all localStorage session data |

### 3.2 Dashboard

| ID | Requirement |
|----|-------------|
| DASH-01 | Display total sales amount across all sales records |
| DASH-02 | Display total expenses amount |
| DASH-03 | Display total unique customer count |
| DASH-04 | Display a line chart of sales amounts over time |
| DASH-05 | Display a doughnut chart of expense breakdown by title |
| DASH-06 | Dashboard data must load from the SWR cache on page entry |

### 3.3 POS (Point of Sale)

| ID | Requirement |
|----|-------------|
| POS-01 | Display all wood stock items with status `available` as clickable cards |
| POS-02 | Each card must show: serial, dimensions (width × length), sell rate, quantity |
| POS-03 | Clicking a card adds it to the cart; clicking again increments quantity |
| POS-04 | Cart must show item serial, rate, quantity, and line total |
| POS-05 | Cart must show running total |
| POS-06 | Users must select a customer before completing a sale |
| POS-07 | Users can filter wood cards by typing in the search box |
| POS-08 | Quick-pay buttons: Full Pay, Half Pay, Unpaid — auto-fill amount paid |
| POS-09 | Balance/Change field updates in real time as amount paid is typed |
| POS-10 | Payment method options: Cash, Bank Transfer, Card |
| POS-11 | Completing a sale must: write to Sales, Sale_Items, Payments sheets and deduct stock quantity |
| POS-12 | Sale status must be `completed` if fully paid, `partial` if partially paid, `pending` if unpaid |
| POS-13 | After a successful sale, cart must clear and data must revalidate |
| POS-14 | Warehouse staff must not have access to POS module |

### 3.4 Inventory

| ID | Requirement |
|----|-------------|
| INV-01 | Display all wood stock records in a paginated, searchable DataTable |
| INV-02 | Columns: Serial, Sub Category, Dimensions, CFT, Rate, Qty, Status |
| INV-03 | A "Sync Data" button must trigger a fresh fetch from the backend |

### 3.5 Reports

| ID | Requirement |
|----|-------------|
| REP-01 | Display all sales records in a paginated, searchable DataTable |
| REP-02 | Columns: Sale ID, Date, Amount, Status |
| REP-03 | Status badges must use colour coding (green = completed) |

### 3.6 Data Caching (SWR Pattern)

| ID | Requirement |
|----|-------------|
| SWR-01 | On login, immediately render cached data from `localStorage` if available |
| SWR-02 | Always trigger a background revalidation fetch after rendering cached data |
| SWR-03 | On revalidation success, update `localStorage` and repaint the active view |

---

## 4. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | Initial page load under 3 seconds on a standard connection |
| Availability | Dependent on Google Apps Script uptime (Google SLA) |
| Security | Credentials stored in Google Sheets; OTPs expire after 10 minutes |
| Scalability | Suitable for up to ~500 stock rows and ~10,000 sales records before Sheets performance degrades |
| Compatibility | Must work on Chrome, Firefox, Edge (latest versions); responsive for tablet use |
| Hosting | Frontend hosted on custom domain; backend on Google Apps Script |
| Data Integrity | `LockService` must prevent concurrent write conflicts on sales and password resets |

---

## 5. Out of Scope

- User creation / deletion UI (currently done directly in Sheets)
- Purchase order management beyond basic recording
- Stock image upload / management
- Multi-currency support
- Offline mode
- Print receipt functionality
- Mobile native app

---

## 6. Acceptance Criteria Summary

| Feature | Passing Condition |
|---------|-------------------|
| Login | Valid credentials → dashboard shown; invalid → error modal |
| Forgot Password | OTP email received within 60 seconds; expired OTP rejected |
| POS Sale | Sale row in Sheets; stock qty decremented; cart cleared |
| Partial Payment | Sale status set to `partial`; payment recorded |
| Inventory Sync | Clicking Sync fetches fresh data and repopulates table |
| Role Restriction | Warehouse staff cannot see POS nav item |
| Session Persistence | Refreshing page keeps user logged in via localStorage |
