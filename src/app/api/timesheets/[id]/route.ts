import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const timesheet = db.prepare(`
      SELECT t.*, u.name AS user_name, j.title AS job_title
      FROM timesheets t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN jobs j ON t.job_id = j.id
      WHERE t.id = ?
    `).get(id);

    if (!timesheet) {
      return NextResponse.json({ error: "Timesheet not found" }, { status: 404 });
    }

    return NextResponse.json(timesheet);
  } catch (error) {
    console.error("Error fetching timesheet:", error);
    return NextResponse.json({ error: "Failed to fetch timesheet" }, { status: 500 });
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

    const existing = db.prepare("SELECT id FROM timesheets WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Timesheet not found" }, { status: 404 });
    }

    const fields = [
      "user_id", "job_id", "task_id", "clock_in", "clock_out",
      "break_minutes", "total_hours", "latitude_in", "longitude_in",
      "latitude_out", "longitude_out", "notes", "status", "approved_by"
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

    db.prepare(`UPDATE timesheets SET ${updates.join(", ")} WHERE id = ?`).run(...values);

    const timesheet = db.prepare("SELECT * FROM timesheets WHERE id = ?").get(id);
    return NextResponse.json(timesheet);
  } catch (error) {
    console.error("Error updating timesheet:", error);
    return NextResponse.json({ error: "Failed to update timesheet" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const existing = db.prepare("SELECT id FROM timesheets WHERE id = ?").get(id);
    if (!existing) {
      return NextResponse.json({ error: "Timesheet not found" }, { status: 404 });
    }

    db.prepare("DELETE FROM timesheets WHERE id = ?").run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting timesheet:", error);
    return NextResponse.json({ error: "Failed to delete timesheet" }, { status: 500 });
  }
}
