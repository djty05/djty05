import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const imported = db.prepare(
      `SELECT * FROM imported_tenders WHERE id = ?`
    ).get(id) as Record<string, unknown> | undefined;

    if (!imported) {
      return NextResponse.json(
        { error: "Imported tender not found" },
        { status: 404 }
      );
    }

    if (imported.decision === "quoted" && imported.tender_id) {
      return NextResponse.json(
        { error: "This imported tender has already been converted", tender_id: imported.tender_id },
        { status: 400 }
      );
    }

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
    const tenderNumber = `TND-${String(nextNum).padStart(3, "0")}`;
    const tenderId = crypto.randomUUID();

    // Try to find or create a client based on imported tender info
    let clientId: string | null = null;
    if (imported.client_name) {
      const existingClient = db.prepare(
        `SELECT id FROM clients WHERE company_name = ?`
      ).get(imported.client_name as string) as { id: string } | undefined;

      if (existingClient) {
        clientId = existingClient.id;
      }
    }

    // Parse optional body for extra fields
    let body: Record<string, unknown> = {};
    try {
      body = await request.json();
    } catch {
      // No body provided, that's fine
    }

    // Create the tender
    db.prepare(`
      INSERT INTO tenders (
        id, tender_number, title, description, client_id, status, stage, priority,
        tender_type, source, estimated_value, submission_deadline, site_visit_date,
        contact_name, contact_email, contact_phone,
        site_address, site_state,
        scope_of_work, assigned_to, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tenderId,
      tenderNumber,
      imported.title as string,
      imported.description || null,
      clientId,
      "identified",
      "prospect",
      body.priority || "medium",
      "competitive",
      imported.provider as string,
      imported.estimated_value || 0,
      imported.closing_date || null,
      imported.site_visit_date || null,
      imported.client_name || null,
      imported.client_email || null,
      imported.client_phone || null,
      imported.location || null,
      imported.state || null,
      imported.description || null,
      body.assigned_to || null,
      body.created_by || null
    );

    // Create default electrical checklist items
    const checklistItems = [
      "Review tender documents and specifications",
      "Complete site visit and measurements",
      "Request supplier quotes for materials",
      "Calculate cable runs and quantities",
      "Prepare labour estimate",
      "Review electrical drawings and schematics",
      "Check compliance requirements (AS/NZS 3000)",
      "Complete pricing schedule",
      "Management review and sign-off",
      "Submit tender",
    ];

    const insertChecklist = db.prepare(`
      INSERT INTO tender_checklist (id, tender_id, item, is_complete, sort_order)
      VALUES (?, ?, ?, 0, ?)
    `);

    for (let i = 0; i < checklistItems.length; i++) {
      insertChecklist.run(crypto.randomUUID(), tenderId, checklistItems[i], i + 1);
    }

    // Update the imported tender with decision='quoted' and link to the new tender
    db.prepare(`
      UPDATE imported_tenders
      SET decision = 'quoted',
          decision_date = datetime('now'),
          decision_by = ?,
          tender_id = ?
      WHERE id = ?
    `).run(body.created_by || null, tenderId, id);

    // Fetch the newly created tender with related data
    const tender = db.prepare(`
      SELECT t.*, c.company_name AS client_name
      FROM tenders t
      LEFT JOIN clients c ON t.client_id = c.id
      WHERE t.id = ?
    `).get(tenderId);

    const checklist = db.prepare(
      `SELECT * FROM tender_checklist WHERE tender_id = ? ORDER BY sort_order ASC`
    ).all(tenderId);

    return NextResponse.json(
      {
        ...(tender as Record<string, unknown>),
        checklist,
        converted_from: id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error converting imported tender:", error);
    return NextResponse.json(
      { error: "Failed to convert imported tender" },
      { status: 500 }
    );
  }
}
