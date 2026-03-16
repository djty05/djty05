import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

export async function GET(request: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const job_id = searchParams.get("job_id");

    let query = `
      SELECT p.*, j.title AS job_title
      FROM plans p
      LEFT JOIN jobs j ON p.job_id = j.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (job_id) {
      query += ` AND p.job_id = ?`;
      params.push(job_id);
    }

    query += ` ORDER BY p.created_at DESC`;

    const plans = db.prepare(query).all(...params);
    return NextResponse.json(plans);
  } catch (error) {
    console.error("Error fetching plans:", error);
    return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const body = await request.json();
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO plans (id, job_id, name, file_name, version, sheet_number, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      body.job_id || null,
      body.name,
      body.file_name || null,
      body.version ?? 1,
      body.sheet_number || null,
      body.notes || null,
      body.created_by || null
    );

    const plan = db.prepare(`
      SELECT p.*, j.title AS job_title
      FROM plans p
      LEFT JOIN jobs j ON p.job_id = j.id
      WHERE p.id = ?
    `).get(id);
    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error("Error creating plan:", error);
    return NextResponse.json({ error: "Failed to create plan" }, { status: 500 });
  }
}
