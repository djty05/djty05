import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

export async function GET(request: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const stage = searchParams.get("stage");
    const search = searchParams.get("search");
    const assigned_to = searchParams.get("assigned_to");
    const priority = searchParams.get("priority");

    let query = `
      SELECT t.*, c.company_name AS client_name
      FROM tenders t
      LEFT JOIN clients c ON t.client_id = c.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (status) {
      query += ` AND t.status = ?`;
      params.push(status);
    }

    if (stage) {
      query += ` AND t.stage = ?`;
      params.push(stage);
    }

    if (search) {
      query += ` AND (t.title LIKE ? OR t.tender_number LIKE ? OR c.company_name LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    if (assigned_to) {
      query += ` AND t.assigned_to = ?`;
      params.push(assigned_to);
    }

    if (priority) {
      query += ` AND t.priority = ?`;
      params.push(priority);
    }

    query += ` ORDER BY t.created_at DESC`;

    const tenders = db.prepare(query).all(...params);
    return NextResponse.json(tenders);
  } catch (error) {
    console.error("Error fetching tenders:", error);
    return NextResponse.json({ error: "Failed to fetch tenders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const body = await request.json();

    if (!body.title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const id = crypto.randomUUID();

    // Auto-generate tender_number TND-XXX
    const maxRow = db.prepare(
      `SELECT tender_number FROM tenders WHERE tender_number LIKE 'TND-%' ORDER BY tender_number DESC LIMIT 1`
    ).get() as { tender_number: string } | undefined;

    let nextNum = 1;
    if (maxRow) {
      const numPart = parseInt(maxRow.tender_number.replace("TND-", ""), 10);
      if (!isNaN(numPart)) {
        nextNum = numPart + 1;
      }
    }
    const tender_number = `TND-${String(nextNum).padStart(3, "0")}`;

    db.prepare(`
      INSERT INTO tenders (
        id, tender_number, title, description, client_id, status, stage, priority,
        tender_type, source, estimated_value, submitted_value, margin_percent,
        issue_date, site_visit_date, submission_deadline, decision_date,
        contact_name, contact_email, contact_phone,
        site_address, site_city, site_state, site_zip,
        scope_of_work, notes, assigned_to, created_by, job_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      tender_number,
      body.title,
      body.description || null,
      body.client_id || null,
      body.status || "identified",
      body.stage || "prospect",
      body.priority || "medium",
      body.tender_type || "competitive",
      body.source || null,
      body.estimated_value || 0,
      body.submitted_value || 0,
      body.margin_percent || 0,
      body.issue_date || null,
      body.site_visit_date || null,
      body.submission_deadline || null,
      body.decision_date || null,
      body.contact_name || null,
      body.contact_email || null,
      body.contact_phone || null,
      body.site_address || null,
      body.site_city || null,
      body.site_state || null,
      body.site_zip || null,
      body.scope_of_work || null,
      body.notes || null,
      body.assigned_to || null,
      body.created_by || null,
      body.job_id || null
    );

    // Create default checklist items if provided
    if (Array.isArray(body.checklist) && body.checklist.length > 0) {
      const insertChecklist = db.prepare(`
        INSERT INTO tender_checklist (id, tender_id, item, is_complete, due_date, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (let i = 0; i < body.checklist.length; i++) {
        const ci = body.checklist[i];
        insertChecklist.run(
          crypto.randomUUID(),
          id,
          ci.item,
          ci.is_complete || 0,
          ci.due_date || null,
          ci.sort_order ?? i + 1
        );
      }
    }

    const tender = db.prepare(`
      SELECT t.*, c.company_name AS client_name
      FROM tenders t
      LEFT JOIN clients c ON t.client_id = c.id
      WHERE t.id = ?
    `).get(id);

    return NextResponse.json(tender, { status: 201 });
  } catch (error) {
    console.error("Error creating tender:", error);
    return NextResponse.json({ error: "Failed to create tender" }, { status: 500 });
  }
}
