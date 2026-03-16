import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

export async function GET(request: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    let query = `
      SELECT j.*, c.company_name AS client_name
      FROM jobs j
      LEFT JOIN clients c ON j.client_id = c.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (status) {
      query += ` AND j.status = ?`;
      params.push(status);
    }

    if (search) {
      query += ` AND (j.title LIKE ? OR j.job_number LIKE ? OR c.company_name LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ` ORDER BY j.created_at DESC`;

    const jobs = db.prepare(query).all(...params);
    return NextResponse.json(jobs);
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const body = await request.json();

    const maxRow = db.prepare(
      `SELECT job_number FROM jobs ORDER BY CAST(SUBSTR(job_number, 5) AS INTEGER) DESC LIMIT 1`
    ).get() as { job_number: string } | undefined;

    const nextNum = maxRow ? parseInt(maxRow.job_number.split("-")[1], 10) + 1 : 1;
    const job_number = `JOB-${String(nextNum).padStart(3, "0")}`;
    const id = crypto.randomUUID();

    const stmt = db.prepare(`
      INSERT INTO jobs (id, job_number, title, description, client_id, status, priority, job_type,
        address, city, state, zip, latitude, longitude, estimated_hours, estimated_cost,
        start_date, due_date, assigned_to, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id, job_number,
      body.title, body.description || null, body.client_id || null,
      body.status || "draft", body.priority || "medium", body.job_type || "service",
      body.address || null, body.city || null, body.state || null, body.zip || null,
      body.latitude || null, body.longitude || null,
      body.estimated_hours || null, body.estimated_cost || 0,
      body.start_date || null, body.due_date || null,
      body.assigned_to || null, body.created_by || null
    );

    const job = db.prepare(`SELECT * FROM jobs WHERE id = ?`).get(id);
    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    console.error("Error creating job:", error);
    return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
  }
}
