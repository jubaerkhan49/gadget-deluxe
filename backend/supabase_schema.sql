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

-- 10. SESSIONS & CORE DJANGO TABLES (REQUIRED FOR WEB APP SESSIONS)
CREATE TABLE IF NOT EXISTS django_session (
    session_key VARCHAR(40) PRIMARY KEY,
    session_data TEXT NOT NULL,
    expire_date TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS django_session_expire_date_idx ON django_session(expire_date);

CREATE TABLE IF NOT EXISTS django_content_type (
    id SERIAL PRIMARY KEY,
    app_label VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    CONSTRAINT django_content_type_app_label_model_key UNIQUE (app_label, model)
);

CREATE TABLE IF NOT EXISTS auth_permission (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    content_type_id INTEGER NOT NULL REFERENCES django_content_type(id) ON DELETE CASCADE,
    codename VARCHAR(100) NOT NULL,
    CONSTRAINT auth_permission_content_type_id_codename_key UNIQUE (content_type_id, codename)
);

CREATE TABLE IF NOT EXISTS auth_group (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts_user_groups (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES accounts_user(id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL REFERENCES auth_group(id) ON DELETE CASCADE,
    CONSTRAINT accounts_user_groups_user_id_group_id_key UNIQUE (user_id, group_id)
);

CREATE TABLE IF NOT EXISTS accounts_user_user_permissions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES accounts_user(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES auth_permission(id) ON DELETE CASCADE,
    CONSTRAINT accounts_user_user_permissions_user_id_permission_id_key UNIQUE (user_id, permission_id)
);

CREATE TABLE IF NOT EXISTS django_admin_log (
    id SERIAL PRIMARY KEY,
    action_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    object_id TEXT,
    object_repr VARCHAR(200) NOT NULL,
    action_flag SMALLINT NOT NULL,
    change_message TEXT NOT NULL,
    content_type_id INTEGER REFERENCES django_content_type(id) ON DELETE SET NULL,
    user_id BIGINT NOT NULL REFERENCES accounts_user(id) ON DELETE CASCADE
);

-- RLS Policies
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
    CREATE POLICY "Allow all public write users" ON accounts_user FOR ALL USING (true);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ==============================================================================
-- 10. DJANGO MIGRATIONS HISTORY (PREVENTS MIGRATION CONFLICTS ON RENDER)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS django_migrations (
    id BIGSERIAL PRIMARY KEY,
    app VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    applied TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS django_migrations_app_name_key ON django_migrations(app, name);

INSERT INTO django_migrations (app, name, applied) VALUES
    ('contenttypes', '0001_initial', NOW()),
    ('contenttypes', '0002_remove_content_type_name', NOW()),
    ('auth', '0001_initial', NOW()),
    ('auth', '0002_alter_permission_name_max_length', NOW()),
    ('auth', '0003_alter_user_email_max_length', NOW()),
    ('auth', '0004_alter_user_username_opts', NOW()),
    ('auth', '0005_alter_user_last_login_null', NOW()),
    ('auth', '0006_require_contenttypes_0002', NOW()),
    ('auth', '0007_alter_validators_add_error_messages', NOW()),
    ('auth', '0008_alter_user_username_max_length', NOW()),
    ('auth', '0009_alter_user_last_name_max_length', NOW()),
    ('auth', '0010_alter_group_name_max_length', NOW()),
    ('auth', '0011_update_proxy_permissions', NOW()),
    ('auth', '0012_alter_user_first_name_max_length', NOW()),
    ('accounts', '0001_initial', NOW()),
    ('admin', '0001_initial', NOW()),
    ('admin', '0002_logentry_remove_auto_add', NOW()),
    ('admin', '0003_logentry_add_action_flag_choices', NOW()),
    ('sessions', '0001_initial', NOW()),
    ('customers', '0001_initial', NOW()),
    ('shipments', '0001_initial', NOW()),
    ('shipments', '0002_alter_shipment_shipping_cost', NOW()),
    ('shipments', '0003_shipment_discount_alter_shipment_shipping_cost', NOW()),
    ('inventory', '0001_initial', NOW()),
    ('inventory', '0002_device_current_shipment_alter_device_buying_price_and_more', NOW()),
    ('inventory', '0003_device_variant', NOW()),
    ('inventory', '0004_device_battery_cycle', NOW()),
    ('sales', '0001_initial', NOW()),
    ('repairs', '0001_initial', NOW()),
    ('sickw', '0001_initial', NOW())
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- 11. DEFAULT ADMIN USER CREDENTIALS (USERNAME: jubaer / PASSWORD: requested)
-- ==============================================================================
INSERT INTO accounts_user (
    username, password, first_name, last_name, email, is_staff, is_active, is_superuser, role, phone, employee_code, notes, date_joined
) VALUES (
    'jubaer',
    'pbkdf2_sha256$1500000$8PgcRq8pxdNMtqYYy4R3Xf$TWRvTnYqwUFtabgI7DR0BQSJRrCjfm89iZKH/uLZrko=',
    'Jubaer',
    'Admin',
    'jubaer@gadgetdeluxe.com',
    TRUE,
    TRUE,
    TRUE,
    'ADMIN',
    '',
    '',
    '',
    NOW()
)
ON CONFLICT (username) DO UPDATE SET
    password = EXCLUDED.password,
    is_staff = TRUE,
    is_superuser = TRUE,
    role = 'ADMIN',
    is_active = TRUE;
