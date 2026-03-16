import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

export async function GET(request: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get("user_id");
    const status = searchParams.get("status");

    let query = `
      SELECT t.*, u.name AS user_name, j.title AS job_title
      FROM timesheets t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN jobs j ON t.job_id = j.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (user_id) {
      query += ` AND t.user_id = ?`;
      params.push(user_id);
    }

    if (status) {
      query += ` AND t.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY t.clock_in DESC`;

    const timesheets = db.prepare(query).all(...params);
    return NextResponse.json(timesheets);
  } catch (error) {
    console.error("Error fetching timesheets:", error);
    return NextResponse.json({ error: "Failed to fetch timesheets" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const body = await request.json();
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO timesheets (id, user_id, job_id, task_id, clock_in, clock_out,
        break_minutes, total_hours, latitude_in, longitude_in, latitude_out, longitude_out,
        notes, status, approved_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      body.user_id ?? null, body.job_id ?? null, body.task_id ?? null,
      body.clock_in, body.clock_out ?? null,
      body.break_minutes ?? 0, body.total_hours ?? null,
      body.latitude_in ?? null, body.longitude_in ?? null,
      body.latitude_out ?? null, body.longitude_out ?? null,
      body.notes ?? null, body.status ?? "pending",
      body.approved_by ?? null
    );

    const timesheet = db.prepare("SELECT * FROM timesheets WHERE id = ?").get(id);
    return NextResponse.json(timesheet, { status: 201 });
  } catch (error) {
    console.error("Error creating timesheet:", error);
    return NextResponse.json({ error: "Failed to create timesheet" }, { status: 500 });
  }
}
