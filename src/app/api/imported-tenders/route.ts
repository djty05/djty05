import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

export async function GET(request: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider");
    const state = searchParams.get("state");
    const decision = searchParams.get("decision");
    const search = searchParams.get("search");

    let query = `
      SELECT * FROM imported_tenders
      WHERE is_archived = 0
    `;
    const params: unknown[] = [];

    if (provider) {
      query += ` AND provider = ?`;
      params.push(provider);
    }

    if (state) {
      query += ` AND state = ?`;
      params.push(state);
    }

    if (decision) {
      if (decision === "archived") {
        // Override the is_archived = 0 condition
        query = query.replace("is_archived = 0", "is_archived = 1");
      } else {
        query += ` AND decision = ?`;
        params.push(decision);
      }
    }

    if (search) {
      query += ` AND (title LIKE ? OR client_name LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term);
    }

    query += ` ORDER BY imported_at DESC`;

    const tenders = db.prepare(query).all(...params);
    return NextResponse.json(tenders);
  } catch (error) {
    console.error("Error fetching imported tenders:", error);
    return NextResponse.json(
      { error: "Failed to fetch imported tenders" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const body = await request.json();

    if (!body.title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    if (!body.provider) {
      return NextResponse.json(
        { error: "Provider is required" },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO imported_tenders (
        id, external_id, provider, external_number, title, description,
        client_name, client_email, client_phone, location, state, category,
        trade, estimated_value, closing_date, site_visit_date, documents_url,
        source_url, keywords_matched, decision, raw_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      body.external_id || null,
      body.provider,
      body.external_number || null,
      body.title,
      body.description || null,
      body.client_name || null,
      body.client_email || null,
      body.client_phone || null,
      body.location || null,
      body.state || null,
      body.category || null,
      body.trade || null,
      body.estimated_value || null,
      body.closing_date || null,
      body.site_visit_date || null,
      body.documents_url || null,
      body.source_url || null,
      body.keywords_matched || null,
      body.decision || "pending",
      body.raw_data || null
    );

    const tender = db.prepare(
      `SELECT * FROM imported_tenders WHERE id = ?`
    ).get(id);

    return NextResponse.json(tender, { status: 201 });
  } catch (error) {
    console.error("Error creating imported tender:", error);
    return NextResponse.json(
      { error: "Failed to create imported tender" },
      { status: 500 }
    );
  }
}
