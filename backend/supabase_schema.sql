-- ==============================================================================
-- GADGET DELUXE - COMPLETE FRESH DATABASE SETUP & DATA RESTORE
-- ==============================================================================
-- This script completely creates all clean tables, restores all 21 devices,
-- shipments, repairs, history, and users, and sets up Realtime & Admin credentials.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. DROP ALL OLD TABLES (CLEAN SLATE TO AVOID ANY SCHEMA CONFLICTS)
DROP TABLE IF EXISTS inventory_note CASCADE;
DROP TABLE IF EXISTS inventory_photo CASCADE;
DROP TABLE IF EXISTS inventory_carrierinformation CASCADE;
DROP TABLE IF EXISTS inventory_warranty CASCADE;
DROP TABLE IF EXISTS inventory_deviceassignment CASCADE;
DROP TABLE IF EXISTS inventory_devicehistory CASCADE;
DROP TABLE IF EXISTS repairs_repair CASCADE;
DROP TABLE IF EXISTS sickw_sickwreport CASCADE;
DROP TABLE IF EXISTS sales_sale CASCADE;
DROP TABLE IF EXISTS inventory_device CASCADE;
DROP TABLE IF EXISTS customers_customer CASCADE;
DROP TABLE IF EXISTS shipments_shipment CASCADE;
DROP TABLE IF EXISTS shipments_supplier CASCADE;
DROP TABLE IF EXISTS core_activitylog CASCADE;
DROP TABLE IF EXISTS accounts_user_groups CASCADE;
DROP TABLE IF EXISTS accounts_user_user_permissions CASCADE;
DROP TABLE IF EXISTS django_admin_log CASCADE;
DROP TABLE IF EXISTS auth_group_permissions CASCADE;
DROP TABLE IF EXISTS auth_permission CASCADE;
DROP TABLE IF EXISTS auth_group CASCADE;
DROP TABLE IF EXISTS accounts_user CASCADE;
DROP TABLE IF EXISTS django_session CASCADE;
DROP TABLE IF EXISTS django_content_type CASCADE;
DROP TABLE IF EXISTS django_migrations CASCADE;

