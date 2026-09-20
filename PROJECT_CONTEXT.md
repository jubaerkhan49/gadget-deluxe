# Gadget Deluxe — IMEI Inventory, Shipment & B2B Management System
### Complete Technical Architecture & System Context Document

> **Repository**: [https://github.com/jubaerkhan49/gadget-deluxe](https://github.com/jubaerkhan49/gadget-deluxe)  
> **Target Audience**: AI Agents, Full-Stack Engineers, System Architects, Mobile Developers

---

## 1. Executive Summary

**Gadget Deluxe** is an enterprise-grade mobile device inventory, logistics, and trading management system built specifically for consumer electronics businesses managing cross-border procurement (e.g. Shenzhen/Hong Kong/USA $\to$ Bangladesh), hardware refurbishing/repair lifecycles, team sales commissions, and Business-to-Business (B2B) client orders.

The platform consists of:
1. **Django REST Framework Backend**: Robust PostgreSQL/SQLite database schema, JWT authentication, granular financial tracking, Sickw GSX telemetry parsing, and aggregated business intelligence APIs.
2. **React (Vite) Single-Page Application**: Responsive web dashboard with dark/light themes, live 5-second polling sync, data export (CSV), interactive financial charts, drawer views, and shipment batch operations.
3. **Native Android App (Jetpack Compose)**: Modern MVVM Android client featuring ML-Kit camera barcode/IMEI scanning, quick status changes, offline-resilient caching, and segmented tabs for inventory and shipments.

---

## 2. Technology Stack

### Backend
- **Framework**: Python 3.11+, Django 5.x, Django REST Framework (DRF)
- **Database**: SQLite (Local Development) / PostgreSQL (Production on Render)
- **Auth**: JWT via `djangorestframework-simplejwt`
- **CORS & Security**: `django-cors-headers`, Django security middleware, whitenoise for static assets
- **Deployment**: Render Cloud (`render.yaml`, `build.sh` running `collectstatic` + `migrate`)

### Frontend Web
- **Framework**: React 18+ with Vite
- **UI Library**: Material-UI (MUI v5) with `@mui/icons-material`
- **Routing**: `react-router-dom` v6
- **HTTP Client**: `axios` with automatic token-refresh interceptors
- **Notifications**: `notistack` (Snackbar provider)
- **Styling**: Vanilla CSS tokens & MUI theme engine with custom Dark/Light palettes

### Mobile App (Android)
- **Language**: Kotlin
- **UI Toolkit**: Jetpack Compose (Material 3)
- **Architecture**: MVVM with `ViewModel`, Kotlin Coroutines & `StateFlow`
- **Networking**: Retrofit 2 + OkHttp 4 + Gson
- **Hardware/Camera**: CameraX + Google ML Kit Barcode Scanning for IMEI/SN extraction

---

## 3. Core Database Models & Schema Design

All core entities are organized into clean Django apps within `backend/apps/`:

### 3.1. Inventory (`apps/inventory/models.py`)
- **`Device`**:
  - `imei` (unique, indexed, primary identifier), `imei2`, `meid`, `serial_number`.
  - `model` (e.g. "iPhone 15 Pro Max"), `model_description`, `capacity` (e.g. "256GB"), `color`, `purchase_country`.
  - `variant` (Enum: `Modified`, `USA eSim`, `Canada`, `Mexican`, `Korea`, `Singapore`, `Bypass`, `Other`).
  - `battery_health` (int %), `battery_cycle` (int), `display_type`, `face_id`, `true_tone`, `original_parts_status`.
  - `current_status` (Enum: `WAITING_SHIPMENT`, `IN_STOCK`, `ASSIGNED`, `UNDER_REPAIR`, `SOLD`, `RETURNED`, `LOST`).
  - `buying_price` (Decimal: cost price including allocated unit shipping).
  - `current_owner` (ForeignKey $\to$ `User`, employee holding physical possession).
  - `current_shipment` (ForeignKey $\to$ `Shipment`).
  - `received_date_bd` (Date device physically arrived in Bangladesh).
  - `notes` (General remarks, defects, packaging notes).
  - **B2B Fields**:
    - `is_b2b` (Boolean: `True` if device is client-funded, isolates buying price from personal capital).
    - `b2b_shop_name` (Client shop/partner name).
    - `b2b_delivery_date` (Target/actual delivery date to client).
    - `b2b_has_issues` (Boolean) & `b2b_issue_notes` (Issue/defect description).
    - `b2b_selling_price` (Agreed selling price to partner).
    - `b2b_status` (`IN_INVENTORY`, `SENT_FOR_REPAIR`, `DELIVERED`, `CANCELLED`).
    - *Computed properties*: `b2b_repair_cost`, `b2b_profit` ($= \text{Selling} - \text{Buying} - \text{Repairs}$).

- **`DeviceAssignment`**: Audit log of employee handovers with `assigned_date`, `released_date`, `status`, and `notes`.
- **`DeviceHistory`**: Immutable chronological audit timeline of device status updates, ownership changes, and price adjustments.
- **`Note`**: Multi-author timestamped notes attached to a device.
- **`CarrierInformation`**: Carrier SIM-lock policy, network carrier name, and lock status.

### 3.2. Shipments (`apps/shipments/models.py`)
- **`Supplier`**: Vendor name, contact person, phone, email, country, address.
- **`Shipment`**:
  - `tracking_number` (Unique tracking identifier).
  - `supplier` (ForeignKey $\to$ `Supplier`).
  - `shipping_company` (Agent/freight company e.g. "AB GROUP (SA 001)").
  - `receive_date` (Date received in China/warehouse).
  - `shipping_cost` (Gross shipping fee in BDT).
  - `discount` (Agent discount/cashback in BDT).
  - *Computed properties*:
    - `net_shipping_cost` $= \text{shipping\_cost} - \text{discount}$.
    - `unit_shipping_cost` $= \text{net\_shipping\_cost} / \text{total\_devices\_count}$.
    - `total_devices_count`, `pending_devices_count`, `received_devices_count`.
    - `is_archived` (Boolean: `True` when all devices inside batch are received into BD stock).

### 3.3. Sales (`apps/sales/models.py`)
- **`Sale`**:
  - `device` (ForeignKey $\to$ `Device`).
  - `seller` (ForeignKey $\to$ `User`, sales rep).
  - `customer` (ForeignKey $\to$ `Customer`).
  - `buying_price`, `selling_price`, `discount`, `commission_amount`.
  - `invoice_number` (Auto-generated unique invoice e.g. `INV-YYYYMMDD-XXXXXX`).
  - `sale_date` (Timestamp).
  - *Computed property*: `profit` $= \text{selling\_price} - \text{buying\_price} - \text{commission\_amount}$.

### 3.4. Repairs (`apps/repairs/models.py`)
- **`Repair`**:
  - `device` (ForeignKey $\to$ `Device`).
  - `issue_description` (Hardware fault / replacement part required).
  - `sent_date`, `returned_date`.
  - `repair_center` (e.g. "Shenzhen Master Lab", "In-House").
  - `country` (Default: "China").
  - `repair_cost` (Expense in BDT).
  - `status` (Enum: `IN_PROGRESS`, `SENT_TO_CHINA`, `UNREPAIRABLE`, `COMPLETED`).
  - `timeline_log` (JSON field of repair updates).

### 3.5. Sickw (`apps/sickw/models.py`)
- **`SickwReport`**: Stores parsed GSX/Sickw telemetry reports for Apple devices (model description, activation status, carrier lock, iCloud FMI status, warranty status, purchase date, etc.).

---

## 4. Key Business Logic & Financial Formulas

### 4.1. Capital Investment & B2B Isolation
- **Self-Invested Stock (`is_b2b=False`)**: Devices purchased using the store owner's personal capital.
  $$\text{Total Monthly Investment} = \sum_{\text{Month}} \text{Device.buying\_price (where } is\_b2b = \text{False)}$$
- **B2B Client Orders (`is_b2b=True`)**: Equipment ordered or funded by external shop owners.
  - **Zero Personal Investment**: Excluded completely from the owner's capital investment metric.
  - **B2B Trade Profit**:
    $$\text{B2B Net Profit} = \text{b2b\_selling\_price} - \text{buying\_price} - \sum \text{repair\_cost}$$
  - **Silent Profit Addition**: B2B net profit is automatically added to the business owner's **Total Monthly Profit** in Analytics, but hidden from the client-facing B2B portal.

### 4.2. Business ROI & Net Profit
$$\text{Net Profit} = \text{Total Retail Sales Profit} + \text{Total B2B Profit} - \text{Total Monthly Repair Costs} - \text{Total Monthly Shipping Costs}$$
$$\text{ROI \%} = \left( \frac{\text{Net Profit}}{\text{Total Investment}} \right) \times 100$$

### 4.3. Seller Performance & Consistency Scoring
The leaderboard ranks sales representatives on three key operational vectors:
1. **Total Profit Generated (৳)**
2. **Turnaround Speed**: Average days from device assignment $\to$ completed sale date.
3. **Consistency Score (0–100)**: Calculated from the frequency distribution of active sales days across the month + volume multiplier.

---

## 5. Web Frontend Application Architecture

### 5.1. Navigation & Routing (`App.jsx`, `MainLayout.jsx`)
| Route | Page Component | Purpose |
|---|---|---|
| `/` | `Dashboard.jsx` | Real-time KPI cards, stock status breakdown, today's sales, team distribution. |
| `/analytics` | `Analytics.jsx` | Monthly performance, Best Seller leaderboard, ROI metrics, financial charts. |
| `/inventory` | `Inventory.jsx` | Self-invested stock list, advanced search/filters, CSV export, live 5s auto-sync. |
| `/b2b` | `B2B.jsx` | Client-safe portal for B2B client orders, delivery dates, Order IDs, and repair cycles. |
| `/shipments` | `Shipments.jsx` | Inbound batches, active vs. archived shipments, supplier stats, daily received report. |
| `/repairs` | `Repairs.jsx` | Repair logs, Shenzhen lab tracker, repair cost accounting, B2B round-trip. |
| `/sales` | `Sales.jsx` | Invoices list, customer details, seller commissions, payment statuses. |
| `/archive` | `Archive.jsx` | Sold devices archive, historic search by IMEI, full lifecycle audit log. |
| `/sickw` | `SickwParser.jsx` | Instant Sickw telemetry raw text parser and spec auto-extractor. |

### 5.2. Key Modals & Dialogs
- **`DeviceDetailDrawer.jsx`**: Side drawer showing full 360° device information: IMEI, hardware specs, battery health/cycle, ownership history, Sickw GSX reports, timeline logs, and quick actions.
- **`ShipmentDetailDialog.jsx`**: Batch management modal. Displays shipment metrics, batch device table, "Receive BD" button, and "Move to B2B" intake workflow.
- **`EditShipmentDialog.jsx`**: Allows editing shipment pricing, freight agent, supplier, and managing/deleting devices in the batch.
- **`EditB2BDeviceDialog.jsx`**: Edit client shop name, expected delivery date, pricing, battery health, and issue notes.
- **`DailyReceivedReportDialog.jsx`**: Generates a summary report of all devices received in BD on a specific date.
- **`RecordSaleDialog.jsx`**: Direct invoice generator with customer name, phone, selling price, and seller assignment.

---

## 6. Android Mobile Application Architecture

### 6.1. Project Structure (`android/app/src/main/java/com/imei/inventory/`)
```
com.imei.inventory/
├── MainActivity.kt                # Jetpack Compose root, BottomNavigation & routing
├── data/
│   ├── api/
│   │   ├── ApiClient.kt           # Retrofit instance with JWT Bearer interceptor
│   │   └── ImeiApiService.kt      # DRF API endpoint definitions
│   └── model/
│       ├── AnalyticsDto.kt        # Data classes for analytics & best seller stats
│       ├── DashboardStatsDto.kt   # Live operational summary DTOs
│       └── DeviceDto.kt           # DeviceDto, ShipmentDto, SaleDto, RepairDto
├── ui/
│   ├── components/                # Reusable Badges, CopyableText, StatusChips
│   ├── dialogs/                   # DeviceDetailDialog, EditShipmentDialog, SalesDialog, etc.
│   └── screens/
│       ├── DashboardTab.kt        # Mobile metrics dashboard
│       ├── InventoryTab.kt        # Active Inventory vs. Archive (Sold) segmented tabs
│       ├── ShipmentsTab.kt        # Active Shipment vs. Archive segmented tabs with search
│       ├── AnalyticsTab.kt        # Mobile analytics & seller rankings
│       ├── RepairsTab.kt          # Active repair monitoring
│       └── SalesTab.kt            # Sales invoices list
└── viewmodel/
    └── MainInventoryViewModel.kt  # StateFlow reactive state holder & repository dispatcher
```

### 6.2. Key Mobile Features
1. **Camera ML-Kit Barcode Scanner**: Scans device barcodes / IMEI labels directly using the phone camera for instant check-in.
2. **Segmented Header Tabs**:
   - **Inventory**: `[ Active Inventory (X) | Archive (Sold) (Y) ]`
   - **Shipments**: `[ Active Shipment (X) | Archive (Y) ]`
3. **One-Tap Quick Actions**:
   - Quick Status Changer (`✓ In Stock`, `Repair`, `Sold` with instant selling price input).
   - Dynamic team owner assignment dropdown.
   - One-click IMEI/SN copying to clipboard.
   - Device notes display and editing support.

---

## 7. API Reference

All endpoints are prefixed with `/api/` and require JWT `Authorization: Bearer <token>`:

### Devices & Inventory
- `GET /api/devices/` — Filter by `is_b2b`, `current_status`, `variant`, `current_owner`, `search` (IMEI, model, SN).
- `POST /api/devices/` — Create new device.
- `GET /api/devices/{id}/` — Full device detail with nested repairs, sales, assignments, history, and notes.
- `PATCH /api/devices/{id}/` — Update device specs, status, owner, or B2B attributes.
- `DELETE /api/devices/{id}/` — Delete device.
- `GET /api/devices/scan/?code={imei}` — Instant lookup by IMEI/Barcode.
- `GET /api/devices/export-csv/?status={SOLD|IN_STOCK}` — Export dataset to CSV.

### Shipments
- `GET /api/shipments/` — List all shipments with computed counts and archive statuses.
- `POST /api/shipments/` — Create shipment.
- `POST /api/shipments/create-batch/` — Bulk create shipment batch and auto-populate device records.
- `PATCH /api/shipments/{id}/` — Update shipment details.
- `DELETE /api/shipments/{id}/` — Delete shipment and detach linked devices.

### Repairs
- `GET /api/repairs/` — List repairs (sorted: `IN_PROGRESS` $\to$ `SENT_TO_CHINA` $\to$ `UNREPAIRABLE` $\to$ `COMPLETED`).
- `POST /api/repairs/` — Log repair (auto-updates device status to `UNDER_REPAIR`).
- `PATCH /api/repairs/{id}/` — Update repair (marking `COMPLETED` auto-returns device to `IN_STOCK` or B2B stock).

### Sales & Invoices
- `GET /api/sales/` — List sales records with seller and profit data.
- `POST /api/sales/` — Record new sale.

### Analytics & Dashboard
- `GET /api/dashboard/stats/` — Real-time counts, stock valuation, and today's sales.
- `GET /api/analytics/?year=YYYY&month=M` — Comprehensive monthly analytics, ROI, total investment, repair costs, shipping costs, and Best Seller leaderboard.
- `POST /api/sickw/parse-raw/` — Parse raw Sickw GSX text and return structured JSON.

---

## 8. Development & Build Setup

### Backend (Django)
```powershell
# Navigate to backend
cd backend

# Create & activate virtual environment
python -m venv venv
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start local dev server
python manage.py runserver 0.0.0.0:8000
```

### Frontend (React + Vite)
```powershell
# Navigate to frontend
cd frontend

# Install packages
npm install

# Start development server
npm run dev

# Build production bundle (Must be verified before committing)
npm run build
```

### Android (Kotlin + Gradle)
```powershell
# Open android/ in Android Studio (Giraffe / Hedgehog / Ladybug)
# Build & run debug APK on connected device or emulator:
cd android
.\gradlew assembleDebug
```

---

## 9. Important Conventions & Rules for AI Agents

1. **PowerShell Commands**: When running terminal commands, always use PowerShell syntax (e.g. use `;` instead of `&&` to chain commands).
2. **Frontend Validation**: Always run `npm run build` inside `frontend/` to ensure zero compilation or bundle errors before concluding work.
3. **Investment Isolation**: Never add B2B device costs (`is_b2b=True`) into the owner's personal `total_investment` metrics.
4. **Client-Facing Safety**: The B2B portal (`/b2b`) is designed to be client-safe. Do not show internal profit margins or purchase costs on the B2B main screen.
5. **Git Commits**: Keep commit messages concise, formatted according to Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`).
