import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const event = db.prepare("SELECT * FROM schedule_events WHERE id = ?").get(id);
    if (!event) {
      return NextResponse.json({ error: "Schedule event not found" }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error("Error fetching schedule event:", error);
    return NextResponse.json({ error: "Failed to fetch schedule event" }, { status: 500 });
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

    const existing = db.prepare("SELECT id FROM schedule_events WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Schedule event not found" }, { status: 404 });
    }

    const fields = [
      "job_id", "task_id", "user_id", "title", "description",
      "start_time", "end_time", "all_day", "event_type", "status", "color"
    ];

    const updates: string[] = [];
    const values: unknown[] = [];

    for (const field of fields) {
      if (field in body) {
        updates.push(`${field} = ?`);
        values.push(field === "all_day" ? (body[field] ? 1 : 0) : body[field]);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    updates.push("updated_at = datetime('now')");
    values.push(id);

    db.prepare(`UPDATE schedule_events SET ${updates.join(", ")} WHERE id = ?`).run(...values);

    const event = db.prepare("SELECT * FROM schedule_events WHERE id = ?").get(id);
    return NextResponse.json(event);
  } catch (error) {
    console.error("Error updating schedule event:", error);
    return NextResponse.json({ error: "Failed to update schedule event" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const existing = db.prepare("SELECT id FROM schedule_events WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Schedule event not found" }, { status: 404 });
    }

    db.prepare("DELETE FROM schedule_events WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting schedule event:", error);
    return NextResponse.json({ error: "Failed to delete schedule event" }, { status: 500 });
  }
}
