-- ==============================================================================
-- GADGET DELUXE - COMPLETE SUPABASE CLOUD POSTGRESQL SCHEMA
-- ==============================================================================
-- Run this entire script in Supabase Dashboard -> SQL Editor -> New Query
-- It creates/updates all tables, columns, indexes, RLS, Realtime & admin user
-- ==============================================================================

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
    phone VARCHAR(30),
    employee_code VARCHAR(50) UNIQUE,
    notes TEXT
);

-- 2. CORE ACTIVITY LOG
CREATE TABLE IF NOT EXISTS core_activitylog (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    action VARCHAR(20) NOT NULL,
    module VARCHAR(50) NOT NULL,
    target_repr VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    ip_address INET,
    actor_id BIGINT REFERENCES accounts_user(id) ON DELETE SET NULL
);

-- 3. SUPPLIERS TABLE
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

-- 4. SHIPMENTS TABLE
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

-- 5. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS customers_customer (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT,
    facebook VARCHAR(255),
    notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_customer_name ON customers_customer(name);
CREATE INDEX IF NOT EXISTS idx_customer_phone ON customers_customer(phone);

-- 6. INVENTORY DEVICES TABLE
CREATE TABLE IF NOT EXISTS inventory_device (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    imei VARCHAR(50) UNIQUE NOT NULL,
    imei2 VARCHAR(50),
    meid VARCHAR(50),
    serial_number VARCHAR(100),
    model VARCHAR(150) NOT NULL,
    model_description VARCHAR(255),
    capacity VARCHAR(50),
    color VARCHAR(50),
    purchase_country VARCHAR(100),
    carrier_policy VARCHAR(150),
    sim_lock_status VARCHAR(100),
    icloud_status VARCHAR(100),
    warranty_status VARCHAR(150),
    estimated_purchase_date DATE,
    demo_unit BOOLEAN NOT NULL DEFAULT FALSE,
    loaner_device BOOLEAN NOT NULL DEFAULT FALSE,
    replacement_device BOOLEAN NOT NULL DEFAULT FALSE,
    replaced_device BOOLEAN NOT NULL DEFAULT FALSE,
    refurbished BOOLEAN NOT NULL DEFAULT FALSE,
    battery_health INTEGER,
    battery_cycle INTEGER,
    display_type VARCHAR(100),
    face_id VARCHAR(50) DEFAULT 'Working',
    true_tone VARCHAR(50) DEFAULT 'Working',
    original_parts_status VARCHAR(150),
    variant VARCHAR(50),
    storage VARCHAR(50),
    ram VARCHAR(50),
    buying_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    current_status VARCHAR(30) NOT NULL DEFAULT 'WAITING_SHIPMENT',
    current_owner_id BIGINT REFERENCES accounts_user(id) ON DELETE SET NULL,
    current_shipment_id BIGINT REFERENCES shipments_shipment(id) ON DELETE SET NULL
);

-- Ensure all columns exist if table was partially created
ALTER TABLE inventory_device ADD COLUMN IF NOT EXISTS carrier_policy VARCHAR(150);
ALTER TABLE inventory_device ADD COLUMN IF NOT EXISTS warranty_status VARCHAR(150);
ALTER TABLE inventory_device ADD COLUMN IF NOT EXISTS estimated_purchase_date DATE;
ALTER TABLE inventory_device ADD COLUMN IF NOT EXISTS demo_unit BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE inventory_device ADD COLUMN IF NOT EXISTS loaner_device BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE inventory_device ADD COLUMN IF NOT EXISTS replacement_device BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE inventory_device ADD COLUMN IF NOT EXISTS replaced_device BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE inventory_device ADD COLUMN IF NOT EXISTS refurbished BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE inventory_device ADD COLUMN IF NOT EXISTS display_type VARCHAR(100);
ALTER TABLE inventory_device ADD COLUMN IF NOT EXISTS face_id VARCHAR(50) DEFAULT 'Working';
ALTER TABLE inventory_device ADD COLUMN IF NOT EXISTS true_tone VARCHAR(50) DEFAULT 'Working';
ALTER TABLE inventory_device ADD COLUMN IF NOT EXISTS original_parts_status VARCHAR(150);
ALTER TABLE inventory_device ADD COLUMN IF NOT EXISTS storage VARCHAR(50);
ALTER TABLE inventory_device ADD COLUMN IF NOT EXISTS ram VARCHAR(50);
ALTER TABLE inventory_device ADD COLUMN IF NOT EXISTS buying_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00;

CREATE INDEX IF NOT EXISTS idx_device_imei ON inventory_device(imei);
CREATE INDEX IF NOT EXISTS idx_device_serial ON inventory_device(serial_number);
CREATE INDEX IF NOT EXISTS idx_device_status ON inventory_device(current_status);

-- 7. CARRIER INFORMATION & WARRANTIES
CREATE TABLE IF NOT EXISTS inventory_carrierinformation (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    device_id BIGINT UNIQUE NOT NULL REFERENCES inventory_device(id) ON DELETE CASCADE,
    carrier_name VARCHAR(100),
    lock_status VARCHAR(100),
    policy_details TEXT
);

CREATE TABLE IF NOT EXISTS inventory_warranty (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    device_id BIGINT NOT NULL REFERENCES inventory_device(id) ON DELETE CASCADE,
    provider VARCHAR(100) NOT NULL DEFAULT 'Apple Care',
    start_date DATE,
    end_date DATE,
    details TEXT,
    claim_status VARCHAR(50) NOT NULL DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS inventory_deviceassignment (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    device_id BIGINT NOT NULL REFERENCES inventory_device(id) ON DELETE CASCADE,
    employee_id BIGINT NOT NULL REFERENCES accounts_user(id) ON DELETE CASCADE,
    assigned_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    returned_date TIMESTAMPTZ,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS inventory_devicehistory (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    device_id BIGINT NOT NULL REFERENCES inventory_device(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES accounts_user(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL,
    old_state TEXT,
    new_state TEXT
);

CREATE TABLE IF NOT EXISTS inventory_photo (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    device_id BIGINT NOT NULL REFERENCES inventory_device(id) ON DELETE CASCADE,
    photo_type VARCHAR(30) NOT NULL DEFAULT 'FRONT',
    image VARCHAR(100) NOT NULL,
    caption VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS inventory_note (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    device_id BIGINT NOT NULL REFERENCES inventory_device(id) ON DELETE CASCADE,
    author_id BIGINT REFERENCES accounts_user(id) ON DELETE SET NULL,
    content TEXT NOT NULL
);

-- 8. SALES INVOICES TABLE
CREATE TABLE IF NOT EXISTS sales_sale (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    device_id BIGINT NOT NULL REFERENCES inventory_device(id) ON DELETE PROTECT,
    customer_id BIGINT REFERENCES customers_customer(id) ON DELETE SET NULL,
    seller_id BIGINT NOT NULL REFERENCES accounts_user(id) ON DELETE PROTECT,
    buying_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    commission_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    profit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'PAID',
    payment_method VARCHAR(20) NOT NULL DEFAULT 'CASH',
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    sale_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT
);

-- Ensure all sales columns exist if created with old schema
ALTER TABLE sales_sale ADD COLUMN IF NOT EXISTS buying_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE sales_sale ADD COLUMN IF NOT EXISTS selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE sales_sale ADD COLUMN IF NOT EXISTS discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE sales_sale ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE sales_sale ADD COLUMN IF NOT EXISTS profit NUMERIC(12, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE sales_sale ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NOT NULL DEFAULT 'PAID';
ALTER TABLE sales_sale ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) NOT NULL DEFAULT 'CASH';
ALTER TABLE sales_sale ADD COLUMN IF NOT EXISTS sale_date TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_sales_invoice ON sales_sale(invoice_number);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales_sale(sale_date);

-- 9. REPAIRS TABLE
CREATE TABLE IF NOT EXISTS repairs_repair (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    device_id BIGINT NOT NULL REFERENCES inventory_device(id) ON DELETE CASCADE,
    issue_description TEXT NOT NULL,
    sent_date DATE NOT NULL DEFAULT CURRENT_DATE,
    returned_date DATE,
    repair_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    repair_center VARCHAR(150) NOT NULL,
    country VARCHAR(100) DEFAULT 'China',
    status VARCHAR(30) NOT NULL DEFAULT 'IN_PROGRESS',
    repair_notes TEXT,
    timeline_log JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Ensure repairs columns exist if old schema was used
ALTER TABLE repairs_repair ADD COLUMN IF NOT EXISTS sent_date DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE repairs_repair ADD COLUMN IF NOT EXISTS returned_date DATE;
ALTER TABLE repairs_repair ADD COLUMN IF NOT EXISTS repair_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE repairs_repair ADD COLUMN IF NOT EXISTS repair_notes TEXT;
ALTER TABLE repairs_repair ADD COLUMN IF NOT EXISTS timeline_log JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 10. SICKW IMEI PARSER REPORTS TABLE
CREATE TABLE IF NOT EXISTS sickw_sickwreport (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    device_id BIGINT REFERENCES inventory_device(id) ON DELETE SET NULL,
    raw_text TEXT NOT NULL,
    parsed_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    model_description VARCHAR(255),
    model VARCHAR(150),
    imei VARCHAR(50),
    imei2 VARCHAR(50),
    meid VARCHAR(50),
    serial_number VARCHAR(100),
    estimated_purchase_date VARCHAR(100),
    warranty_status VARCHAR(150),
    icloud_lock VARCHAR(100),
    demo_unit VARCHAR(50),
    loaner_device VARCHAR(50),
    replaced_device VARCHAR(50),
    replacement_device VARCHAR(50),
    refurbished_device VARCHAR(50),
    purchase_country VARCHAR(100),
    locked_carrier VARCHAR(150),
    sim_lock_status VARCHAR(100)
);

-- 11. DJANGO CORE & SESSION TABLES
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

CREATE TABLE IF NOT EXISTS auth_group_permissions (
    id BIGSERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES auth_group(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES auth_permission(id) ON DELETE CASCADE,
    CONSTRAINT auth_group_permissions_group_id_permission_id_key UNIQUE (group_id, permission_id)
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

CREATE TABLE IF NOT EXISTS django_migrations (
    id BIGSERIAL PRIMARY KEY,
    app VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    applied TIMESTAMPTZ NOT NULL
);

-- Pre-seed Django migrations tracking
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
    ('core', '0001_initial', NOW()),
    ('customers', '0001_initial', NOW()),
    ('shipments', '0001_initial', NOW()),
    ('shipments', '0002_alter_shipment_tracking_number', NOW()),
    ('shipments', '0003_shipment_discount_alter_shipment_shipping_cost', NOW()),
    ('inventory', '0001_initial', NOW()),
    ('inventory', '0002_device_buying_price', NOW()),
    ('inventory', '0003_alter_device_current_status', NOW()),
    ('inventory', '0004_alter_device_variant', NOW()),
    ('sales', '0001_initial', NOW()),
    ('sales', '0002_sale_commission_amount', NOW()),
    ('sales', '0003_alter_sale_customer', NOW()),
    ('repairs', '0001_initial', NOW()),
    ('sickw', '0001_initial', NOW())
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE inventory_device ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments_shipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments_supplier ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_sale ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers_customer ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE repairs_repair ENABLE ROW LEVEL SECURITY;
ALTER TABLE sickw_sickwreport ENABLE ROW LEVEL SECURITY;

-- Allow full access for backend and client keys
DROP POLICY IF EXISTS "Public Full Access inventory_device" ON inventory_device;
CREATE POLICY "Public Full Access inventory_device" ON inventory_device FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access shipments_shipment" ON shipments_shipment;
CREATE POLICY "Public Full Access shipments_shipment" ON shipments_shipment FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access shipments_supplier" ON shipments_supplier;
CREATE POLICY "Public Full Access shipments_supplier" ON shipments_supplier FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access sales_sale" ON sales_sale;
CREATE POLICY "Public Full Access sales_sale" ON sales_sale FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access customers_customer" ON customers_customer;
CREATE POLICY "Public Full Access customers_customer" ON customers_customer FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access accounts_user" ON accounts_user;
CREATE POLICY "Public Full Access accounts_user" ON accounts_user FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access repairs_repair" ON repairs_repair;
CREATE POLICY "Public Full Access repairs_repair" ON repairs_repair FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access sickw_sickwreport" ON sickw_sickwreport;
CREATE POLICY "Public Full Access sickw_sickwreport" ON sickw_sickwreport FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- 13. ENABLE SUPABASE REALTIME REPLICATION
-- ==============================================================================
DO $$
BEGIN
    ALTER TABLE inventory_device REPLICA IDENTITY FULL;
    ALTER TABLE shipments_shipment REPLICA IDENTITY FULL;
    ALTER TABLE sales_sale REPLICA IDENTITY FULL;
    ALTER TABLE repairs_repair REPLICA IDENTITY FULL;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE inventory_device, shipments_shipment, sales_sale, repairs_repair;
    EXCEPTION
        WHEN duplicate_object THEN NULL;
    END;
END $$;

-- ==============================================================================
-- 14. DEFAULT ADMIN USER (USERNAME: jubaer / PASSWORD: 787898)
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
    password = 'pbkdf2_sha256$1500000$8PgcRq8pxdNMtqYYy4R3Xf$TWRvTnYqwUFtabgI7DR0BQSJRrCjfm89iZKH/uLZrko=',
    is_staff = TRUE,
    is_superuser = TRUE,
    role = 'ADMIN',
    is_active = TRUE;
