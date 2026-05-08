# Low-Level Design — Wood Trading POS System

## 1. Database Schema (Google Sheets)

Each sheet has a header row. All IDs are string-typed prefixed identifiers (e.g. `u1`, `s1234567890`).

---

### Users
| Column | Type | Description |
|--------|------|-------------|
| id | string | Unique user ID (e.g. `u1`) |
| name | string | Display name |
| email | string | Login email (unique) |
| phone | string | Contact number |
| password | string | Plaintext password |
| role | enum | `admin` \| `manager` \| `cashier` \| `warehouse_staff` |
| avatar_drive_id | string | Google Drive file ID for avatar (optional) |
| is_active | boolean | `true` = can log in |
| created_at | ISO 8601 | Creation timestamp |
| updated_at | ISO 8601 | Last update timestamp |
| otp | string | Active OTP code (cleared after use) |
| otp_expires | ISO 8601 | OTP expiry timestamp |

---

### Categories
| Column | Type | Description |
|--------|------|-------------|
| id | string | e.g. `c1` |
| name | string | e.g. `Oak Wood` |

---

### Sub_Categories
| Column | Type | Description |
|--------|------|-------------|
| id | string | e.g. `sc1` |
| category_id | string | FK → Categories.id |
| name | string | e.g. `Car-A01` |

---

### Suppliers
| Column | Type | Description |
|--------|------|-------------|
| id | string | e.g. `sup1` |
| name | string | Supplier name |
| phone | string | Contact number |

---

### Customers
| Column | Type | Description |
|--------|------|-------------|
| id | string | e.g. `cust1` |
| name | string | Customer name |
| phone | string | Contact number |
| balance | number | Outstanding balance (positive = owes money) |

---

### Wood_Stocks
| Column | Type | Description |
|--------|------|-------------|
| serial | string | Unique stock identifier (e.g. `W-001`) |
| sub_cat | string | FK → Sub_Categories.id |
| purchase_id | string | FK → Purchases.id |
| width | number | Width in inches |
| length | number | Length in inches |
| cft | number | Cubic feet volume |
| buy_rate | number | Purchase price per unit |
| sell_rate | number | Selling price per unit |
| qty | number | Available quantity |
| status | enum | `available` \| `sold` \| `reserved` |
| image_drive_id | string | Google Drive file ID for stock image (optional) |

---

### Purchases
| Column | Type | Description |
|--------|------|-------------|
| id | string | e.g. `p1` |
| supplier_id | string | FK → Suppliers.id |
| amount | number | Total purchase amount |
| date | ISO 8601 | Purchase date |

---

### Sales
| Column | Type | Description |
|--------|------|-------------|
| id | string | Timestamp-based ID (e.g. `s1714900000000`) |
| customer_id | string | FK → Customers.id |
| total_amount | number | Sum of all item line totals |
| paid_amount | number | Amount actually collected |
| date | ISO 8601 | Sale timestamp |
| status | enum | `completed` \| `partial` \| `pending` |

**Status logic:**
- `paid_amount >= total_amount` → `completed`
- `paid_amount > 0` → `partial`
- `paid_amount == 0` → `pending`

---

### Sale_Items
| Column | Type | Description |
|--------|------|-------------|
| id | string | Timestamp-based ID (e.g. `si17149...0`) |
| sale_id | string | FK → Sales.id |
| serial | string | FK → Wood_Stocks.serial |
| qty | number | Quantity sold |
| rate | number | Unit rate at time of sale |
| amount | number | qty × rate |

---

### Payments
| Column | Type | Description |
|--------|------|-------------|
| id | string | Timestamp-based ID (e.g. `pay1714900000000`) |
| ref_id | string | FK → Sales.id |
| type | string | `customer_payment` |
| amount | number | Amount paid in this transaction |
| method | enum | `cash` \| `bank` \| `card` |
| date | ISO 8601 | Payment timestamp |

---

### Expenses
| Column | Type | Description |
|--------|------|-------------|
| id | string | e.g. `e1` |
| title | string | Expense label (e.g. `Transport`) |
| amount | number | Expense amount |
| date | ISO 8601 | Expense date |

