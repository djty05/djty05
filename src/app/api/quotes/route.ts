import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

export async function GET(request: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let query = `
      SELECT q.*, c.company_name AS client_name
      FROM quotes q
      LEFT JOIN clients c ON q.client_id = c.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (status) {
      query += ` AND q.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY q.created_at DESC`;

    const quotes = db.prepare(query).all(...params);
    return NextResponse.json(quotes);
  } catch (error) {
    console.error("Error fetching quotes:", error);
    return NextResponse.json({ error: "Failed to fetch quotes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const body = await request.json();

    const maxRow = db.prepare(
      `SELECT quote_number FROM quotes ORDER BY CAST(SUBSTR(quote_number, 5) AS INTEGER) DESC LIMIT 1`
    ).get() as { quote_number: string } | undefined;

    const nextNum = maxRow ? parseInt(maxRow.quote_number.split("-")[1], 10) + 1 : 1;
    const quote_number = `QUO-${String(nextNum).padStart(3, "0")}`;
    const id = crypto.randomUUID();

    const insertQuote = db.prepare(`
      INSERT INTO quotes (id, quote_number, client_id, job_id, title, description, status,
        subtotal, tax_rate, tax_amount, total, valid_until, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertItem = db.prepare(`
      INSERT INTO quote_items (id, quote_id, description, quantity, unit_price, total, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      insertQuote.run(
        id, quote_number,
        body.client_id || null, body.job_id || null,
        body.title, body.description || null,
        body.status || "draft",
        body.subtotal || 0, body.tax_rate ?? 0.10,
        body.tax_amount || 0, body.total || 0,
        body.valid_until || null, body.notes || null,
        body.created_by || null
      );

      if (Array.isArray(body.items)) {
        for (let i = 0; i < body.items.length; i++) {
          const item = body.items[i];
          insertItem.run(
            crypto.randomUUID(), id,
            item.description, item.quantity ?? 1,
            item.unit_price ?? 0, item.total ?? 0,
            item.sort_order ?? i
          );
        }
      }
    });

    transaction();

    const quote = db.prepare(`SELECT * FROM quotes WHERE id = ?`).get(id);
    const items = db.prepare(`SELECT * FROM quote_items WHERE quote_id = ? ORDER BY sort_order`).all(id);
    return NextResponse.json({ ...quote as Record<string, unknown>, items }, { status: 201 });
  } catch (error) {
    console.error("Error creating quote:", error);
    return NextResponse.json({ error: "Failed to create quote" }, { status: 500 });
  }
}
