# Gadget Deluxe — Enterprise IMEI Inventory, Sourcing & Tracking Ecosystem

Next-generation cross-border electronics procurement, hardware renovation, 9-stage live parcel tracking, and multi-channel B2B wholesale management system.

- Public Portal & Tracking: https://gadgetdeluxe.store
- Track Orders: https://gadgetdeluxe.store/track
- Admin Workspace: https://gadgetdeluxe.store/login
- GitHub Repository: https://github.com/jubaerkhan49/gadget-deluxe

---

## Overview

Gadget Deluxe is an all-in-one cloud inventory, sourcing, and logistics operations platform tailored for modern consumer electronics enterprises. Built specifically for high-turnover cross-border electronics trade (China to Bangladesh), hardware renovation pipelines, team sales commissions, custom single-item import orders, and Business-to-Business (B2B) client networks.

---

## Key Modules and Capabilities

### 1. Device Inventory and IMEI Lifecycle Management
- Universal Identifier Indexing: Instant search by primary IMEI, secondary IMEI2, Serial Number (SN), MEID, or Model.
- Hardware Telemetry & Battery Health: Comprehensive tracking of battery health percentage, cycle counts, display types, Face ID / True Tone status, and original hardware components.
- Dynamic Country & Variant Filtering: Built-in indexing for international device variants (Modified, USA eSim, Canada, Mexican, Korea, Singapore, Bypass).
- Physical Custody Audit Log: Real-time ownership assignment with time tracking to monitor stock in employee possession.

### 2. "Other Goods" & Custom Order Pipeline (9-Stage Live Tracking)
Manage single-item import purchases (Laptops, AirPods, laptop screens, cosmetics, gadgets) with complete customer transparency:
1. Order Confirmed (`ORDER_CONFIRMED`)
2. Payment Made / Advance Paid (`PAYMENT_RECEIVED`)
3. Product Purchased (`PRODUCT_PURCHASED`)
4. Shipped to CN Warehouse (`SHIPPED_TO_CN_WAREHOUSE`)
5. Received at CN Warehouse (`RECEIVED_AT_CN_WAREHOUSE`)
6. Shipped to BD (In Transit) (`SHIPPED_TO_BD`)
7. Arrived at BD Customs (`ARRIVED_AT_BD`)
8. Received in BD Local Hub (`RECEIVED_IN_BD`)
9. Product Delivered (`DELIVERED`)

- Customer Tracking Portal (`/track`): Public-facing, responsive tracking with pricing logic (`Product Price = Total Amount - Logistics Cost`).
- Multi-Channel Payment Logging: Support for bKash, Nagad, Bank Transfer, and Cash with unique TrxID logging.

### 3. Employee Application and Staff Management
- Online Application Gateway: Prospective staff can apply directly via the landing portal with verification details (Full Name, Nickname, Phone, Email, National ID, Address, Photo under 100KB, Password).
- Admin Review & Instant Activation: Administrators review pending submissions, verify National ID/address, and approve applicants into active employee accounts with single-click activation.
- Assigned Inventory Custody: Logged-in employees can immediately view the devices currently assigned to them and track their physical inventory status.

### 4. B2B Client Orders & Wholesale Network
- Capital Isolation: Client-funded lots (`is_b2b=True`) are automatically isolated from personal capital investment metrics.
- Client-Safe Mode: Dedicated interface that safeguards internal wholesale margins and purchasing origins when viewed alongside B2B clients.
- Repair Round-Trip: Workflow to route defective B2B devices to repair centers and return them directly to the client's inventory lot.

### 5. Inbound Shipments & Daily Batch Intake
- Batch Logistics: Multi-device intake from global freight forwarding agents with automatic unit shipping cost distribution (`Net Shipping / Devices Count`).
- Active vs. Archived Shipments: Automatic archival of completed shipment batches once all units arrive in Bangladesh stock.
- Daily BD Received Reports: One-click generation of receipt summaries for local logistics verification.

### 6. Hardware Diagnostics & Shenzhen Lab Tracker
- Shenzhen Round-Trip Logging: Track repair costs, issues, sent dates, and returned dates.
- Profit Margin Protection: Accurately accounts for repair expenditures against final selling margins.

### 7. Analytics, ROI & Best Seller Leaderboard
- Consolidated Monthly ROI calculation accounting for retail sales, B2B sales, repair overhead, and shipping logistics expenses.
- Seller Performance Scoring: Tracks sales representative volume, profit generation, turnaround speed, and sales consistency indices (0-100).

