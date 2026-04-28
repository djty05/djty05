import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const tender = db.prepare(`
      SELECT t.*, c.company_name AS client_name, c.contact_name AS client_contact_name,
             c.email AS client_email, c.phone AS client_phone
      FROM tenders t
      LEFT JOIN clients c ON t.client_id = c.id
      WHERE t.id = ?
    `).get(id);

    if (!tender) {
      return NextResponse.json({ error: "Tender not found" }, { status: 404 });
    }

    const checklist = db.prepare(
      `SELECT * FROM tender_checklist WHERE tender_id = ? ORDER BY sort_order ASC`
    ).all(id);

    const items = db.prepare(
      `SELECT * FROM tender_items WHERE tender_id = ? ORDER BY sort_order ASC`
    ).all(id);

    const documents = db.prepare(
      `SELECT * FROM tender_documents WHERE tender_id = ?`
    ).all(id);

    const follow_ups = db.prepare(
      `SELECT * FROM follow_ups WHERE entity_type = 'tender' AND entity_id = ?`
    ).all(id);

    return NextResponse.json({
      ...(tender as Record<string, unknown>),
      checklist,
      items,
      documents,
      follow_ups,
    });
  } catch (error) {
    console.error("Error fetching tender:", error);
    return NextResponse.json({ error: "Failed to fetch tender" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const body = await request.json();

    const existing = db.prepare(`SELECT * FROM tenders WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
    if (!existing) {
      return NextResponse.json({ error: "Tender not found" }, { status: 404 });
    }

    // Validate lost_reason when changing to 'lost'
    if (body.status === "lost" && existing.status !== "lost" && !body.lost_reason) {
      return NextResponse.json(
        { error: "lost_reason is required when setting status to lost" },
        { status: 400 }
      );
    }

    const fields = [
      "title", "description", "client_id", "status", "stage", "priority",
      "tender_type", "source", "estimated_value", "submitted_value", "margin_percent",
      "issue_date", "site_visit_date", "submission_deadline", "decision_date",
      "awarded_date", "lost_reason", "contact_name", "contact_email", "contact_phone",
      "site_address", "site_city", "site_state", "site_zip",
      "scope_of_work", "notes", "assigned_to", "created_by", "job_id",
    ];

    const updates: string[] = [];
    const values: unknown[] = [];

    for (const field of fields) {
      if (field in body) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    // Auto-set awarded_date when status changes to 'won'
    if (body.status === "won" && existing.status !== "won" && !("awarded_date" in body)) {
      updates.push(`awarded_date = datetime('now')`);
    }

    if (updates.length === 0 && !body.checklist && !body.items) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    if (updates.length > 0) {
      updates.push(`updated_at = datetime('now')`);
      values.push(id);
      db.prepare(`UPDATE tenders SET ${updates.join(", ")} WHERE id = ?`).run(...values);
    }

    // Replace checklist if provided
    if (Array.isArray(body.checklist)) {
      db.prepare(`DELETE FROM tender_checklist WHERE tender_id = ?`).run(id);
      const insertChecklist = db.prepare(`
        INSERT INTO tender_checklist (id, tender_id, item, is_complete, completed_by, completed_at, due_date, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (let i = 0; i < body.checklist.length; i++) {
        const ci = body.checklist[i];
        insertChecklist.run(
          ci.id || crypto.randomUUID(),
          id,
          ci.item,
          ci.is_complete || 0,
          ci.completed_by || null,
          ci.completed_at || null,
          ci.due_date || null,
          ci.sort_order ?? i + 1
        );
      }
    }

    // Replace items if provided
    if (Array.isArray(body.items)) {
      db.prepare(`DELETE FROM tender_items WHERE tender_id = ?`).run(id);
      const insertItem = db.prepare(`
        INSERT INTO tender_items (id, tender_id, description, category, quantity, unit, unit_cost, markup_percent, total, notes, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (let i = 0; i < body.items.length; i++) {
        const item = body.items[i];
        insertItem.run(
          item.id || crypto.randomUUID(),
          id,
          item.description,
          item.category || "general",
          item.quantity || 1,
          item.unit || "each",
          item.unit_cost || 0,
          item.markup_percent ?? 20,
          item.total || 0,
          item.notes || null,
          item.sort_order ?? i + 1
        );
      }
    }

    const tender = db.prepare(`
      SELECT t.*, c.company_name AS client_name
      FROM tenders t
      LEFT JOIN clients c ON t.client_id = c.id
      WHERE t.id = ?
    `).get(id);

    return NextResponse.json(tender);
  } catch (error) {
    console.error("Error updating tender:", error);
    return NextResponse.json({ error: "Failed to update tender" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const existing = db.prepare(`SELECT * FROM tenders WHERE id = ?`).get(id);
    if (!existing) {
      return NextResponse.json({ error: "Tender not found" }, { status: 404 });
    }

    db.prepare(`DELETE FROM tenders WHERE id = ?`).run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tender:", error);
    return NextResponse.json({ error: "Failed to delete tender" }, { status: 500 });
  }
}
