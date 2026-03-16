import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "fieldpro.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initializeDb(db);
  }
  return db;
}

function initializeDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'field_tech',
      phone TEXT,
      avatar_url TEXT,
      hourly_rate REAL DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      password_hash TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      company_name TEXT NOT NULL,
      contact_name TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      zip TEXT,
      notes TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      job_number TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      client_id TEXT REFERENCES clients(id),
      status TEXT DEFAULT 'draft',
      priority TEXT DEFAULT 'medium',
      job_type TEXT DEFAULT 'service',
      address TEXT,
      city TEXT,
      state TEXT,
      zip TEXT,
      latitude REAL,
      longitude REAL,
      estimated_hours REAL,
      actual_hours REAL DEFAULT 0,
      estimated_cost REAL DEFAULT 0,
      actual_cost REAL DEFAULT 0,
      start_date TEXT,
      due_date TEXT,
      completed_date TEXT,
      assigned_to TEXT REFERENCES users(id),
      created_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY,
      quote_number TEXT UNIQUE NOT NULL,
      client_id TEXT REFERENCES clients(id),
      job_id TEXT REFERENCES jobs(id),
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'draft',
      subtotal REAL DEFAULT 0,
      tax_rate REAL DEFAULT 0.10,
      tax_amount REAL DEFAULT 0,
      total REAL DEFAULT 0,
      valid_until TEXT,
      notes TEXT,
      created_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS quote_items (
      id TEXT PRIMARY KEY,
      quote_id TEXT REFERENCES quotes(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      quantity REAL DEFAULT 1,
      unit_price REAL DEFAULT 0,
      total REAL DEFAULT 0,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      invoice_number TEXT UNIQUE NOT NULL,
      client_id TEXT REFERENCES clients(id),
      job_id TEXT REFERENCES jobs(id),
      quote_id TEXT REFERENCES quotes(id),
      title TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      subtotal REAL DEFAULT 0,
      tax_rate REAL DEFAULT 0.10,
      tax_amount REAL DEFAULT 0,
      total REAL DEFAULT 0,
      due_date TEXT,
      paid_date TEXT,
      notes TEXT,
      created_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT REFERENCES invoices(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      quantity REAL DEFAULT 1,
      unit_price REAL DEFAULT 0,
      total REAL DEFAULT 0,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      task_number TEXT UNIQUE NOT NULL,
      job_id TEXT REFERENCES jobs(id),
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'open',
      priority TEXT DEFAULT 'medium',
      category TEXT DEFAULT 'general',
      assigned_to TEXT REFERENCES users(id),
      plan_id TEXT REFERENCES plans(id),
      pin_x REAL,
      pin_y REAL,
      due_date TEXT,
      completed_date TEXT,
      created_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      job_id TEXT REFERENCES jobs(id),
      name TEXT NOT NULL,
      file_name TEXT,
      version INTEGER DEFAULT 1,
      sheet_number TEXT,
      notes TEXT,
      created_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS schedule_events (
      id TEXT PRIMARY KEY,
      job_id TEXT REFERENCES jobs(id),
      task_id TEXT REFERENCES tasks(id),
      user_id TEXT REFERENCES users(id),
      title TEXT NOT NULL,
      description TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      all_day INTEGER DEFAULT 0,
      event_type TEXT DEFAULT 'job',
      status TEXT DEFAULT 'scheduled',
      color TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS inventory_items (
      id TEXT PRIMARY KEY,
      sku TEXT UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      unit TEXT DEFAULT 'each',
      quantity_on_hand REAL DEFAULT 0,
      quantity_reserved REAL DEFAULT 0,
      reorder_point REAL DEFAULT 0,
      unit_cost REAL DEFAULT 0,
      unit_price REAL DEFAULT 0,
      supplier TEXT,
      location TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS inventory_usage (
      id TEXT PRIMARY KEY,
      item_id TEXT REFERENCES inventory_items(id),
      job_id TEXT REFERENCES jobs(id),
      user_id TEXT REFERENCES users(id),
      quantity REAL NOT NULL,
      usage_type TEXT DEFAULT 'used',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS timesheets (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      job_id TEXT REFERENCES jobs(id),
      task_id TEXT REFERENCES tasks(id),
      clock_in TEXT NOT NULL,
      clock_out TEXT,
      break_minutes INTEGER DEFAULT 0,
      total_hours REAL,
      latitude_in REAL,
      longitude_in REAL,
      latitude_out REAL,
      longitude_out REAL,
      notes TEXT,
      status TEXT DEFAULT 'pending',
      approved_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      user_id TEXT REFERENCES users(id),
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Seed demo data if empty
    INSERT OR IGNORE INTO users (id, email, name, role, phone, password_hash) VALUES
      ('usr_1', 'admin@fieldpro.com', 'Alex Johnson', 'admin', '555-0100', 'demo'),
      ('usr_2', 'sarah@fieldpro.com', 'Sarah Chen', 'project_manager', '555-0101', 'demo'),
      ('usr_3', 'mike@fieldpro.com', 'Mike Torres', 'field_tech', '555-0102', 'demo'),
      ('usr_4', 'emma@fieldpro.com', 'Emma Wilson', 'field_tech', '555-0103', 'demo'),
      ('usr_5', 'james@fieldpro.com', 'James Brown', 'foreman', '555-0104', 'demo');

    INSERT OR IGNORE INTO clients (id, company_name, contact_name, email, phone, address, city, state, zip) VALUES
      ('cli_1', 'Acme Construction', 'John Smith', 'john@acme.com', '555-1001', '123 Main St', 'Austin', 'TX', '78701'),
      ('cli_2', 'Sunrise Properties', 'Lisa Park', 'lisa@sunrise.com', '555-1002', '456 Oak Ave', 'Houston', 'TX', '77001'),
      ('cli_3', 'Metro Development', 'Robert Davis', 'robert@metro.com', '555-1003', '789 Pine Rd', 'Dallas', 'TX', '75201'),
      ('cli_4', 'Greenfield Homes', 'Amy Wright', 'amy@greenfield.com', '555-1004', '321 Elm St', 'San Antonio', 'TX', '78201');

    INSERT OR IGNORE INTO jobs (id, job_number, title, description, client_id, status, priority, job_type, address, city, state, estimated_hours, estimated_cost, start_date, due_date, assigned_to, created_by) VALUES
      ('job_1', 'JOB-001', 'Office Building HVAC Install', 'Complete HVAC system installation for new 3-story office building', 'cli_1', 'in_progress', 'high', 'installation', '100 Business Park Dr', 'Austin', 'TX', 240, 85000, '2026-03-01', '2026-04-15', 'usr_3', 'usr_1'),
      ('job_2', 'JOB-002', 'Residential Plumbing Remodel', 'Full bathroom and kitchen plumbing remodel', 'cli_2', 'in_progress', 'medium', 'remodel', '222 Sunset Blvd', 'Houston', 'TX', 80, 12000, '2026-03-10', '2026-03-28', 'usr_4', 'usr_2'),
      ('job_3', 'JOB-003', 'Commercial Electrical Upgrade', 'Upgrade electrical panel and wiring for retail space', 'cli_3', 'scheduled', 'high', 'service', '500 Commerce St', 'Dallas', 'TX', 120, 35000, '2026-03-20', '2026-04-10', 'usr_3', 'usr_1'),
      ('job_4', 'JOB-004', 'New Home Construction - Lot 15', 'Full electrical and plumbing for new residential build', 'cli_4', 'draft', 'medium', 'installation', '15 Meadow Ln', 'San Antonio', 'TX', 320, 95000, '2026-04-01', '2026-06-30', 'usr_5', 'usr_2'),
      ('job_5', 'JOB-005', 'Emergency Pipe Repair', 'Burst pipe repair in basement level', 'cli_1', 'completed', 'urgent', 'service', '123 Main St', 'Austin', 'TX', 8, 2500, '2026-03-05', '2026-03-06', 'usr_4', 'usr_1');

    INSERT OR IGNORE INTO quotes (id, quote_number, client_id, job_id, title, status, subtotal, tax_rate, tax_amount, total, valid_until, created_by) VALUES
      ('quo_1', 'QUO-001', 'cli_1', 'job_1', 'HVAC Installation Quote', 'accepted', 77273, 0.10, 7727, 85000, '2026-03-15', 'usr_1'),
      ('quo_2', 'QUO-002', 'cli_2', 'job_2', 'Plumbing Remodel Quote', 'accepted', 10909, 0.10, 1091, 12000, '2026-03-20', 'usr_2'),
      ('quo_3', 'QUO-003', 'cli_3', 'job_3', 'Electrical Upgrade Quote', 'sent', 31818, 0.10, 3182, 35000, '2026-04-01', 'usr_1'),
      ('quo_4', 'QUO-004', 'cli_4', 'job_4', 'New Build Electrical & Plumbing', 'draft', 86364, 0.10, 8636, 95000, '2026-04-15', 'usr_2');

    INSERT OR IGNORE INTO invoices (id, invoice_number, client_id, job_id, quote_id, title, status, subtotal, tax_rate, tax_amount, total, due_date, created_by) VALUES
      ('inv_1', 'INV-001', 'cli_1', 'job_5', NULL, 'Emergency Pipe Repair', 'paid', 2273, 0.10, 227, 2500, '2026-03-20', 'usr_1'),
      ('inv_2', 'INV-002', 'cli_1', 'job_1', 'quo_1', 'HVAC Install - Progress Payment 1', 'sent', 38636, 0.10, 3864, 42500, '2026-03-30', 'usr_1'),
      ('inv_3', 'INV-003', 'cli_2', 'job_2', 'quo_2', 'Plumbing Remodel - 50% Deposit', 'overdue', 5455, 0.10, 545, 6000, '2026-03-15', 'usr_2');

    INSERT OR IGNORE INTO tasks (id, task_number, job_id, title, description, status, priority, category, assigned_to, created_by) VALUES
      ('tsk_1', 'TSK-001', 'job_1', 'Install ductwork - Floor 1', 'Run main supply and return ducts on first floor', 'in_progress', 'high', 'installation', 'usr_3', 'usr_2'),
      ('tsk_2', 'TSK-002', 'job_1', 'Install ductwork - Floor 2', 'Run main supply and return ducts on second floor', 'open', 'high', 'installation', 'usr_3', 'usr_2'),
      ('tsk_3', 'TSK-003', 'job_1', 'Mount condensing units', 'Install 4x rooftop condensing units', 'open', 'medium', 'installation', 'usr_5', 'usr_2'),
      ('tsk_4', 'TSK-004', 'job_2', 'Demo existing plumbing', 'Remove all existing pipes in bathroom', 'completed', 'high', 'demolition', 'usr_4', 'usr_2'),
      ('tsk_5', 'TSK-005', 'job_2', 'Rough-in new supply lines', 'Install new copper supply lines', 'in_progress', 'high', 'installation', 'usr_4', 'usr_2'),
      ('tsk_6', 'TSK-006', 'job_2', 'Install fixtures', 'Mount and connect all bathroom fixtures', 'open', 'medium', 'installation', 'usr_4', 'usr_2'),
      ('tsk_7', 'TSK-007', 'job_1', 'Final inspection prep', 'Prepare documentation for city inspection', 'open', 'low', 'inspection', 'usr_2', 'usr_1'),
      ('tsk_8', 'TSK-008', 'job_3', 'Panel upgrade', 'Replace 100A panel with 400A', 'open', 'high', 'installation', 'usr_3', 'usr_1');

    INSERT OR IGNORE INTO schedule_events (id, job_id, task_id, user_id, title, start_time, end_time, event_type, status, color) VALUES
      ('evt_1', 'job_1', 'tsk_1', 'usr_3', 'HVAC Ductwork - Floor 1', '2026-03-16T08:00:00', '2026-03-16T16:00:00', 'job', 'scheduled', '#3b82f6'),
      ('evt_2', 'job_2', 'tsk_5', 'usr_4', 'Plumbing Rough-in', '2026-03-16T07:00:00', '2026-03-16T15:00:00', 'job', 'scheduled', '#10b981'),
      ('evt_3', 'job_1', 'tsk_3', 'usr_5', 'Mount Condensing Units', '2026-03-17T08:00:00', '2026-03-17T17:00:00', 'job', 'scheduled', '#3b82f6'),
      ('evt_4', 'job_3', 'tsk_8', 'usr_3', 'Electrical Panel Upgrade', '2026-03-20T08:00:00', '2026-03-20T16:00:00', 'job', 'scheduled', '#f59e0b'),
      ('evt_5', NULL, NULL, 'usr_2', 'Team Safety Meeting', '2026-03-18T09:00:00', '2026-03-18T10:00:00', 'meeting', 'scheduled', '#8b5cf6');

    INSERT OR IGNORE INTO inventory_items (id, sku, name, description, category, unit, quantity_on_hand, reorder_point, unit_cost, unit_price, supplier) VALUES
      ('itm_1', 'HVAC-DUCT-6', '6" Round Duct', '6 inch round galvanized duct, 5ft section', 'HVAC', 'each', 45, 20, 18.50, 28.00, 'HVAC Supply Co'),
      ('itm_2', 'HVAC-FILT-20', '20x20 Air Filter', '20x20x1 MERV 11 air filter', 'HVAC', 'each', 120, 50, 8.00, 15.00, 'HVAC Supply Co'),
      ('itm_3', 'PLB-PIPE-075', '3/4" Copper Pipe', '3/4 inch copper pipe, 10ft section', 'Plumbing', 'each', 30, 15, 22.00, 35.00, 'Plumbing Warehouse'),
      ('itm_4', 'PLB-FTNG-075', '3/4" Elbow Fitting', '3/4 inch copper elbow fitting', 'Plumbing', 'each', 200, 100, 2.50, 5.00, 'Plumbing Warehouse'),
      ('itm_5', 'ELC-WIRE-12', '12 AWG Wire', '12 AWG THHN stranded wire, 500ft spool', 'Electrical', 'spool', 8, 5, 85.00, 140.00, 'Electrical Direct'),
      ('itm_6', 'ELC-BRK-20', '20A Breaker', '20 amp single pole breaker', 'Electrical', 'each', 35, 20, 12.00, 22.00, 'Electrical Direct');

    INSERT OR IGNORE INTO timesheets (id, user_id, job_id, clock_in, clock_out, total_hours, notes, status) VALUES
      ('ts_1', 'usr_3', 'job_1', '2026-03-15T07:00:00', '2026-03-15T15:30:00', 8.5, 'Completed floor 1 main trunk line', 'approved'),
      ('ts_2', 'usr_4', 'job_2', '2026-03-15T06:30:00', '2026-03-15T14:30:00', 8.0, 'Demo work completed', 'approved'),
      ('ts_3', 'usr_3', 'job_1', '2026-03-14T07:00:00', '2026-03-14T16:00:00', 9.0, 'Branch duct installation', 'approved'),
      ('ts_4', 'usr_5', 'job_1', '2026-03-14T08:00:00', '2026-03-14T15:00:00', 7.0, 'Prepped rooftop mounts', 'pending');
  `);
}