-- 2. CREATE CLEAN SCHEMAS MATCHING DJANGO MODELS
CREATE TABLE accounts_user (
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

CREATE TABLE core_activitylog (
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

CREATE TABLE shipments_supplier (
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

CREATE TABLE shipments_shipment (
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
CREATE INDEX idx_shipments_tracking ON shipments_shipment(tracking_number);

CREATE TABLE customers_customer (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(50) NOT NULL DEFAULT '',
    address TEXT,
    facebook VARCHAR(255),
    notes TEXT
);
CREATE INDEX idx_customer_name ON customers_customer(name);
CREATE INDEX idx_customer_phone ON customers_customer(phone);

CREATE TABLE inventory_device (
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
    current_shipment_id BIGINT REFERENCES shipments_shipment(id) ON DELETE SET NULL,
    received_date_bd DATE
);
CREATE INDEX idx_device_imei ON inventory_device(imei);
CREATE INDEX idx_device_serial ON inventory_device(serial_number);
CREATE INDEX idx_device_status ON inventory_device(current_status);

CREATE TABLE inventory_carrierinformation (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    device_id BIGINT UNIQUE NOT NULL REFERENCES inventory_device(id) ON DELETE CASCADE,
    carrier_name VARCHAR(100),
    lock_status VARCHAR(100),
    policy_details TEXT
);

CREATE TABLE inventory_warranty (
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

CREATE TABLE inventory_deviceassignment (
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

CREATE TABLE inventory_devicehistory (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    device_id BIGINT NOT NULL REFERENCES inventory_device(id) ON DELETE CASCADE,
    user_id BIGINT REFERENCES accounts_user(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL,
    old_state TEXT,
    new_state TEXT
);

CREATE TABLE inventory_photo (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    device_id BIGINT NOT NULL REFERENCES inventory_device(id) ON DELETE CASCADE,
    photo_type VARCHAR(30) NOT NULL DEFAULT 'FRONT',
    image VARCHAR(100) NOT NULL,
    caption VARCHAR(255)
);

CREATE TABLE inventory_note (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    device_id BIGINT NOT NULL REFERENCES inventory_device(id) ON DELETE CASCADE,
    author_id BIGINT REFERENCES accounts_user(id) ON DELETE SET NULL,
    content TEXT NOT NULL
);

CREATE TABLE sales_sale (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    device_id BIGINT NOT NULL REFERENCES inventory_device(id) ON DELETE RESTRICT,
    customer_id BIGINT REFERENCES customers_customer(id) ON DELETE SET NULL,
    seller_id BIGINT NOT NULL REFERENCES accounts_user(id) ON DELETE RESTRICT,
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
CREATE INDEX idx_sales_invoice ON sales_sale(invoice_number);
CREATE INDEX idx_sales_date ON sales_sale(sale_date);

CREATE TABLE repairs_repair (
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

CREATE TABLE sickw_sickwreport (
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

CREATE TABLE django_session (
    session_key VARCHAR(40) PRIMARY KEY,
    session_data TEXT NOT NULL,
    expire_date TIMESTAMPTZ NOT NULL
);
CREATE INDEX django_session_expire_date_idx ON django_session(expire_date);

CREATE TABLE django_content_type (
    id SERIAL PRIMARY KEY,
    app_label VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    CONSTRAINT django_content_type_app_label_model_key UNIQUE (app_label, model)
);

CREATE TABLE auth_permission (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    content_type_id INTEGER NOT NULL REFERENCES django_content_type(id) ON DELETE CASCADE,
    codename VARCHAR(100) NOT NULL,
    CONSTRAINT auth_permission_content_type_id_codename_key UNIQUE (content_type_id, codename)
);

CREATE TABLE auth_group (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) UNIQUE NOT NULL
);

CREATE TABLE auth_group_permissions (
    id BIGSERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES auth_group(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES auth_permission(id) ON DELETE CASCADE,
    CONSTRAINT auth_group_permissions_group_id_permission_id_key UNIQUE (group_id, permission_id)
);

CREATE TABLE accounts_user_groups (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES accounts_user(id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL REFERENCES auth_group(id) ON DELETE CASCADE,
    CONSTRAINT accounts_user_groups_user_id_group_id_key UNIQUE (user_id, group_id)
);

CREATE TABLE accounts_user_user_permissions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES accounts_user(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES auth_permission(id) ON DELETE CASCADE,
    CONSTRAINT accounts_user_user_permissions_user_id_permission_id_key UNIQUE (user_id, permission_id)
);

CREATE TABLE django_admin_log (
    id SERIAL PRIMARY KEY,
    action_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    object_id TEXT,
    object_repr VARCHAR(200) NOT NULL,
    action_flag SMALLINT NOT NULL,
    change_message TEXT NOT NULL,
    content_type_id INTEGER REFERENCES django_content_type(id) ON DELETE SET NULL,
    user_id BIGINT NOT NULL REFERENCES accounts_user(id) ON DELETE CASCADE
);

CREATE TABLE django_migrations (
    id BIGSERIAL PRIMARY KEY,
    app VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    applied TIMESTAMPTZ NOT NULL
);

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
    ('sickw', '0001_initial', NOW());

-- 3. RESTORE ALL EXISTING DATA
-- DATA RESTORE FOR accounts_user (4 rows)
INSERT INTO accounts_user (id, password, last_login, is_superuser, username, first_name, last_name, email, is_staff, is_active, date_joined, role, phone, employee_code, notes) VALUES (1, 'pbkdf2_sha256$1500000$knQFKBjL8cMRZUEbcxtJxD$Y5MmE9CyD2Owa/oE7propeRSucDrfQl6t228bVmzZD8=', '2026-09-08 21:15:11.107737', TRUE, 'jubaer', 'jubaer', '', 'admin@inventory.local', TRUE, TRUE, '2026-08-03 19:07:42.547420', 'ADMIN', NULL, NULL, NULL);
INSERT INTO accounts_user (id, password, last_login, is_superuser, username, first_name, last_name, email, is_staff, is_active, date_joined, role, phone, employee_code, notes) VALUES (2, 'pbkdf2_sha256$1200000$dCbEOvMGWV80JIIYn0iz2O$EeYLZTtkawP+EfPGEquNeW6AN4+5Fd6ycC8BbT3PlAw=', NULL, FALSE, 'ashraf', 'Ashraf', 'Employee', '', FALSE, TRUE, '2026-08-03 19:07:43.053907', 'EMPLOYEE', NULL, 'EMP001', NULL);
INSERT INTO accounts_user (id, password, last_login, is_superuser, username, first_name, last_name, email, is_staff, is_active, date_joined, role, phone, employee_code, notes) VALUES (3, 'pbkdf2_sha256$1200000$lF021KAbYVDjRFhCb6TIGe$0MBJREi6v9cKpX52Xe0hzReZT8oUQEPIkBjgRevQKJM=', NULL, FALSE, 'emon', 'Emon', 'Employee', '', FALSE, TRUE, '2026-08-03 19:07:43.577906', 'EMPLOYEE', NULL, 'EMP002', NULL);
INSERT INTO accounts_user (id, password, last_login, is_superuser, username, first_name, last_name, email, is_staff, is_active, date_joined, role, phone, employee_code, notes) VALUES (4, 'pbkdf2_sha256$1200000$ANqxkd24YDAasbQMDuYpwW$R3VTe3MOlwy5D544rPDGswYC0YOnpEvI6TfG7BYX+jI=', NULL, FALSE, 'ochi', 'Ochi', 'Employee', '', FALSE, TRUE, '2026-08-03 19:07:44.102087', 'EMPLOYEE', NULL, 'EMP003', NULL);
SELECT setval(pg_get_serial_sequence('accounts_user', 'id'), COALESCE((SELECT MAX(id) FROM accounts_user), 1));

-- DATA RESTORE FOR shipments_supplier (2 rows)
INSERT INTO shipments_supplier (id, created_at, updated_at, name, contact_person, email, phone, country, address, notes) VALUES (2, '2026-08-07 23:22:50.393617', '2026-08-07 23:22:50.393672', 'Qifeng', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO shipments_supplier (id, created_at, updated_at, name, contact_person, email, phone, country, address, notes) VALUES (3, '2026-09-08 22:20:03.709122', '2026-09-08 22:20:03.709156', 'Nanfeng Communications', NULL, NULL, NULL, NULL, NULL, NULL);
SELECT setval(pg_get_serial_sequence('shipments_supplier', 'id'), COALESCE((SELECT MAX(id) FROM shipments_supplier), 1));

-- DATA RESTORE FOR shipments_shipment (1 rows)
INSERT INTO shipments_shipment (id, created_at, updated_at, tracking_number, shipping_company, receive_date, shipping_cost, country, notes, supplier_id, discount) VALUES (4, '2026-09-08 22:20:03.713489', '2026-09-08 22:20:03.713537', 'SF5152145321384', NULL, NULL, 4500, NULL, NULL, 3, 0);
SELECT setval(pg_get_serial_sequence('shipments_shipment', 'id'), COALESCE((SELECT MAX(id) FROM shipments_shipment), 1));

-- DATA RESTORE FOR customers_customer (1 rows)
INSERT INTO customers_customer (id, created_at, updated_at, name, phone, address, facebook, notes) VALUES (1, '2026-08-07 23:27:10.942420', '2026-08-07 23:27:10.942513', 'General Customer', '', NULL, NULL, NULL);
SELECT setval(pg_get_serial_sequence('customers_customer', 'id'), COALESCE((SELECT MAX(id) FROM customers_customer), 1));

-- DATA RESTORE FOR inventory_device (21 rows)
INSERT INTO inventory_device (id, created_at, updated_at, imei, imei2, meid, serial_number, model, model_description, capacity, color, purchase_country, carrier_policy, sim_lock_status, icloud_status, warranty_status, estimated_purchase_date, demo_unit, loaner_device, replacement_device, replaced_device, refurbished, battery_health, battery_cycle, display_type, face_id, true_tone, original_parts_status, storage, ram, notes, current_status, current_owner_id, current_shipment_id, buying_price, variant) VALUES (7, '2026-09-08 21:33:18.241568', '2026-09-08 21:48:41.698765', '351661824991628', NULL, NULL, NULL, 'iPhone 15 Pro Max', NULL, '256', 'Black Titanium', NULL, NULL, 'Locked', NULL, 'Standard', NULL, FALSE, FALSE, FALSE, FALSE, FALSE, 100, 32, NULL, 'Working', 'Working', NULL, NULL, NULL, NULL, 'IN_STOCK', 1, NULL, 62250, 'Modified');
INSERT INTO inventory_device (id, created_at, updated_at, imei, imei2, meid, serial_number, model, model_description, capacity, color, purchase_country, carrier_policy, sim_lock_status, icloud_status, warranty_status, estimated_purchase_date, demo_unit, loaner_device, replacement_device, replaced_device, refurbished, battery_health, battery_cycle, display_type, face_id, true_tone, original_parts_status, storage, ram, notes, current_status, current_owner_id, current_shipment_id, buying_price, variant) VALUES (8, '2026-09-08 21:43:21.097258', '2026-09-08 21:58:59.600195', '352229498876431', NULL, NULL, NULL, 'iPhone 15 Pro Max', NULL, '256GB', 'Natural Titanium', NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, FALSE, FALSE, FALSE, 98, 169, NULL, 'Working', 'Working', NULL, NULL, NULL, NULL, 'IN_STOCK', 1, NULL, 63650, 'Modified');
INSERT INTO inventory_device (id, created_at, updated_at, imei, imei2, meid, serial_number, model, model_description, capacity, color, purchase_country, carrier_policy, sim_lock_status, icloud_status, warranty_status, estimated_purchase_date, demo_unit, loaner_device, replacement_device, replaced_device, refurbished, battery_health, battery_cycle, display_type, face_id, true_tone, original_parts_status, storage, ram, notes, current_status, current_owner_id, current_shipment_id, buying_price, variant) VALUES (9, '2026-09-08 21:53:05.177702', '2026-09-08 21:53:52.115504', '350793226078042', NULL, NULL, NULL, 'iPhone 15 Pro Max', 'iPhone 15 Pro Max 256GB Natural Titanium', '256GB', 'Natural Titanium', NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, FALSE, FALSE, FALSE, 88, 583, NULL, 'Working', 'Working', NULL, NULL, NULL, NULL, 'IN_STOCK', 3, NULL, 28500, 'Bypass');
INSERT INTO inventory_device (id, created_at, updated_at, imei, imei2, meid, serial_number, model, model_description, capacity, color, purchase_country, carrier_policy, sim_lock_status, icloud_status, warranty_status, estimated_purchase_date, demo_unit, loaner_device, replacement_device, replaced_device, refurbished, battery_health, battery_cycle, display_type, face_id, true_tone, original_parts_status, storage, ram, notes, current_status, current_owner_id, current_shipment_id, buying_price, variant) VALUES (10, '2026-09-08 21:54:29.854238', '2026-09-08 21:55:29.580256', '355364281556697', NULL, NULL, NULL, 'iPhone 15 Pro Max', 'iPhone 15 Pro Max 256GB Natural Titanium', '256GB', 'Natural Titanium', NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, FALSE, FALSE, FALSE, 95, NULL, NULL, 'Working', 'Working', NULL, NULL, NULL, NULL, 'IN_STOCK', 2, NULL, 71700, 'USA eSim');
INSERT INTO inventory_device (id, created_at, updated_at, imei, imei2, meid, serial_number, model, model_description, capacity, color, purchase_country, carrier_policy, sim_lock_status, icloud_status, warranty_status, estimated_purchase_date, demo_unit, loaner_device, replacement_device, replaced_device, refurbished, battery_health, battery_cycle, display_type, face_id, true_tone, original_parts_status, storage, ram, notes, current_status, current_owner_id, current_shipment_id, buying_price, variant) VALUES (11, '2026-09-08 21:55:55.789188', '2026-09-08 21:56:59.055115', '356511217109392', NULL, NULL, NULL, 'iPhone 15 Pro Max', 'iPhone 15 Pro Max 256GB Natural Titanium', '256GB', 'Natural Titanium', NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, FALSE, FALSE, FALSE, 95, NULL, NULL, 'Working', 'Working', NULL, NULL, NULL, NULL, 'IN_STOCK', 2, NULL, 71700, 'USA eSim');
INSERT INTO inventory_device (id, created_at, updated_at, imei, imei2, meid, serial_number, model, model_description, capacity, color, purchase_country, carrier_policy, sim_lock_status, icloud_status, warranty_status, estimated_purchase_date, demo_unit, loaner_device, replacement_device, replaced_device, refurbished, battery_health, battery_cycle, display_type, face_id, true_tone, original_parts_status, storage, ram, notes, current_status, current_owner_id, current_shipment_id, buying_price, variant) VALUES (12, '2026-09-08 21:57:36.205472', '2026-09-08 21:58:05.877432', '355364286013512', NULL, NULL, NULL, 'iPhone 15 Pro Max', 'iPhone 15 Pro Max 256GB Natural Titanium', '256GB', 'Natural Titanium', NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, FALSE, FALSE, FALSE, 95, NULL, NULL, 'Working', 'Working', NULL, NULL, NULL, NULL, 'IN_STOCK', 2, NULL, 71700, 'USA eSim');
INSERT INTO inventory_device (id, created_at, updated_at, imei, imei2, meid, serial_number, model, model_description, capacity, color, purchase_country, carrier_policy, sim_lock_status, icloud_status, warranty_status, estimated_purchase_date, demo_unit, loaner_device, replacement_device, replaced_device, refurbished, battery_health, battery_cycle, display_type, face_id, true_tone, original_parts_status, storage, ram, notes, current_status, current_owner_id, current_shipment_id, buying_price, variant) VALUES (13, '2026-09-08 22:03:01.085534', '2026-09-08 22:03:11.845108', '353171922843182', NULL, NULL, NULL, 'iPhone 15 Pro', 'iPhone 15 Pro 128GB White Titanium', '128GB', 'White Titanium', NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, FALSE, FALSE, FALSE, 100, NULL, NULL, 'Working', 'Working', NULL, NULL, NULL, NULL, 'IN_STOCK', 3, NULL, 50000, 'Modified');
INSERT INTO inventory_device (id, created_at, updated_at, imei, imei2, meid, serial_number, model, model_description, capacity, color, purchase_country, carrier_policy, sim_lock_status, icloud_status, warranty_status, estimated_purchase_date, demo_unit, loaner_device, replacement_device, replaced_device, refurbished, battery_health, battery_cycle, display_type, face_id, true_tone, original_parts_status, storage, ram, notes, current_status, current_owner_id, current_shipment_id, buying_price, variant) VALUES (14, '2026-09-08 22:04:14.912976', '2026-09-08 22:04:21.791087', '354773164991469', NULL, NULL, NULL, 'iPhone 15 Pro Max', 'iPhone 15 Pro Max 256GB Natural Titanium', '256GB', 'Natural Titanium', NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, FALSE, FALSE, FALSE, 98, NULL, NULL, 'Working', 'Working', NULL, NULL, NULL, NULL, 'IN_STOCK', 3, NULL, 63500, 'Modified');
INSERT INTO inventory_device (id, created_at, updated_at, imei, imei2, meid, serial_number, model, model_description, capacity, color, purchase_country, carrier_policy, sim_lock_status, icloud_status, warranty_status, estimated_purchase_date, demo_unit, loaner_device, replacement_device, replaced_device, refurbished, battery_health, battery_cycle, display_type, face_id, true_tone, original_parts_status, storage, ram, notes, current_status, current_owner_id, current_shipment_id, buying_price, variant) VALUES (15, '2026-09-08 22:05:08.473260', '2026-09-08 22:07:33.822502', '354934256271406', NULL, NULL, NULL, 'iPhone 15 Pro Max', 'iPhone 15 Pro Max 256GB Natural Titanium', '256GB', 'Natural Titanium', NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, FALSE, FALSE, FALSE, NULL, NULL, NULL, 'Working', 'Working', NULL, NULL, NULL, NULL, 'IN_STOCK', 3, NULL, 63500, 'Modified');
INSERT INTO inventory_device (id, created_at, updated_at, imei, imei2, meid, serial_number, model, model_description, capacity, color, purchase_country, carrier_policy, sim_lock_status, icloud_status, warranty_status, estimated_purchase_date, demo_unit, loaner_device, replacement_device, replaced_device, refurbished, battery_health, battery_cycle, display_type, face_id, true_tone, original_parts_status, storage, ram, notes, current_status, current_owner_id, current_shipment_id, buying_price, variant) VALUES (16, '2026-09-08 22:06:29.246067', '2026-09-08 22:07:21.939319', '356964997436545', NULL, NULL, NULL, 'iPhone 15 Pro Max', 'iPhone 15 Pro Max 256GB Natural Titanium', '256GB', 'Natural Titanium', NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, FALSE, FALSE, FALSE, NULL, NULL, NULL, 'Working', 'Working', NULL, NULL, NULL, NULL, 'IN_STOCK', 3, NULL, 63500, 'Modified');
INSERT INTO inventory_device (id, created_at, updated_at, imei, imei2, meid, serial_number, model, model_description, capacity, color, purchase_country, carrier_policy, sim_lock_status, icloud_status, warranty_status, estimated_purchase_date, demo_unit, loaner_device, replacement_device, replaced_device, refurbished, battery_health, battery_cycle, display_type, face_id, true_tone, original_parts_status, storage, ram, notes, current_status, current_owner_id, current_shipment_id, buying_price, variant) VALUES (17, '2026-09-08 22:20:03.722761', '2026-09-08 22:20:03.722785', '358071247842163', NULL, NULL, '', 'iPhone 15 Pro Max', 'iPhone 15 Pro Max 256GB Natural Titanium', '256GB', 'Natural Titanium', NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, FALSE, FALSE, FALSE, NULL, NULL, NULL, 'Working', 'Working', NULL, NULL, NULL, NULL, 'WAITING_SHIPMENT', NULL, 4, 28500, 'Bypass');
INSERT INTO inventory_device (id, created_at, updated_at, imei, imei2, meid, serial_number, model, model_description, capacity, color, purchase_country, carrier_policy, sim_lock_status, icloud_status, warranty_status, estimated_purchase_date, demo_unit, loaner_device, replacement_device, replaced_device, refurbished, battery_health, battery_cycle, display_type, face_id, true_tone, original_parts_status, storage, ram, notes, current_status, current_owner_id, current_shipment_id, buying_price, variant) VALUES (18, '2026-09-08 22:20:03.737257', '2026-09-08 22:20:03.737302', '355364282412130', NULL, NULL, '', 'iPhone 15 Pro Max', 'iPhone 15 Pro Max 256GB Natural Titanium', '256GB', 'Natural Titanium', NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, FALSE, FALSE, FALSE, NULL, NULL, NULL, 'Working', 'Working', NULL, NULL, NULL, NULL, 'WAITING_SHIPMENT', NULL, 4, 28500, 'Bypass');
INSERT INTO inventory_device (id, created_at, updated_at, imei, imei2, meid, serial_number, model, model_description, capacity, color, purchase_country, carrier_policy, sim_lock_status, icloud_status, warranty_status, estimated_purchase_date, demo_unit, loaner_device, replacement_device, replaced_device, refurbished, battery_health, battery_cycle, display_type, face_id, true_tone, original_parts_status, storage, ram, notes, current_status, current_owner_id, current_shipment_id, buying_price, variant) VALUES (19, '2026-09-08 22:20:03.750163', '2026-09-08 22:20:03.750209', '351503409294558', NULL, NULL, '', 'iPhone 15 Pro Max', 'iPhone 15 Pro Max 256GB Natural Titanium', '256GB', 'Natural Titanium', NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, FALSE, FALSE, FALSE, NULL, NULL, NULL, 'Working', 'Working', NULL, NULL, NULL, NULL, 'WAITING_SHIPMENT', NULL, 4, 28500, 'Bypass');
INSERT INTO inventory_device (id, created_at, updated_at, imei, imei2, meid, serial_number, model, model_description, capacity, color, purchase_country, carrier_policy, sim_lock_status, icloud_status, warranty_status, estimated_purchase_date, demo_unit, loaner_device, replacement_device, replaced_device, refurbished, battery_health, battery_cycle, display_type, face_id, true_tone, original_parts_status, storage, ram, notes, current_status, current_owner_id, current_shipment_id, buying_price, variant) VALUES (20, '2026-09-08 22:20:03.769146', '2026-09-08 22:20:03.769188', '354773161921055', NULL, NULL, '', 'iPhone 15 Pro Max', 'iPhone 15 Pro Max 256GB Natural Titanium', '256GB', 'Natural Titanium', NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, FALSE, FALSE, FALSE, NULL, NULL, NULL, 'Working', 'Working', NULL, NULL, NULL, NULL, 'WAITING_SHIPMENT', NULL, 4, 28500, 'Bypass');
INSERT INTO inventory_device (id, created_at, updated_at, imei, imei2, meid, serial_number, model, model_description, capacity, color, purchase_country, carrier_policy, sim_lock_status, icloud_status, warranty_status, estimated_purchase_date, demo_unit, loaner_device, replacement_device, replaced_device, refurbished, battery_health, battery_cycle, display_type, face_id, true_tone, original_parts_status, storage, ram, notes, current_status, current_owner_id, current_shipment_id, buying_price, variant) VALUES (21, '2026-09-08 22:20:03.783312', '2026-09-08 22:20:03.783353', '350091878186563', NULL, NULL, '', 'iPhone 15 Pro Max', 'iPhone 15 Pro Max 256GB Natural Titanium', '256GB', 'Natural Titanium', NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, FALSE, FALSE, FALSE, NULL, NULL, NULL, 'Working', 'Working', NULL, NULL, NULL, NULL, 'WAITING_SHIPMENT', NULL, 4, 28500, 'Bypass');
INSERT INTO inventory_device (id, created_at, updated_at, imei, imei2, meid, serial_number, model, model_description, capacity, color, purchase_country, carrier_policy, sim_lock_status, icloud_status, warranty_status, estimated_purchase_date, demo_unit, loaner_device, replacement_device, replaced_device, refurbished, battery_health, battery_cycle, display_type, face_id, true_tone, original_parts_status, storage, ram, notes, current_status, current_owner_id, current_shipment_id, buying_price, variant) VALUES (22, '2026-09-08 22:20:03.797050', '2026-09-08 22:20:03.797088', '352832403787732', NULL, NULL, '', 'iPhone 15 Pro Max', 'iPhone 15 Pro Max 256GB Natural Titanium', '256GB', 'Natural Titanium', NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, FALSE, FALSE, FALSE, NULL, NULL, NULL, 'Working', 'Working', NULL, NULL, NULL, NULL, 'WAITING_SHIPMENT', NULL, 4, 28500, 'Bypass');
INSERT INTO inventory_device (id, created_at, updated_at, imei, imei2, meid, serial_number, model, model_description, capacity, color, purchase_country, carrier_policy, sim_lock_status, icloud_status, warranty_status, estimated_purchase_date, demo_unit, loaner_device, replacement_device, replaced_device, refurbished, battery_health, battery_cycle, display_type, face_id, true_tone, original_parts_status, storage, ram, notes, current_status, current_owner_id, current_shipment_id, buying_price, variant) VALUES (23, '2026-09-08 22:20:03.809217', '2026-09-08 22:20:03.809247', '356642150476983', NULL, NULL, '', 'iPhone 15 Pro Max', 'iPhone 15 Pro Max 256GB Natural Titanium', '256GB', 'Natural Titanium', NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, FALSE, FALSE, FALSE, NULL, NULL, NULL, 'Working', 'Working', NULL, NULL, NULL, NULL, 'WAITING_SHIPMENT', NULL, 4, 28500, 'Bypass');
INSERT INTO inventory_device (id, created_at, updated_at, imei, imei2, meid, serial_number, model, model_description, capacity, color, purchase_country, carrier_policy, sim_lock_status, icloud_status, warranty_status, estimated_purchase_date, demo_unit, loaner_device, replacement_device, replaced_device, refurbished, battery_health, battery_cycle, display_type, face_id, true_tone, original_parts_status, storage, ram, notes, current_status, current_owner_id, current_shipment_id, buying_price, variant) VALUES (24, '2026-09-08 22:20:03.819821', '2026-09-08 22:20:03.819853', '355364286627493', NULL, NULL, '', 'iPhone 15 Pro Max', 'iPhone 15 Pro Max 256GB Natural Titanium', '256GB', 'Natural Titanium', NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, FALSE, FALSE, FALSE, NULL, NULL, NULL, 'Working', 'Working', NULL, NULL, NULL, NULL, 'WAITING_SHIPMENT', NULL, 4, 28500, 'Bypass');
INSERT INTO inventory_device (id, created_at, updated_at, imei, imei2, meid, serial_number, model, model_description, capacity, color, purchase_country, carrier_policy, sim_lock_status, icloud_status, warranty_status, estimated_purchase_date, demo_unit, loaner_device, replacement_device, replaced_device, refurbished, battery_health, battery_cycle, display_type, face_id, true_tone, original_parts_status, storage, ram, notes, current_status, current_owner_id, current_shipment_id, buying_price, variant) VALUES (25, '2026-09-08 22:20:03.829940', '2026-09-08 22:20:03.829985', '350278024078295', NULL, NULL, '', 'iPhone 15 Pro Max', 'iPhone 15 Pro Max 256GB Natural Titanium', '256GB', 'Natural Titanium', NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, FALSE, FALSE, FALSE, NULL, NULL, NULL, 'Working', 'Working', NULL, NULL, NULL, NULL, 'WAITING_SHIPMENT', NULL, 4, 28500, 'Bypass');
INSERT INTO inventory_device (id, created_at, updated_at, imei, imei2, meid, serial_number, model, model_description, capacity, color, purchase_country, carrier_policy, sim_lock_status, icloud_status, warranty_status, estimated_purchase_date, demo_unit, loaner_device, replacement_device, replaced_device, refurbished, battery_health, battery_cycle, display_type, face_id, true_tone, original_parts_status, storage, ram, notes, current_status, current_owner_id, current_shipment_id, buying_price, variant) VALUES (26, '2026-09-08 22:20:03.846816', '2026-09-08 22:20:03.846875', '357370822634164', NULL, NULL, '', 'iPhone 15 Pro Max', 'iPhone 15 Pro Max 256GB Natural Titanium', '256GB', 'Natural Titanium', NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, FALSE, FALSE, FALSE, NULL, NULL, NULL, 'Working', 'Working', NULL, NULL, NULL, NULL, 'WAITING_SHIPMENT', NULL, 4, 28500, 'Bypass');
INSERT INTO inventory_device (id, created_at, updated_at, imei, imei2, meid, serial_number, model, model_description, capacity, color, purchase_country, carrier_policy, sim_lock_status, icloud_status, warranty_status, estimated_purchase_date, demo_unit, loaner_device, replacement_device, replaced_device, refurbished, battery_health, battery_cycle, display_type, face_id, true_tone, original_parts_status, storage, ram, notes, current_status, current_owner_id, current_shipment_id, buying_price, variant) VALUES (27, '2026-09-08 22:24:57.483616', '2026-09-08 22:26:04.453918', '350278021672603', NULL, NULL, NULL, 'iPhone 15 Pro Max', 'iPhone 15 Pro Max 256GB Natural Titanium', '256GB', 'Natural Titanium', NULL, NULL, NULL, NULL, NULL, NULL, FALSE, FALSE, FALSE, FALSE, FALSE, 98, NULL, NULL, 'Working', 'Working', NULL, NULL, NULL, NULL, 'UNDER_REPAIR', 1, NULL, 63500, 'Modified');
SELECT setval(pg_get_serial_sequence('inventory_device', 'id'), COALESCE((SELECT MAX(id) FROM inventory_device), 1));

-- DATA RESTORE FOR inventory_deviceassignment (10 rows)
INSERT INTO inventory_deviceassignment (id, created_at, updated_at, assigned_date, returned_date, notes, is_active, device_id, employee_id) VALUES (8, '2026-09-08 21:33:48.484404', '2026-09-08 21:33:48.484446', '2026-09-08 21:33:48.484492', NULL, '', TRUE, 7, 1);
INSERT INTO inventory_deviceassignment (id, created_at, updated_at, assigned_date, returned_date, notes, is_active, device_id, employee_id) VALUES (9, '2026-09-08 21:52:07.909075', '2026-09-08 21:52:07.909127', '2026-09-08 21:52:07.909186', NULL, '', TRUE, 8, 1);
INSERT INTO inventory_deviceassignment (id, created_at, updated_at, assigned_date, returned_date, notes, is_active, device_id, employee_id) VALUES (10, '2026-09-08 21:54:40.795098', '2026-09-08 21:54:40.795140', '2026-09-08 21:54:40.795181', NULL, '', TRUE, 10, 2);
INSERT INTO inventory_deviceassignment (id, created_at, updated_at, assigned_date, returned_date, notes, is_active, device_id, employee_id) VALUES (11, '2026-09-08 21:56:00.289968', '2026-09-08 21:56:00.290009', '2026-09-08 21:56:00.290056', NULL, '', TRUE, 11, 2);
INSERT INTO inventory_deviceassignment (id, created_at, updated_at, assigned_date, returned_date, notes, is_active, device_id, employee_id) VALUES (12, '2026-09-08 21:57:41.819138', '2026-09-08 21:57:41.819177', '2026-09-08 21:57:41.819220', NULL, '', TRUE, 12, 2);
INSERT INTO inventory_deviceassignment (id, created_at, updated_at, assigned_date, returned_date, notes, is_active, device_id, employee_id) VALUES (13, '2026-09-08 22:03:07.951459', '2026-09-08 22:03:07.951501', '2026-09-08 22:03:07.951549', NULL, '', TRUE, 13, 3);
INSERT INTO inventory_deviceassignment (id, created_at, updated_at, assigned_date, returned_date, notes, is_active, device_id, employee_id) VALUES (14, '2026-09-08 22:04:18.911905', '2026-09-08 22:04:18.911929', '2026-09-08 22:04:18.911949', NULL, '', TRUE, 14, 3);
INSERT INTO inventory_deviceassignment (id, created_at, updated_at, assigned_date, returned_date, notes, is_active, device_id, employee_id) VALUES (15, '2026-09-08 22:05:12.180446', '2026-09-08 22:05:12.180466', '2026-09-08 22:05:12.180487', NULL, '', TRUE, 15, 3);
INSERT INTO inventory_deviceassignment (id, created_at, updated_at, assigned_date, returned_date, notes, is_active, device_id, employee_id) VALUES (16, '2026-09-08 22:06:33.587369', '2026-09-08 22:06:33.587391', '2026-09-08 22:06:33.587412', NULL, '', TRUE, 16, 3);
INSERT INTO inventory_deviceassignment (id, created_at, updated_at, assigned_date, returned_date, notes, is_active, device_id, employee_id) VALUES (17, '2026-09-08 22:25:01.968755', '2026-09-08 22:25:01.968807', '2026-09-08 22:25:01.968859', NULL, '', TRUE, 27, 1);
SELECT setval(pg_get_serial_sequence('inventory_deviceassignment', 'id'), COALESCE((SELECT MAX(id) FROM inventory_deviceassignment), 1));

-- DATA RESTORE FOR inventory_devicehistory (56 rows)
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (27, '2026-09-08 21:33:18.246471', '2026-09-08 21:33:18.246499', 'CREATION', NULL, 'Device registered with status IN_STOCK', 7, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (28, '2026-09-08 21:33:48.497908', '2026-09-08 21:33:48.497950', 'ASSIGNMENT', 'Owner: None', 'Assigned to admin', 7, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (29, '2026-09-08 21:40:36.021829', '2026-09-08 21:40:36.021880', 'UPDATE', NULL, 'Hardware specs updated: Color=Black Titanium, Health=100%, Cycles=None', 7, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (30, '2026-09-08 21:43:21.102933', '2026-09-08 21:43:21.102964', 'CREATION', NULL, 'Device registered with status IN_STOCK', 8, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (31, '2026-09-08 21:43:28.751455', '2026-09-08 21:43:28.751495', 'UPDATE', NULL, 'Hardware specs updated: Color=Natural Titanium, Health=98%, Cycles=169', 8, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (32, '2026-09-08 21:44:32.364999', '2026-09-08 21:44:32.365061', 'UPDATE', NULL, 'Hardware specs updated: Color=Black Titanium, Health=100%, Cycles=32', 7, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (33, '2026-09-08 21:47:22.275625', '2026-09-08 21:47:22.275674', 'UPDATE', NULL, 'Buying Price: BDT 0.00 -> BDT 62250; Warranty: Standard', 7, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (34, '2026-09-08 21:48:41.707726', '2026-09-08 21:48:41.707772', 'STATUS_UPDATE', 'Assigned', 'In Stock', 7, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (35, '2026-09-08 21:52:07.928150', '2026-09-08 21:52:07.928190', 'ASSIGNMENT', 'Owner: None', 'Assigned to admin', 8, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (36, '2026-09-08 21:52:23.629112', '2026-09-08 21:52:23.629168', 'STATUS_UPDATE', 'Assigned', 'In Stock', 8, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (37, '2026-09-08 21:53:05.183866', '2026-09-08 21:53:05.183909', 'CREATION', NULL, 'Device registered with status IN_STOCK', 9, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (38, '2026-09-08 21:53:25.109115', '2026-09-08 21:53:25.109162', 'UPDATE', NULL, 'Hardware specs updated: Color=Natural Titanium, Health=88%, Cycles=583', 9, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (39, '2026-09-08 21:53:52.131611', '2026-09-08 21:53:52.131650', 'UPDATE', NULL, 'Buying Price: BDT 0.00 -> BDT 28500; Owner assigned to emon', 9, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (40, '2026-09-08 21:54:29.859138', '2026-09-08 21:54:29.859179', 'CREATION', NULL, 'Device registered with status IN_STOCK', 10, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (41, '2026-09-08 21:54:40.812779', '2026-09-08 21:54:40.812827', 'ASSIGNMENT', 'Owner: None', 'Assigned to ashraf', 10, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (42, '2026-09-08 21:54:45.274766', '2026-09-08 21:54:45.274810', 'STATUS_UPDATE', 'Assigned', 'In Stock', 10, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (43, '2026-09-08 21:55:17.389311', '2026-09-08 21:55:17.389360', 'UPDATE', NULL, 'Buying Price: BDT 0.00 -> BDT 71700', 10, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (44, '2026-09-08 21:55:29.585723', '2026-09-08 21:55:29.585764', 'UPDATE', NULL, 'Hardware specs updated: Color=Natural Titanium, Health=95%, Cycles=None', 10, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (45, '2026-09-08 21:55:55.792666', '2026-09-08 21:55:55.792692', 'CREATION', NULL, 'Device registered with status IN_STOCK', 11, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (46, '2026-09-08 21:56:00.302489', '2026-09-08 21:56:00.302531', 'ASSIGNMENT', 'Owner: None', 'Assigned to ashraf', 11, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (47, '2026-09-08 21:56:06.320844', '2026-09-08 21:56:06.320893', 'STATUS_UPDATE', 'Assigned', 'In Stock', 11, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (48, '2026-09-08 21:56:20.508832', '2026-09-08 21:56:20.508885', 'UPDATE', NULL, 'Buying Price: BDT 0.00 -> BDT 71700', 11, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (49, '2026-09-08 21:56:59.060968', '2026-09-08 21:56:59.060993', 'UPDATE', NULL, 'Hardware specs updated: Color=Natural Titanium, Health=95%, Cycles=None', 11, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (50, '2026-09-08 21:57:36.211598', '2026-09-08 21:57:36.211630', 'CREATION', NULL, 'Device registered with status IN_STOCK', 12, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (51, '2026-09-08 21:57:41.832210', '2026-09-08 21:57:41.832254', 'ASSIGNMENT', 'Owner: None', 'Assigned to ashraf', 12, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (52, '2026-09-08 21:57:44.801251', '2026-09-08 21:57:44.801296', 'STATUS_UPDATE', 'Assigned', 'In Stock', 12, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (53, '2026-09-08 21:58:05.883088', '2026-09-08 21:58:05.883130', 'UPDATE', NULL, 'Buying Price: BDT 0.00 -> BDT 71700', 12, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (54, '2026-09-08 21:58:59.609586', '2026-09-08 21:58:59.609656', 'UPDATE', NULL, 'Buying Price: BDT 0.00 -> BDT 63650', 8, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (55, '2026-09-08 22:03:01.089605', '2026-09-08 22:03:01.089636', 'CREATION', NULL, 'Device registered with status IN_STOCK', 13, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (56, '2026-09-08 22:03:07.972271', '2026-09-08 22:03:07.972319', 'ASSIGNMENT', 'Owner: None', 'Assigned to emon', 13, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (57, '2026-09-08 22:03:11.861949', '2026-09-08 22:03:11.861992', 'STATUS_UPDATE', 'Assigned', 'In Stock', 13, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (58, '2026-09-08 22:04:14.918952', '2026-09-08 22:04:14.919005', 'CREATION', NULL, 'Device registered with status IN_STOCK', 14, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (59, '2026-09-08 22:04:18.921727', '2026-09-08 22:04:18.921759', 'ASSIGNMENT', 'Owner: None', 'Assigned to emon', 14, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (60, '2026-09-08 22:04:21.807995', '2026-09-08 22:04:21.808072', 'STATUS_UPDATE', 'Assigned', 'In Stock', 14, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (61, '2026-09-08 22:05:08.478698', '2026-09-08 22:05:08.478743', 'CREATION', NULL, 'Device registered with status IN_STOCK', 15, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (62, '2026-09-08 22:05:12.192124', '2026-09-08 22:05:12.192185', 'ASSIGNMENT', 'Owner: None', 'Assigned to emon', 15, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (63, '2026-09-08 22:05:15.502101', '2026-09-08 22:05:15.502166', 'STATUS_UPDATE', 'Assigned', 'In Stock', 15, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (64, '2026-09-08 22:06:29.250551', '2026-09-08 22:06:29.250599', 'CREATION', NULL, 'Device registered with status IN_STOCK', 16, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (65, '2026-09-08 22:06:33.606629', '2026-09-08 22:06:33.606668', 'ASSIGNMENT', 'Owner: None', 'Assigned to emon', 16, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (66, '2026-09-08 22:06:36.887702', '2026-09-08 22:06:36.887745', 'STATUS_UPDATE', 'Assigned', 'In Stock', 16, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (67, '2026-09-08 22:07:21.944142', '2026-09-08 22:07:21.944181', 'UPDATE', NULL, 'Variant: None -> Modified', 16, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (68, '2026-09-08 22:07:33.833095', '2026-09-08 22:07:33.833162', 'UPDATE', NULL, 'Variant: None -> Modified', 15, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (69, '2026-09-08 22:20:03.728512', '2026-09-08 22:20:03.728553', 'CREATION', NULL, 'Device registered via Shipment #SF5152145321384 (Price: BDT 28500)', 17, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (70, '2026-09-08 22:20:03.742311', '2026-09-08 22:20:03.742355', 'CREATION', NULL, 'Device registered via Shipment #SF5152145321384 (Price: BDT 28500)', 18, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (71, '2026-09-08 22:20:03.760559', '2026-09-08 22:20:03.760621', 'CREATION', NULL, 'Device registered via Shipment #SF5152145321384 (Price: BDT 28500)', 19, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (72, '2026-09-08 22:20:03.775372', '2026-09-08 22:20:03.775431', 'CREATION', NULL, 'Device registered via Shipment #SF5152145321384 (Price: BDT 28500)', 20, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (73, '2026-09-08 22:20:03.789459', '2026-09-08 22:20:03.789505', 'CREATION', NULL, 'Device registered via Shipment #SF5152145321384 (Price: BDT 28500)', 21, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (74, '2026-09-08 22:20:03.802542', '2026-09-08 22:20:03.802584', 'CREATION', NULL, 'Device registered via Shipment #SF5152145321384 (Price: BDT 28500)', 22, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (75, '2026-09-08 22:20:03.813647', '2026-09-08 22:20:03.813688', 'CREATION', NULL, 'Device registered via Shipment #SF5152145321384 (Price: BDT 28500)', 23, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (76, '2026-09-08 22:20:03.823567', '2026-09-08 22:20:03.823591', 'CREATION', NULL, 'Device registered via Shipment #SF5152145321384 (Price: BDT 28500)', 24, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (77, '2026-09-08 22:20:03.835759', '2026-09-08 22:20:03.835799', 'CREATION', NULL, 'Device registered via Shipment #SF5152145321384 (Price: BDT 28500)', 25, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (78, '2026-09-08 22:20:03.853045', '2026-09-08 22:20:03.853076', 'CREATION', NULL, 'Device registered via Shipment #SF5152145321384 (Price: BDT 28500)', 26, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (79, '2026-09-08 22:24:57.490237', '2026-09-08 22:24:57.490289', 'CREATION', NULL, 'Device registered with status IN_STOCK', 27, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (80, '2026-09-08 22:25:01.982875', '2026-09-08 22:25:01.982924', 'ASSIGNMENT', 'Owner: None', 'Assigned to admin', 27, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (81, '2026-09-08 22:25:05.005360', '2026-09-08 22:25:05.005406', 'STATUS_UPDATE', 'Assigned', 'In Stock', 27, 1);
INSERT INTO inventory_devicehistory (id, created_at, updated_at, action_type, old_state, new_state, device_id, user_id) VALUES (82, '2026-09-08 22:26:04.465896', '2026-09-08 22:26:04.465950', 'STATUS_UPDATE', 'In Stock', 'Under Repair', 27, 1);
SELECT setval(pg_get_serial_sequence('inventory_devicehistory', 'id'), COALESCE((SELECT MAX(id) FROM inventory_devicehistory), 1));

-- DATA RESTORE FOR repairs_repair (1 rows)
INSERT INTO repairs_repair (id, created_at, updated_at, issue_description, sent_date, returned_date, repair_cost, repair_center, country, status, repair_notes, timeline_log, device_id) VALUES (2, '2026-09-08 22:26:04.459602', '2026-09-08 22:26:04.459639', 'screen replacement needed, charging flex replacement needed', '2026-09-08', NULL, 7000, 'Qifeng Repair Center', 'China', 'IN_PROGRESS', NULL, '[]', 27);
SELECT setval(pg_get_serial_sequence('repairs_repair', 'id'), COALESCE((SELECT MAX(id) FROM repairs_repair), 1));

-- DATA RESTORE FOR sickw_sickwreport (3 rows)
INSERT INTO sickw_sickwreport (id, created_at, updated_at, raw_text, parsed_data, model_description, model, imei, imei2, meid, serial_number, estimated_purchase_date, warranty_status, icloud_lock, demo_unit, loaner_device, replaced_device, replacement_device, refurbished_device, purchase_country, locked_carrier, sim_lock_status, device_id) VALUES (2, '2026-08-08 00:43:54.526978', '2026-08-08 00:43:54.527051', 'Model Description: IPHONE 15 PRO MAX,NAMM,256GB,NATURL TTNM
IMEI: 352676528540330
IMEI2: 352676528656268
MEID: 35267652854033
Serial Number: CW539RN7LQ
Estimated Purchase Date: 2024-09-01
Warranty Status: Out Of Warranty
iCloud Lock: OFF
Demo Unit: No
Loaner Device: No
Replaced Device: No
Replacement Device: No
Refurbished Device: No
Purchase Country: N/A
Locked Carrier: 10 - Unlock.
Sim-Lock Status: Unlocked
', '{"model_description": "IPHONE 15 PRO MAX,NAMM,256GB,NATURL TTNM", "imei": "352676528540330", "imei2": "352676528656268", "meid": "35267652854033", "serial_number": "CW539RN7LQ", "estimated_purchase_date": "2024-09-01", "warranty_status": "Out Of Warranty", "icloud_lock": "OFF", "demo_unit": "No", "loaner_device": "No", "replaced_device": "No", "replacement_device": "No", "refurbished_device": "No", "purchase_country": "N/A", "locked_carrier": "10 - Unlock.", "sim_lock_status": "Unlocked"}', 'IPHONE 15 PRO MAX,NAMM,256GB,NATURL TTNM', 'iPhone 15 Pro Max 256GB', '352676528540330', '352676528656268', '35267652854033', 'CW539RN7LQ', '2024-09-01', 'Out Of Warranty', 'OFF', 'No', 'No', 'No', 'No', 'No', 'N/A', '10 - Unlock.', 'Unlocked', NULL);
INSERT INTO sickw_sickwreport (id, created_at, updated_at, raw_text, parsed_data, model_description, model, imei, imei2, meid, serial_number, estimated_purchase_date, warranty_status, icloud_lock, demo_unit, loaner_device, replaced_device, replacement_device, refurbished_device, purchase_country, locked_carrier, sim_lock_status, device_id) VALUES (3, '2026-08-08 02:47:27.573948', '2026-08-08 02:47:27.573987', 'Model Description: IPHONE 15 PRO MAX,NAMM,256GB,NATURL TTNM
IMEI: 354689821647171
IMEI2: 354689821655893
MEID: 35468982164717
Serial Number: MMF7KL07F7
Estimated Purchase Date: 2024-02-22
Warranty Status: Out Of Warranty
iCloud Lock: OFF
Demo Unit: No
Loaner Device: No
Replaced Device: No
Replacement Device: No
Refurbished Device: No
Purchase Country: N/A
Locked Carrier: 10 - Unlock.
Sim-Lock Status: Unlocked
', '{"model_description": "IPHONE 15 PRO MAX,NAMM,256GB,NATURL TTNM", "imei": "354689821647171", "imei2": "354689821655893", "meid": "35468982164717", "serial_number": "MMF7KL07F7", "estimated_purchase_date": "2024-02-22", "warranty_status": "Out Of Warranty", "icloud_lock": "OFF", "demo_unit": "No", "loaner_device": "No", "replaced_device": "No", "replacement_device": "No", "refurbished_device": "No", "purchase_country": "N/A", "locked_carrier": "10 - Unlock.", "sim_lock_status": "Unlocked", "capacity": "256GB"}', 'IPHONE 15 PRO MAX,NAMM,256GB,NATURL TTNM', 'iPhone 15 Pro Max 256GB', '354689821647171', '354689821655893', '35468982164717', 'MMF7KL07F7', '2024-02-22', 'Out Of Warranty', 'OFF', 'No', 'No', 'No', 'No', 'No', 'N/A', '10 - Unlock.', 'Unlocked', NULL);
INSERT INTO sickw_sickwreport (id, created_at, updated_at, raw_text, parsed_data, model_description, model, imei, imei2, meid, serial_number, estimated_purchase_date, warranty_status, icloud_lock, demo_unit, loaner_device, replaced_device, replacement_device, refurbished_device, purchase_country, locked_carrier, sim_lock_status, device_id) VALUES (4, '2026-08-08 02:50:50.092487', '2026-08-08 02:50:50.092535', 'Model Description: IPHONE 13 PRO,NAMM,128GB,GRAPHITE
Model: IPHONE 13 PRO A2483
IMEI: 352668916180563
IMEI2: 352668916572082
MEID: 35266891618056
Serial Number: XJMXF9PW4X
Estimated Purchase Date: 2021-12-24
Warranty Status: Out Of Warranty
iCloud Lock: ON
Demo Unit: No
Loaner Device: No
Replaced Device: No
Replacement Device: No
Refurbished Device: No
Purchase Country: United States
Locked Carrier: 4010 - US Spectrum Mobile Locked Policy
Sim-Lock Status: Locked
', '{"model_description": "IPHONE 13 PRO,NAMM,128GB,GRAPHITE", "model": "IPHONE 13 PRO A2483", "imei": "352668916180563", "imei2": "352668916572082", "meid": "35266891618056", "serial_number": "XJMXF9PW4X", "estimated_purchase_date": "2021-12-24", "warranty_status": "Out Of Warranty", "icloud_lock": "ON", "demo_unit": "No", "loaner_device": "No", "replaced_device": "No", "replacement_device": "No", "refurbished_device": "No", "purchase_country": "United States", "locked_carrier": "4010 - US Spectrum Mobile Locked Policy", "sim_lock_status": "Locked", "capacity": "128GB"}', 'IPHONE 13 PRO,NAMM,128GB,GRAPHITE', 'iPhone 13 Pro', '352668916180563', '352668916572082', '35266891618056', 'XJMXF9PW4X', '2021-12-24', 'Out Of Warranty', 'ON', 'No', 'No', 'No', 'No', 'No', 'United States', '4010 - US Spectrum Mobile Locked Policy', 'Locked', NULL);
SELECT setval(pg_get_serial_sequence('sickw_sickwreport', 'id'), COALESCE((SELECT MAX(id) FROM sickw_sickwreport), 1));


-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE inventory_device ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments_shipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments_supplier ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_sale ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers_customer ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE repairs_repair ENABLE ROW LEVEL SECURITY;
ALTER TABLE sickw_sickwreport ENABLE ROW LEVEL SECURITY;

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

-- 5. ENABLE REALTIME BROADCAST
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

-- 6. ENSURE SUPERUSER jubaer HAS REQUESTED PASSWORD 787898
UPDATE accounts_user SET 
    password = 'pbkdf2_sha256$1500000$8PgcRq8pxdNMtqYYy4R3Xf$TWRvTnYqwUFtabgI7DR0BQSJRrCjfm89iZKH/uLZrko=',
    is_staff = TRUE,
    is_superuser = TRUE,
    role = 'ADMIN',
    is_active = TRUE
WHERE username = 'jubaer';

-- 7. NORMALIZE ASSIGNED STATUS TO IN_STOCK (Ownership is separate from inventory status)
UPDATE inventory_device SET current_status = 'IN_STOCK' WHERE current_status = 'ASSIGNED';

