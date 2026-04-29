import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const tender = db.prepare(
      `SELECT * FROM imported_tenders WHERE id = ?`
    ).get(id);

    if (!tender) {
      return NextResponse.json(
        { error: "Imported tender not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(tender);
  } catch (error) {
    console.error("Error fetching imported tender:", error);
    return NextResponse.json(
      { error: "Failed to fetch imported tender" },
      { status: 500 }
    );
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

    const existing = db.prepare(
      `SELECT * FROM imported_tenders WHERE id = ?`
    ).get(id) as Record<string, unknown> | undefined;

    if (!existing) {
      return NextResponse.json(
        { error: "Imported tender not found" },
        { status: 404 }
      );
    }

    const fields = [
      "external_id",
      "provider",
      "external_number",
      "title",
      "description",
      "client_name",
      "client_email",
      "client_phone",
      "location",
      "state",
      "category",
      "trade",
      "estimated_value",
      "closing_date",
      "site_visit_date",
      "documents_url",
      "source_url",
      "keywords_matched",
      "decision",
      "decision_reason",
      "decision_by",
      "tender_id",
      "is_archived",
      "raw_data",
    ];

    const updates: string[] = [];
    const values: unknown[] = [];

    for (const field of fields) {
      if (field in body) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    // Auto-set decision_date and decision_by when decision changes
    if ("decision" in body && body.decision !== existing.decision) {
      if (!updates.some((u) => u.startsWith("decision_date"))) {
        updates.push(`decision_date = datetime('now')`);
      }
      if (body.decision_by && !updates.some((u) => u.startsWith("decision_by"))) {
        updates.push(`decision_by = ?`);
        values.push(body.decision_by);
      }

      // When decision='quoted', also accept tender_id to link
      if (body.decision === "quoted" && body.tender_id) {
        if (!updates.some((u) => u.startsWith("tender_id"))) {
          updates.push(`tender_id = ?`);
          values.push(body.tender_id);
        }
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    values.push(id);
    db.prepare(
      `UPDATE imported_tenders SET ${updates.join(", ")} WHERE id = ?`
    ).run(...values);

    const updated = db.prepare(
      `SELECT * FROM imported_tenders WHERE id = ?`
    ).get(id);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating imported tender:", error);
    return NextResponse.json(
      { error: "Failed to update imported tender" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const existing = db.prepare(
      `SELECT * FROM imported_tenders WHERE id = ?`
    ).get(id);

    if (!existing) {
      return NextResponse.json(
        { error: "Imported tender not found" },
        { status: 404 }
      );
    }

    // Archive instead of hard delete
    db.prepare(
      `UPDATE imported_tenders SET is_archived = 1 WHERE id = ?`
    ).run(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting imported tender:", error);
    return NextResponse.json(
      { error: "Failed to delete imported tender" },
      { status: 500 }
    );
  }
}
