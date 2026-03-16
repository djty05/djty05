import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

export async function GET(request: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    let query = `SELECT * FROM inventory_items WHERE 1=1`;
    const params: unknown[] = [];

    if (category) {
      query += ` AND category = ?`;
      params.push(category);
    }

    if (search) {
      query += ` AND (name LIKE ? OR sku LIKE ? OR description LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += ` ORDER BY name ASC`;

    const items = db.prepare(query).all(...params);
    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const body = await request.json();
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO inventory_items (id, sku, name, description, category, unit,
        quantity_on_hand, quantity_reserved, reorder_point, unit_cost, unit_price,
        supplier, location)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      body.sku ?? null, body.name, body.description ?? null,
      body.category ?? null, body.unit ?? "each",
      body.quantity_on_hand ?? 0, body.quantity_reserved ?? 0,
      body.reorder_point ?? 0, body.unit_cost ?? 0, body.unit_price ?? 0,
      body.supplier ?? null, body.location ?? null
    );

    const item = db.prepare("SELECT * FROM inventory_items WHERE id = ?").get(id);
    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error creating inventory item:", error);
    return NextResponse.json({ error: "Failed to create inventory item" }, { status: 500 });
  }
}
