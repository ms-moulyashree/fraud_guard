-- FraudGuard Database Schema
-- Run via: python db/init_db.py

-- ── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT NOT NULL UNIQUE,
    display_name    TEXT NOT NULL,
    avatar          TEXT NOT NULL DEFAULT '',
    job_title       TEXT,
    tenant_id       TEXT NOT NULL DEFAULT '',
    password_hash   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Engagements ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS engagements (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    year        TEXT NOT NULL,
    type        TEXT NOT NULL,
    created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Procedures ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS procedures (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    type        TEXT NOT NULL,
    category    TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    risk        TEXT NOT NULL DEFAULT 'Medium',
    enabled     BOOLEAN NOT NULL DEFAULT TRUE
);

-- ── Uploaded Files ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS uploaded_files (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    path            TEXT NOT NULL,
    size            TEXT,
    row_count       INT,
    columns         TEXT[] NOT NULL DEFAULT '{}',
    engagement_id   UUID REFERENCES engagements(id) ON DELETE SET NULL,
    uploaded_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Analysis Runs ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analysis_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    engagement_id   UUID REFERENCES engagements(id) ON DELETE SET NULL,
    file_name       TEXT NOT NULL,
    file_path       TEXT NOT NULL,
    file_size       TEXT,
    row_count       INT,
    columns         TEXT NOT NULL DEFAULT '[]',
    status          TEXT NOT NULL DEFAULT 'running',
    ai_summary      TEXT,
    started_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

-- ── Procedure Results ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS procedure_results (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id          UUID NOT NULL REFERENCES analysis_runs(id) ON DELETE CASCADE,
    procedure_id    TEXT NOT NULL,
    procedure_name  TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending',
    risk_level      TEXT,
    flag_count      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Flagged Items ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS flagged_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id          UUID NOT NULL REFERENCES analysis_runs(id) ON DELETE CASCADE,
    procedure_id    TEXT NOT NULL,
    procedure_name  TEXT NOT NULL,
    row_id          TEXT NOT NULL,
    invoice_no      TEXT,
    vendor_id       TEXT,
    amount          TEXT,
    date            TEXT,
    reason          TEXT NOT NULL,
    risk_level      TEXT NOT NULL DEFAULT 'Medium',
    document_type   TEXT,
    field           TEXT,
    flagged_value   TEXT,
    detection       TEXT,
    status          TEXT NOT NULL DEFAULT 'Open',
    auditor_action  TEXT NOT NULL DEFAULT 'Unreviewed',
    auditor_note    TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_runs_engagement    ON analysis_runs(engagement_id);
CREATE INDEX IF NOT EXISTS idx_runs_status        ON analysis_runs(status);
CREATE INDEX IF NOT EXISTS idx_proc_results_run   ON procedure_results(run_id);
CREATE INDEX IF NOT EXISTS idx_flags_run          ON flagged_items(run_id);
CREATE INDEX IF NOT EXISTS idx_flags_risk         ON flagged_items(risk_level);
CREATE INDEX IF NOT EXISTS idx_flags_status       ON flagged_items(status);
CREATE INDEX IF NOT EXISTS idx_files_engagement   ON uploaded_files(engagement_id);

-- ── Seed: Procedures ──────────────────────────────────────────────────────────
INSERT INTO procedures (id, name, type, category, description, risk, enabled) VALUES
    ('dup_invoice',     'Duplicate Invoice Detection',      'Detection',  'AP',      'Flags invoices with duplicate numbers or identical amount+vendor+date combinations.', 'High',   TRUE),
    ('round_amount',    'Round Amount Test',                'Detection',  'AP',      'Flags suspiciously round invoice amounts that may indicate fabricated transactions.', 'Medium', TRUE),
    ('weekend_txn',     'Weekend/Holiday Transaction Test', 'Detection',  'AP',      'Flags transactions posted on weekends or public holidays.',                           'Medium', TRUE),
    ('vendor_master',   'Vendor Master Analysis',           'Analysis',   'AP',      'Identifies duplicate vendors, missing details, or vendors with no bank info.',        'High',   TRUE),
    ('split_invoice',   'Split Invoice Detection',          'Detection',  'AP',      'Detects invoices split below approval thresholds to bypass controls.',                'High',   TRUE),
    ('gap_sequence',    'Sequence Gap Analysis',            'Analysis',   'AP',      'Detects gaps or duplicates in invoice/voucher number sequences.',                     'Low',    TRUE),
    ('stat_outlier',    'Statistical Outlier Detection',    'Analytics',  'General', 'Uses Z-score / IQR analysis to flag statistically unusual transaction amounts.',      'Medium', TRUE),
    ('journal_entry',   'Journal Entry Testing',            'Detection',  'GL',      'Flags unusual journal entries: round amounts, posted late, or by unauthorized users.','High',   TRUE),
    ('three_way_match', 'Three-Way Match Verification',     'Compliance', 'AP',      'Verifies PO → GRN → Invoice matching; flags mismatches in quantity or price.',       'High',   TRUE),
    ('payroll_ghost',   'Ghost Employee Detection',         'Detection',  'Payroll', 'Identifies payroll records with missing tax IDs, duplicate bank accounts, or no HR record.', 'High', TRUE)
ON CONFLICT (id) DO NOTHING;

-- ── Seed: Demo Engagements ────────────────────────────────────────────────────
INSERT INTO engagements (id, name, year, type) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Reliance Industries Ltd.',  'FY 2024-25', 'Statutory Audit'),
    ('22222222-2222-2222-2222-222222222222', 'Tata Consultancy Services', 'FY 2024-25', 'Internal Audit'),
    ('33333333-3333-3333-3333-333333333333', 'Infosys Ltd.',              'FY 2024-25', 'Risk Advisory'),
    ('44444444-4444-4444-4444-444444444444', 'HDFC Bank Ltd.',            'FY 2023-24', 'Forensic Audit')
ON CONFLICT (id) DO NOTHING;

-- Seed: Demo Users (password = Demo@1234)
INSERT INTO users (id, email, display_name, avatar, job_title, tenant_id, password_hash) VALUES
    (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        'priya.sharma@company.com',
        'Priya Sharma',
        'PS',
        'Senior Auditor',
        'company',
        '$2b$12$EgTyxW9brNzCT5mf3sb57.FfYl/TpHcGUyckuOpP2ZJCJkq1Z2INK'
    ),
    (
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        'rahul.verma@company.com',
        'Rahul Verma',
        'RV',
        'Audit Manager',
        'company',
        '$2b$12$EgTyxW9brNzCT5mf3sb57.FfYl/TpHcGUyckuOpP2ZJCJkq1Z2INK'
    )
ON CONFLICT (email) DO NOTHING;