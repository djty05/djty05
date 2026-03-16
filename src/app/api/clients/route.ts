import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

export async function GET(request: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const status = searchParams.get("status");

    let query = `SELECT * FROM clients WHERE 1=1`;
    const params: unknown[] = [];

    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }

    if (search) {
      query += ` AND (company_name LIKE ? OR contact_name LIKE ? OR email LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ` ORDER BY company_name ASC`;

    const clients = db.prepare(query).all(...params);
    return NextResponse.json(clients);
  } catch (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const body = await request.json();
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO clients (id, company_name, contact_name, email, phone, address, city, state, zip, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, body.company_name, body.contact_name || null,
      body.email || null, body.phone || null,
      body.address || null, body.city || null, body.state || null, body.zip || null,
      body.notes || null, body.status || "active"
    );

    const client = db.prepare(`SELECT * FROM clients WHERE id = ?`).get(id);
    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("Error creating client:", error);
    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
