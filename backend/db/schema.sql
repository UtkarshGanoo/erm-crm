-- ============================================================
-- Mini ERP + CRM Operations Portal - Database Schema
-- PostgreSQL
-- ============================================================

-- Clean slate (safe to re-run during development)
DROP TABLE IF EXISTS challan_items CASCADE;
DROP TABLE IF EXISTS challans CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS followups CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ------------------------------------------------------------
-- USERS & ROLES
-- ------------------------------------------------------------
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(120) NOT NULL,
    email         VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20) NOT NULL CHECK (role IN ('admin','sales','warehouse','accounts')),
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- CUSTOMERS (CRM)
-- ------------------------------------------------------------
CREATE TABLE customers (
    id             SERIAL PRIMARY KEY,
    customer_name  VARCHAR(150) NOT NULL,
    mobile_number  VARCHAR(20) NOT NULL,
    email          VARCHAR(150),
    business_name  VARCHAR(150),
    gst_number     VARCHAR(20),
    customer_type  VARCHAR(20) NOT NULL CHECK (customer_type IN ('Retail','Wholesale','Distributor')),
    address        TEXT,
    status         VARCHAR(20) NOT NULL DEFAULT 'Lead' CHECK (status IN ('Lead','Active','Inactive')),
    follow_up_date DATE,
    notes          TEXT,
    created_by     INTEGER REFERENCES users(id),
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_name ON customers (customer_name);
CREATE INDEX idx_customers_mobile ON customers (mobile_number);
CREATE INDEX idx_customers_status ON customers (status);

-- Follow-up notes/history for a customer (many per customer)
CREATE TABLE followups (
    id           SERIAL PRIMARY KEY,
    customer_id  INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    note         TEXT NOT NULL,
    follow_up_date DATE,
    created_by   INTEGER REFERENCES users(id),
    created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- PRODUCTS / INVENTORY
-- ------------------------------------------------------------
CREATE TABLE products (
    id              SERIAL PRIMARY KEY,
    product_name    VARCHAR(150) NOT NULL,
    sku             VARCHAR(50) UNIQUE NOT NULL,
    category        VARCHAR(80),
    unit_price      NUMERIC(12,2) NOT NULL DEFAULT 0,
    current_stock   INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    min_stock_alert INTEGER NOT NULL DEFAULT 0,
    warehouse_location VARCHAR(100),
    image_url       VARCHAR(500),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_name ON products (product_name);
CREATE INDEX idx_products_sku ON products (sku);
CREATE INDEX idx_products_category ON products (category);

-- Stock movement log: every IN/OUT change is recorded here
CREATE TABLE stock_movements (
    id             SERIAL PRIMARY KEY,
    product_id     INTEGER NOT NULL REFERENCES products(id),
    quantity_changed INTEGER NOT NULL,
    movement_type  VARCHAR(10) NOT NULL CHECK (movement_type IN ('IN','OUT')),
    reason         VARCHAR(255) NOT NULL,
    reference_type VARCHAR(30),        -- e.g. 'CHALLAN', 'MANUAL', 'PURCHASE'
    reference_id   INTEGER,            -- e.g. challan id
    created_by     INTEGER REFERENCES users(id),
    created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stock_movements_product ON stock_movements (product_id);

-- ------------------------------------------------------------
-- SALES CHALLAN
-- ------------------------------------------------------------
CREATE TABLE challans (
    id              SERIAL PRIMARY KEY,
    challan_number  VARCHAR(30) UNIQUE NOT NULL,
    customer_id     INTEGER NOT NULL REFERENCES customers(id),
    customer_snapshot JSONB NOT NULL,   -- snapshot of customer info at time of creation
    total_quantity  INTEGER NOT NULL DEFAULT 0,
    total_amount    NUMERIC(14,2) NOT NULL DEFAULT 0,
    status          VARCHAR(20) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Confirmed','Cancelled')),
    created_by      INTEGER REFERENCES users(id),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    confirmed_at    TIMESTAMP
);

CREATE INDEX idx_challans_customer ON challans (customer_id);
CREATE INDEX idx_challans_status ON challans (status);

-- Challan line items - stores PRODUCT SNAPSHOT, not just product_id,
-- so historical challans stay accurate even if product price/name changes later.
CREATE TABLE challan_items (
    id              SERIAL PRIMARY KEY,
    challan_id      INTEGER NOT NULL REFERENCES challans(id) ON DELETE CASCADE,
    product_id      INTEGER NOT NULL REFERENCES products(id),
    product_snapshot JSONB NOT NULL,    -- {product_name, sku, unit_price} at time of sale
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    unit_price      NUMERIC(12,2) NOT NULL,
    line_total      NUMERIC(14,2) NOT NULL
);

CREATE INDEX idx_challan_items_challan ON challan_items (challan_id);