---

### Settings
| Column | Type | Description |
|--------|------|-------------|
| key | string | Setting key (e.g. `business_name`) |
| value | string | Setting value |

**Known keys:** `business_name`, `address`, `phone`

---

### Activity_Logs
| Column | Type | Description |
|--------|------|-------------|
| id | string | Timestamp-based ID |
| user_id | string | FK → Users.id |
| action | string | Action type (e.g. `SALE`, `SYSTEM_INIT`) |
| details | string | Human-readable description |
| date | ISO 8601 | Log timestamp |

---

### Import_Logs
| Column | Type | Description |
|--------|------|-------------|
| id | string | Log ID |
| filename | string | Imported file name |
| date | ISO 8601 | Import date |
| status | string | Import result status |

---

## 2. API Specification

All requests are HTTP GET to the Apps Script `/exec` URL with a single URL parameter:

```
GET https://script.google.com/macros/s/{DEPLOY_ID}/exec?payload={URL_ENCODED_JSON}
```

All responses are `Content-Type: application/json`.

---

### loginUser

**Request payload:**
```json
{ "action": "loginUser", "email": "admin@example.com", "password": "admin123" }
```

**Success response:**
```json
{ "success": true, "user": { "id": "u1", "name": "Admin User", "role": "admin", "email": "admin@example.com" } }
```

**Failure response:**
```json
{ "success": false, "message": "Invalid credentials or inactive user." }
```

---

### forgotPassword

**Request payload:**
```json
{ "action": "forgotPassword", "email": "admin@example.com" }
```

**Success response:**
```json
{ "success": true, "message": "OTP sent to email." }
```

**Side effects:** Writes 6-digit OTP + 10-minute expiry to Users sheet; sends OTP via `MailApp`.

---

### resetPassword

**Request payload:**
```json
{ "action": "resetPassword", "email": "admin@example.com", "otp": "482910", "newPassword": "newpass123" }
```

**Success response:**
```json
{ "success": true, "message": "Password reset successfully." }
```

**Validation:** OTP must match stored value AND current time must be before `otp_expires`.

---

### getSWRData

**Request payload:**
```json
{ "action": "getSWRData", "role": "admin" }
```

**Success response:**
```json
{
  "success": true,
  "data": {
    "wood_stocks": [ { "serial": "W-001", "sub_cat": "sc1", "width": 10, "length": 20, "cft": 5, "buy_rate": 100, "sell_rate": 150, "qty": 50, "status": "available" }, ... ],
    "categories": [ { "id": "c1", "name": "Oak Wood" }, ... ],
    "sub_categories": [ ... ],
    "customers": [ { "id": "cust1", "name": "Local Builders", "phone": "555-2222", "balance": 0 }, ... ],
    "settings": [ { "key": "business_name", "value": "Premium Wood Co." }, ... ],
    "sales": [ { "id": "s1", "customer_id": "cust1", "total_amount": 1500, "paid_amount": 1500, "date": "2026-04-05T10:00:00Z", "status": "completed" }, ... ],
    "expenses": [ { "id": "e1", "title": "Transport", "amount": 200, "date": "2026-04-02T10:00:00Z" }, ... ]
  }
}
```

**Authorization:** Rejected if `role` is falsy.

---

### processSale

**Request payload:**
```json
{
  "action": "processSale",
  "userId": "u1",
  "role": "admin",
  "payload": {
    "customer_id": "cust1",
    "items": [ { "serial": "W-001", "qty": 2, "rate": 150 } ],
    "total_amount": 300,
    "paid_amount": 300,
    "method": "cash"
  }
}
```

**Success response:**
```json
{ "success": true, "message": "Sale processed successfully.", "sale_id": "s1714900000000" }
```

**Authorization:** Only `admin`, `manager`, `cashier` roles permitted.

**Atomic operations (in order):**
1. Append row to `Sales`
2. Append rows to `Sale_Items` (one per cart item)
3. Deduct qty from `Wood_Stocks` for each item
4. Append row to `Payments` (if `paid_amount > 0`)
5. Append row to `Activity_Logs`

---

## 3. Frontend State Model

