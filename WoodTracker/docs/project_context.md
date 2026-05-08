# Project Context — Wood Trading POS System

## Overview

The Wood Trading POS System is a browser-based point-of-sale and inventory management application built for a wood trading business. It digitises the end-to-end sales workflow — from inventory tracking and customer management to sale processing and financial reporting — replacing manual record-keeping with a centralised, role-aware system.

## Business Problem

Wood trading businesses typically deal with high-volume, varied inventory (different species, dimensions, quantities) and need to track:

- Which pieces of wood are available and at what price
- Which customer bought what, and how much they paid vs. owe
- Daily sales totals, expenses, and profitability
- Multiple staff roles operating the same system simultaneously

Without a dedicated tool, this is managed through paper ledgers or basic spreadsheets, leading to stock discrepancies, missed payments, and no real-time visibility.

## Goals

| Goal | Description |
|------|-------------|
| Digitise Sales | Replace manual billing with a structured POS flow |
| Real-time Inventory | Automatically deduct stock on every sale |
| Role-based Access | Restrict actions per staff role (admin, manager, cashier, warehouse) |
| Customer Ledger | Track outstanding balances per customer |
| Financial Visibility | Dashboard with daily sales, expenses, and stock value |
| Zero Infrastructure Cost | Run entirely on Google Workspace (Sheets + Apps Script) |

## Non-Goals

- This is not an e-commerce platform (no public-facing shop)
- Does not handle supplier invoicing or purchase orders beyond logging
- No mobile native app (web-only, responsive design)
- No advanced accounting (no P&L, balance sheet, or tax calculations)

## Stakeholders

| Role | Responsibility |
|------|---------------|
| Admin | Full system access — users, settings, all data |
| Manager | Sales, inventory, reports — no user management |
| Cashier | POS sales only |
| Warehouse Staff | Inventory view only |
| Business Owner | Consumes reports and dashboard |

## Technology Rationale

The system uses **Google Apps Script + Google Sheets** as its backend because:

- No server infrastructure to maintain or pay for
- Google Sheets acts as a familiar, directly editable database
- Google Apps Script runs server-side logic within Google's infrastructure
- `MailApp` provides email (OTP) capability without a third-party service
- Total ongoing cost: $0

The frontend (`index.html`) is hosted on the business's own domain (`framegenai.cloud/WoodTracker/`) and communicates with the Apps Script backend via HTTP GET requests with a JSON payload parameter.

## Deployment Architecture

```
User Browser (framegenai.cloud/WoodTracker/)
        |
        | fetch GET ?payload={...}
        v
Google Apps Script Web App (script.google.com/.../exec)
        |
        | SpreadsheetApp API
        v
Google Sheets (14 sheets — Users, Sales, Inventory, etc.)
```

## Current Status (as of May 2026)

- Core POS, inventory, dashboard, and auth flows are implemented
- Hosted at framegenai.cloud/WoodTracker/
- Backend deployed as Google Apps Script web app
- Demo data seeded via `setupDemoData()`
