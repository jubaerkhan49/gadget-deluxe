-- ==============================================================================
-- GADGET DELUXE - SUPABASE CLOUD POSTGRESQL SCHEMA & REALTIME CONFIGURATION
-- ==============================================================================
-- Run this script in your Supabase Project's SQL Editor (supabase.com -> SQL Editor -> New Query)
-- It creates all required tables, constraints, indexes, and enables Real-Time WebSockets.
-- ==============================================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ACCOUNTS & USERS TABLE
CREATE TABLE IF NOT EXISTS accounts_user (
    id BIGSERIAL PRIMARY KEY,
    password VARCHAR(128) NOT NULL,
    last_login TIMESTAMPTZ,
    is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
    username VARCHAR(150) UNIQUE NOT NULL,
    first_name VARCHAR(150) NOT NULL DEFAULT '',
    last_name VARCHAR(150) NOT NULL DEFAULT '',
    email VARCHAR(254) NOT NULL DEFAULT '',
    is_staff BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    date_joined TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    role VARCHAR(20) NOT NULL DEFAULT 'EMPLOYEE',
    phone VARCHAR(20) NOT NULL DEFAULT '',
    employee_code VARCHAR(20) NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT ''
);

-- 2. SUPPLIERS TABLE
CREATE TABLE IF NOT EXISTS shipments_supplier (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    name VARCHAR(200) UNIQUE NOT NULL,
    contact_person VARCHAR(100),
    email VARCHAR(254),
    phone VARCHAR(50),
    country VARCHAR(100),
    address TEXT,
    notes TEXT
);

-- 3. SHIPMENTS TABLE
CREATE TABLE IF NOT EXISTS shipments_shipment (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tracking_number VARCHAR(100) NOT NULL,
    supplier_id BIGINT NOT NULL REFERENCES shipments_supplier(id) ON DELETE RESTRICT,
    shipping_company VARCHAR(100),
    receive_date DATE,
    shipping_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    country VARCHAR(100),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON shipments_shipment(tracking_number);

-- 4. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers_customer (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(254),
    facebook VARCHAR(200),
    address TEXT,
    notes TEXT
);

-- 5. INVENTORY DEVICES TABLE
CREATE TABLE IF NOT EXISTS inventory_device (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    imei VARCHAR(20) UNIQUE NOT NULL,
    imei2 VARCHAR(20),
    serial_number VARCHAR(100),
    meid VARCHAR(50),
    model VARCHAR(200) NOT NULL,
    model_description TEXT,
    capacity VARCHAR(20),
    color VARCHAR(50),
    variant VARCHAR(50),
    buying_price NUMERIC(10, 2),
    selling_price NUMERIC(10, 2),
    current_status VARCHAR(20) NOT NULL DEFAULT 'IN_STOCK',
    battery_health INTEGER,
    battery_cycle INTEGER,
    icloud_status VARCHAR(20) NOT NULL DEFAULT 'UNKNOWN',
    sim_lock_status VARCHAR(20) NOT NULL DEFAULT 'UNKNOWN',
    purchase_country VARCHAR(100),
    notes TEXT,
    current_owner_id BIGINT REFERENCES accounts_user(id) ON DELETE SET NULL,
    current_shipment_id BIGINT REFERENCES shipments_shipment(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_device_imei ON inventory_device(imei);
CREATE INDEX IF NOT EXISTS idx_device_serial ON inventory_device(serial_number);
CREATE INDEX IF NOT EXISTS idx_device_status ON inventory_device(current_status);

-- 6. SALES INVOICES TABLE
CREATE TABLE IF NOT EXISTS sales_sale (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    device_id BIGINT UNIQUE NOT NULL REFERENCES inventory_device(id) ON DELETE RESTRICT,
    customer_id BIGINT NOT NULL REFERENCES customers_customer(id) ON DELETE RESTRICT,
    seller_id BIGINT REFERENCES accounts_user(id) ON DELETE SET NULL,
    final_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    profit NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'CASH',
    warranty_months INTEGER NOT NULL DEFAULT 0,
    notes TEXT
);

-- 7. DEVICE AUDIT HISTORY TABLE
CREATE TABLE IF NOT EXISTS inventory_devicehistory (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    device_id BIGINT NOT NULL REFERENCES inventory_device(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES accounts_user(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL,
    previous_state TEXT,
    new_state TEXT,
    notes TEXT
);

-- 8. REPAIRS TABLE
CREATE TABLE IF NOT EXISTS repairs_repair (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    device_id BIGINT NOT NULL REFERENCES inventory_device(id) ON DELETE RESTRICT,
    issue_description TEXT NOT NULL,
    technician_notes TEXT,
    cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    repair_center VARCHAR(100)
);

-- 9. SICKW IMEI PARSER REPORTS TABLE
CREATE TABLE IF NOT EXISTS sickw_sickwreport (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    imei VARCHAR(20) NOT NULL,
    raw_response TEXT NOT NULL,
    model_description VARCHAR(255),
    icloud_status VARCHAR(50),
    sim_lock VARCHAR(50),
    warranty_status VARCHAR(100),
    purchase_country VARCHAR(100)
);

-- ==============================================================================
-- ENABLE SUPABASE REALTIME (INSTANT LIVE SYNC BROADCASTS FOR WEB & ANDROID)
-- ==============================================================================
DO $$
BEGIN
    -- Enable replication for tables
    ALTER TABLE inventory_device REPLICA IDENTITY FULL;
    ALTER TABLE shipments_shipment REPLICA IDENTITY FULL;
    ALTER TABLE sales_sale REPLICA IDENTITY FULL;
    ALTER TABLE repairs_repair REPLICA IDENTITY FULL;

    -- Add to publication if not already present
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE inventory_device, shipments_shipment, sales_sale, repairs_repair;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
END $$;

-- Enable Row Level Security (RLS) policies allowing read/write with anon key
ALTER TABLE inventory_device ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments_shipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments_supplier ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_sale ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers_customer ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_user ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    CREATE POLICY "Allow all public read" ON inventory_device FOR SELECT USING (true);
    CREATE POLICY "Allow all public write" ON inventory_device FOR ALL USING (true);
    CREATE POLICY "Allow all public read shipments" ON shipments_shipment FOR SELECT USING (true);
    CREATE POLICY "Allow all public write shipments" ON shipments_shipment FOR ALL USING (true);
    CREATE POLICY "Allow all public read suppliers" ON shipments_supplier FOR SELECT USING (true);
    CREATE POLICY "Allow all public write suppliers" ON shipments_supplier FOR ALL USING (true);
    CREATE POLICY "Allow all public read sales" ON sales_sale FOR SELECT USING (true);
    CREATE POLICY "Allow all public write sales" ON sales_sale FOR ALL USING (true);
    CREATE POLICY "Allow all public read customers" ON customers_customer FOR SELECT USING (true);
    CREATE POLICY "Allow all public write customers" ON customers_customer FOR ALL USING (true);
    CREATE POLICY "Allow all public read users" ON accounts_user FOR SELECT USING (true);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