```javascript
// Global state in browser memory
currentUser = {          // Sourced from localStorage 'woodpos_user'
  id: string,
  name: string,
  role: string,
  email: string
}

appData = {              // Sourced from localStorage 'woodpos_data'
  wood_stocks: [...],
  categories: [...],
  sub_categories: [...],
  customers: [...],
  settings: [...],
  sales: [...],
  expenses: [...]
}

cart = [                 // In-memory only, cleared on sale or logout
  { serial: string, rate: number, qty: number }
]

currentCallback = fn | null   // Pending response handler
```

---

## 4. Authentication Flow (Step by Step)

```
1. Page load
   └── currentUser in localStorage?
       ├── YES → hide auth-view, setupUserUI(), initSWR()
       └── NO  → show auth-view (login form)

2. Login submit
   ├── Validate email + password fields (show modal if empty)
   ├── Show "Authenticating..." modal (no close button)
   ├── Set currentCallback = login handler
   ├── callGAS('loginUser', {email, password})
   └── Response:
       ├── success=true  → store user in localStorage, hide auth-view, setupUserUI(), initSWR()
       └── success=false → show error modal with message

3. Forgot password → OTP → Reset
   ├── Enter email → callGAS('forgotPassword', {email})
   ├── On success → show OTP input section
   ├── Enter OTP + new password → callGAS('resetPassword', {email, otp, newPassword})
   └── On success → switch back to login view

4. Logout
   └── Remove 'woodpos_user' and 'woodpos_data' from localStorage → location.reload()
```

---

## 5. POS Sale Flow (Step by Step)

```
1. Navigate to POS
   └── renderPOS() → populate customer dropdown + wood cards from appData

2. Add items
   └── Click wood card → addToCart(serial, rate)
       ├── Item exists in cart → increment qty
       └── New item → push {serial, rate, qty:1}
       └── renderCart() → update DOM + recalculate total

3. Set payment
   ├── Quick-pay buttons set cart-paid input value
   ├── calculateChange() runs on every keyup → shows balance/change

4. Complete sale
   ├── Validate: cart not empty, customer selected
   ├── Build payload: {customer_id, items, total_amount, paid_amount, method}
   ├── Show "Processing..." modal
   ├── callGAS('processSale', {payload, userId, role})
   └── Response:
       ├── success=true  → show success modal with sale_id, clear cart, fetchSWRData()
       └── success=false → show error modal
```

---

## 6. Role-Permission Matrix

| Feature | admin | manager | cashier | warehouse_staff |
|---------|-------|---------|---------|-----------------|
| Login | ✅ | ✅ | ✅ | ✅ |
| Dashboard | ✅ | ✅ | ✅ | ❌ |
| POS (UI visible) | ✅ | ✅ | ✅ | ❌ |
| processSale (API) | ✅ | ✅ | ✅ | ❌ |
| Inventory | ✅ | ✅ | ✅ | ✅ |
| Reports | ✅ | ✅ | ✅ | ❌ |

> Warehouse staff: redirected to Inventory on login; POS nav item hidden.

---

## 7. Concurrency Control

`LockService.getScriptLock()` with `waitLock(10000)` is applied to:

- `forgotPassword` — prevents duplicate OTP generation under rapid requests
- `resetPassword` — prevents race condition on password write
- `processSale` — prevents double-sale or negative stock if two users sell the same stock simultaneously

Lock timeout: 10 seconds. If lock cannot be acquired, an exception is thrown and caught, returning `{ success: false, message: <error> }`.

---

## 8. ID Generation

| Entity | Strategy | Example |
|--------|----------|---------|
| Users | Static prefix + counter | `u1`, `u2` |
| Customers | Static prefix + counter | `cust1`, `cust2` |
| Sales | `'s' + Date.getTime()` | `s1714900000000` |
| Sale_Items | `'si' + Date.getTime() + index` | `si17149000000000` |
| Payments | `'pay' + Date.getTime()` | `pay1714900000000` |
| Activity_Logs | `'al' + Date.getTime()` | `al1714900000000` |

> Timestamp-based IDs are not globally unique under concurrent execution — mitigated by `LockService`.