---

## Technology Stack

| Layer | Technologies |
|---|---|
| Backend | Python 3.11+, Django 5.x, Django REST Framework, SimpleJWT, Gunicorn, Whitenoise |
| Database | PostgreSQL (Production) / SQLite (Local Development) |
| Frontend Web | React 18, Vite, Material-UI (MUI v5), React Router v6, Axios, Notistack, Emotion |
| Mobile Client | Android (Kotlin), Jetpack Compose (Material 3), Coroutines, StateFlow, Retrofit 2, ML Kit |
| Infrastructure | Render Cloud (`render.yaml`), HTTPS, Custom Domain (`gadgetdeluxe.store`) |

---

## Repository Structure

```
imei_inventory_system/
├── backend/
│   ├── apps/
│   │   ├── accounts/     # Custom User model, Roles, EmployeeApplication
│   │   ├── api/          # DRF Serializers, ViewSets, OpenAPI documentation
│   │   ├── core/         # TimeStampedModel, audit logging middleware
│   │   ├── customers/    # Customer profiles, purchase history
│   │   ├── dashboard/    # Real-time KPIs, operational stats
│   │   ├── inventory/    # Device models, variants, IMEI tracking, history
│   │   ├── orders/       # Other Goods 9-stage custom order tracking
│   │   ├── repairs/      # Shenzhen repair lab tracking
│   │   ├── sales/        # Sales registry, profit calculation, invoices
│   │   ├── shipments/    # Inbound batches, freight cost distribution
│   │   └── sickw/        # Apple GSX / Sickw raw report telemetry parser
│   ├── config/           # Django settings, WSGI, ASGI, URLs
│   ├── requirements.txt  # Python package dependencies
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── api/          # Axios client with JWT interceptors
│   │   ├── components/   # MainLayout, UI components
│   │   ├── context/      # AuthContext
│   │   ├── dialogs/      # AddDevice, AddShipment, ManageEmployees, ApplyEmployee
│   │   ├── pages/        # Landing, Dashboard, Inventory, B2B, Sales, Track
│   │   └── theme/        # Light/Dark mode design system
│   └── package.json
├── android/              # Native Android CameraX & Barcode Scanner App
└── README.md
```

---

## API Endpoints Catalog

### Authentication & Users
- `POST /api/token/` — Obtain JWT access and refresh tokens
- `POST /api/token/refresh/` — Refresh expired JWT access token
- `GET /api/users/me/` — Retrieve authenticated user profile and assigned device count
- `POST /api/users/change-password/` — Change current user password

### Public Portals (No Auth Required)
- `GET /api/public/track-order/?order=<ID_OR_PHONE>` — Public 9-stage shipment tracking
- `POST /api/employee-applications/` — Public submission for prospective employee join application

### Employee Management & Applications (Admin / Manager)
- `GET /api/employee-applications/` — List employee applications (filter by `status`)
- `POST /api/employee-applications/{id}/approve/` — Approve applicant and generate active account
- `POST /api/employee-applications/{id}/reject/` — Reject applicant

### Device Inventory
- `GET /api/devices/` — List devices (filter by `current_status`, `is_b2b`, `current_owner`)
- `POST /api/devices/` — Register new device in inventory
- `GET /api/devices/scan/?code=<IMEI_OR_SN>` — Barcode / IMEI instant scan lookup
- `GET /api/export/devices/csv/` — Export inventory to CSV

### 9-Stage Sourcing Orders ("Other Goods")
- `GET /api/other-goods/` — List custom customer sourcing orders
- `POST /api/other-goods/` — Create new custom customer sourcing order
- `POST /api/other-goods/{id}/advance_stage/` — Advance order through 9-stage pipeline

### Analytics & Dashboard
- `GET /api/dashboard/stats/` — Real-time operational counters, assigned inventory metrics
- `GET /api/analytics/?year=YYYY&month=M` — Executive monthly ROI and leaderboard

---

## Getting Started

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### Android Native App Setup

1. Open the `android/` directory in Android Studio (Ladybug or newer).
2. Sync Gradle dependencies.
3. Configure `API_BASE_URL` in `Constants.kt` or `gradle.properties`.
4. Run on a physical Android device to test CameraX hardware barcode scanning.

---

## License

Copyright (c) Gadget Deluxe. All rights reserved.
