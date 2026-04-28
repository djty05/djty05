import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const alert = db.prepare(`SELECT * FROM alerts WHERE id = ?`).get(id);
    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    return NextResponse.json(alert);
  } catch (error) {
    console.error("Error fetching alert:", error);
    return NextResponse.json({ error: "Failed to fetch alert" }, { status: 500 });
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

    const existing = db.prepare(`SELECT * FROM alerts WHERE id = ?`).get(id);
    if (!existing) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    const fields = [
      "user_id", "title", "message", "type",
      "entity_type", "entity_id", "is_read", "action_url",
    ];

    const updates: string[] = [];
    const values: unknown[] = [];

    for (const field of fields) {
      if (field in body) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    values.push(id);
    db.prepare(`UPDATE alerts SET ${updates.join(", ")} WHERE id = ?`).run(...values);

    const alert = db.prepare(`SELECT * FROM alerts WHERE id = ?`).get(id);
    return NextResponse.json(alert);
  } catch (error) {
    console.error("Error updating alert:", error);
    return NextResponse.json({ error: "Failed to update alert" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const existing = db.prepare(`SELECT * FROM alerts WHERE id = ?`).get(id);
    if (!existing) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    db.prepare(`DELETE FROM alerts WHERE id = ?`).run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting alert:", error);
    return NextResponse.json({ error: "Failed to delete alert" }, { status: 500 });
  }
}
