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

    CREATE TABLE IF NOT EXISTS tenders (
      id TEXT PRIMARY KEY,
      tender_number TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      client_id TEXT REFERENCES clients(id),
      status TEXT DEFAULT 'identified',
      stage TEXT DEFAULT 'prospect',
      priority TEXT DEFAULT 'medium',
      tender_type TEXT DEFAULT 'competitive',
      source TEXT,
      estimated_value REAL DEFAULT 0,
      submitted_value REAL DEFAULT 0,
      margin_percent REAL DEFAULT 0,
      issue_date TEXT,
      site_visit_date TEXT,
      submission_deadline TEXT,
      decision_date TEXT,
      awarded_date TEXT,
      lost_reason TEXT,
      contact_name TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      site_address TEXT,
      site_city TEXT,
      site_state TEXT,
      site_zip TEXT,
      scope_of_work TEXT,
      notes TEXT,
      assigned_to TEXT REFERENCES users(id),
      created_by TEXT REFERENCES users(id),
      job_id TEXT REFERENCES jobs(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tender_items (
      id TEXT PRIMARY KEY,
      tender_id TEXT REFERENCES tenders(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      category TEXT DEFAULT 'general',
      quantity REAL DEFAULT 1,
      unit TEXT DEFAULT 'each',
      unit_cost REAL DEFAULT 0,
      markup_percent REAL DEFAULT 20,
      total REAL DEFAULT 0,
      notes TEXT,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tender_checklist (
      id TEXT PRIMARY KEY,
      tender_id TEXT REFERENCES tenders(id) ON DELETE CASCADE,
      item TEXT NOT NULL,
      is_complete INTEGER DEFAULT 0,
      completed_by TEXT REFERENCES users(id),
      completed_at TEXT,
      due_date TEXT,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tender_documents (
      id TEXT PRIMARY KEY,
      tender_id TEXT REFERENCES tenders(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      file_type TEXT,
      category TEXT DEFAULT 'general',
      notes TEXT,
      uploaded_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS follow_ups (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT NOT NULL,
      completed_date TEXT,
      status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'medium',
      assigned_to TEXT REFERENCES users(id),
      created_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS automation_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      trigger_type TEXT NOT NULL,
      trigger_config TEXT NOT NULL DEFAULT '{}',
      action_type TEXT NOT NULL,
      action_config TEXT NOT NULL DEFAULT '{}',
      is_active INTEGER DEFAULT 1,
      last_run TEXT,
      run_count INTEGER DEFAULT 0,
      created_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS automation_log (
      id TEXT PRIMARY KEY,
      rule_id TEXT REFERENCES automation_rules(id),
      trigger_type TEXT NOT NULL,
      action_type TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      details TEXT,
      status TEXT DEFAULT 'success',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      title TEXT NOT NULL,
      message TEXT,
      type TEXT DEFAULT 'info',
      entity_type TEXT,
      entity_id TEXT,
      is_read INTEGER DEFAULT 0,
      action_url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Seed demo automation rules
    INSERT OR IGNORE INTO automation_rules (id, name, description, trigger_type, trigger_config, action_type, action_config, is_active, created_by) VALUES
      ('auto_1', 'Tender Deadline Warning (7 days)', 'Alert when tender submission is due within 7 days', 'tender_deadline_approaching', '{"days_before": 7}', 'create_alert', '{"type": "warning", "message": "Tender submission due in 7 days"}', 1, 'usr_1'),
      ('auto_2', 'Tender Deadline Urgent (2 days)', 'Urgent alert when tender submission is due within 2 days', 'tender_deadline_approaching', '{"days_before": 2}', 'create_alert', '{"type": "urgent", "message": "URGENT: Tender submission due in 2 days"}', 1, 'usr_1'),
      ('auto_3', 'Quote Follow-up (3 days)', 'Create follow-up when quote has been sent for 3+ days with no response', 'quote_no_response', '{"days_after_sent": 3}', 'create_follow_up', '{"title": "Follow up on sent quote", "priority": "high"}', 1, 'usr_1'),
      ('auto_4', 'Invoice Overdue Alert', 'Alert when invoice passes due date', 'invoice_overdue', '{}', 'create_alert', '{"type": "warning", "message": "Invoice is overdue"}', 1, 'usr_1'),
      ('auto_5', 'Tender Checklist Incomplete', 'Alert if tender checklist has incomplete items within 3 days of deadline', 'tender_checklist_incomplete', '{"days_before": 3}', 'create_alert', '{"type": "urgent", "message": "Tender has incomplete checklist items"}', 1, 'usr_1'),
      ('auto_6', 'Site Visit Reminder', 'Remind assigned user about upcoming site visit', 'site_visit_approaching', '{"days_before": 1}', 'create_alert', '{"type": "info", "message": "Site visit tomorrow"}', 1, 'usr_1'),
      ('auto_7', 'Job Completion Follow-up', 'Create follow-up to check client satisfaction after job completion', 'job_completed', '{"days_after": 3}', 'create_follow_up', '{"title": "Client satisfaction check", "priority": "medium"}', 1, 'usr_1'),
      ('auto_8', 'Tender Won - Create Job', 'Prompt to create a job when tender is marked as won', 'tender_won', '{}', 'create_alert', '{"type": "success", "message": "Tender won! Create a job to begin work."}', 1, 'usr_1');

    -- Seed demo tenders
    INSERT OR IGNORE INTO tenders (id, tender_number, title, description, client_id, status, stage, priority, tender_type, estimated_value, submission_deadline, site_visit_date, scope_of_work, assigned_to, created_by, contact_name, contact_email, site_address, site_city, site_state) VALUES
      ('tnd_1', 'TND-001', 'Warehouse LED Lighting Retrofit', 'Full LED retrofit for 50,000 sqft warehouse including emergency lighting', 'cli_1', 'in_progress', 'bid_preparation', 'high', 'competitive', 125000, '2026-05-10', '2026-04-30', 'Supply and install LED high-bay lighting throughout warehouse. Replace existing HID fixtures. Include emergency lighting to AS2293. New switchboard and sub-boards as required.', 'usr_3', 'usr_1', 'John Smith', 'john@acme.com', '200 Industrial Ave', 'Austin', 'TX'),
      ('tnd_2', 'TND-002', 'Shopping Centre Electrical Upgrade', 'Main switchboard upgrade and power factor correction for Sunrise Mall', 'cli_2', 'submitted', 'submitted', 'high', 'competitive', 280000, '2026-04-25', '2026-04-15', 'Upgrade main switchboard from 1000A to 2000A. Install power factor correction unit. New submains to tenancies. After-hours work required.', 'usr_5', 'usr_2', 'Lisa Park', 'lisa@sunrise.com', '456 Oak Ave', 'Houston', 'TX'),
      ('tnd_3', 'TND-003', 'Office Fitout Level 12', 'Complete electrical fitout for new office space', 'cli_3', 'identified', 'prospect', 'medium', 'invited', 85000, '2026-05-20', NULL, 'New electrical fitout including lighting, power, data, fire detection, and emergency systems. Design and construct.', 'usr_3', 'usr_1', 'Robert Davis', 'robert@metro.com', '789 Pine Rd', 'Dallas', 'TX'),
      ('tnd_4', 'TND-004', 'Solar Panel Installation - Greenfield Estate', 'Supply and install 200kW solar system across 15 homes', 'cli_4', 'won', 'awarded', 'medium', 'negotiated', 350000, '2026-03-15', '2026-03-10', 'Design, supply and install 13.3kW solar systems on 15 residential properties. Include battery storage. Grid connection applications.', 'usr_5', 'usr_2', 'Amy Wright', 'amy@greenfield.com', '15 Meadow Ln', 'San Antonio', 'TX'),
      ('tnd_5', 'TND-005', 'Hospital Emergency Power', 'Standby generator and automatic transfer system', 'cli_1', 'lost', 'closed', 'urgent', 'competitive', 195000, '2026-03-01', '2026-02-20', 'Supply and install 500kVA diesel generator with automatic transfer switch. Essential and non-essential load circuits. Weekly test system.', 'usr_3', 'usr_1', 'John Smith', 'john@acme.com', '300 Medical Dr', 'Austin', 'TX');

    -- Seed tender checklist items
    INSERT OR IGNORE INTO tender_checklist (id, tender_id, item, is_complete, sort_order, due_date) VALUES
      ('chk_1', 'tnd_1', 'Review tender documents and specifications', 1, 1, '2026-04-25'),
      ('chk_2', 'tnd_1', 'Complete site visit and measurements', 0, 2, '2026-04-30'),
      ('chk_3', 'tnd_1', 'Request supplier quotes for LED fixtures', 1, 3, '2026-04-28'),
      ('chk_4', 'tnd_1', 'Request supplier quotes for switchboard', 0, 4, '2026-04-28'),
      ('chk_5', 'tnd_1', 'Calculate cable runs and quantities', 0, 5, '2026-05-02'),
      ('chk_6', 'tnd_1', 'Prepare labour estimate', 0, 6, '2026-05-05'),
      ('chk_7', 'tnd_1', 'Complete pricing schedule', 0, 7, '2026-05-07'),
      ('chk_8', 'tnd_1', 'Management review and sign-off', 0, 8, '2026-05-08'),
      ('chk_9', 'tnd_1', 'Submit tender', 0, 9, '2026-05-10'),
      ('chk_10', 'tnd_2', 'Review tender documents', 1, 1, '2026-04-18'),
      ('chk_11', 'tnd_2', 'Site visit completed', 1, 2, '2026-04-15'),
      ('chk_12', 'tnd_2', 'Supplier quotes received', 1, 3, '2026-04-20'),
      ('chk_13', 'tnd_2', 'Pricing complete', 1, 4, '2026-04-22'),
      ('chk_14', 'tnd_2', 'Submit tender', 1, 5, '2026-04-25');

    -- Seed tender items (pricing)
    INSERT OR IGNORE INTO tender_items (id, tender_id, description, category, quantity, unit, unit_cost, markup_percent, total, sort_order) VALUES
      ('ti_1', 'tnd_1', '200W LED High Bay Fixture', 'materials', 120, 'each', 285, 20, 41040, 1),
      ('ti_2', 'tnd_1', 'Emergency LED Batten', 'materials', 45, 'each', 180, 20, 9720, 2),
      ('ti_3', 'tnd_1', 'Distribution Board 24-way', 'materials', 4, 'each', 1200, 20, 5760, 3),
      ('ti_4', 'tnd_1', 'Cable and Containment', 'materials', 1, 'lot', 18000, 15, 20700, 4),
      ('ti_5', 'tnd_1', 'Electrician Labour', 'labour', 480, 'hours', 75, 0, 36000, 5),
      ('ti_6', 'tnd_1', 'Apprentice Labour', 'labour', 480, 'hours', 35, 0, 16800, 6),
      ('ti_7', 'tnd_1', 'Project Management', 'overhead', 1, 'lot', 8500, 0, 8500, 7),
      ('ti_8', 'tnd_1', 'EWP Hire (2 weeks)', 'equipment', 2, 'weeks', 1800, 10, 3960, 8);

    -- Seed follow-ups
    INSERT OR IGNORE INTO follow_ups (id, entity_type, entity_id, title, description, due_date, status, priority, assigned_to, created_by) VALUES
      ('fu_1', 'tender', 'tnd_2', 'Follow up on Shopping Centre tender', 'Check with Lisa Park on tender decision timeline', '2026-04-28', 'pending', 'high', 'usr_2', 'usr_1'),
      ('fu_2', 'tender', 'tnd_3', 'Confirm interest in Office Fitout', 'Call Robert Davis to confirm we will tender', '2026-04-29', 'pending', 'medium', 'usr_1', 'usr_1'),
      ('fu_3', 'quote', 'quo_3', 'Follow up on Electrical Upgrade quote', 'Quote sent 5 days ago - no response yet', '2026-04-28', 'pending', 'high', 'usr_1', 'usr_1'),
      ('fu_4', 'invoice', 'inv_3', 'Chase overdue payment', 'Plumbing Remodel invoice is overdue', '2026-04-27', 'pending', 'urgent', 'usr_2', 'usr_1');

    -- Seed alerts
    INSERT OR IGNORE INTO alerts (id, user_id, title, message, type, entity_type, entity_id, is_read, action_url) VALUES
      ('alrt_1', 'usr_1', 'Tender TND-001 deadline in 12 days', 'Warehouse LED Lighting Retrofit submission due May 10', 'warning', 'tender', 'tnd_1', 0, '/tenders/tnd_1'),
      ('alrt_2', 'usr_2', 'Tender TND-002 awaiting decision', 'Shopping Centre Electrical Upgrade was submitted - follow up needed', 'info', 'tender', 'tnd_2', 0, '/tenders/tnd_2'),
      ('alrt_3', 'usr_1', 'Invoice INV-003 is overdue', 'Plumbing Remodel deposit invoice is past due date', 'warning', 'invoice', 'inv_3', 0, '/invoices/inv_3'),
      ('alrt_4', 'usr_1', 'Quote QUO-003 sent 5 days ago', 'No response on Electrical Upgrade Quote - follow up recommended', 'info', 'quote', 'quo_3', 0, '/quotes/quo_3'),
      ('alrt_5', 'usr_3', 'Site visit tomorrow - TND-001', 'Warehouse LED Lighting Retrofit site visit scheduled for April 30', 'info', 'tender', 'tnd_1', 0, '/tenders/tnd_1'),
      ('alrt_6', 'usr_1', 'Tender TND-001: 5 checklist items incomplete', 'Checklist items need completion before submission deadline', 'urgent', 'tender', 'tnd_1', 0, '/tenders/tnd_1');

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
