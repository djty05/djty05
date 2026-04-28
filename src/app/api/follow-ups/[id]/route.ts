import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const followUp = db.prepare(`
      SELECT f.*, u.name AS assigned_to_name
      FROM follow_ups f
      LEFT JOIN users u ON f.assigned_to = u.id
      WHERE f.id = ?
    `).get(id);

    if (!followUp) {
      return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });
    }

    return NextResponse.json(followUp);
  } catch (error) {
    console.error("Error fetching follow-up:", error);
    return NextResponse.json({ error: "Failed to fetch follow-up" }, { status: 500 });
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

    const existing = db.prepare(`SELECT * FROM follow_ups WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
    if (!existing) {
      return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });
    }

    const fields = [
      "entity_type", "entity_id", "title", "description",
      "due_date", "completed_date", "status", "priority",
      "assigned_to", "created_by",
    ];

    const updates: string[] = [];
    const values: unknown[] = [];

    for (const field of fields) {
      if (field in body) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    // Auto-set completed_date when marking as completed
    if (body.status === "completed" && existing.status !== "completed" && !("completed_date" in body)) {
      updates.push(`completed_date = datetime('now')`);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(id);
    db.prepare(`UPDATE follow_ups SET ${updates.join(", ")} WHERE id = ?`).run(...values);

    const followUp = db.prepare(`
      SELECT f.*, u.name AS assigned_to_name
      FROM follow_ups f
      LEFT JOIN users u ON f.assigned_to = u.id
      WHERE f.id = ?
    `).get(id);

    return NextResponse.json(followUp);
  } catch (error) {
    console.error("Error updating follow-up:", error);
    return NextResponse.json({ error: "Failed to update follow-up" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const existing = db.prepare(`SELECT * FROM follow_ups WHERE id = ?`).get(id);
    if (!existing) {
      return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });
    }

    db.prepare(`DELETE FROM follow_ups WHERE id = ?`).run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting follow-up:", error);
    return NextResponse.json({ error: "Failed to delete follow-up" }, { status: 500 });
  }
}
