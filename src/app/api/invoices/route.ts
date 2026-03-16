import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

export async function GET(request: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let query = `
      SELECT i.*, c.company_name AS client_name
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (status) {
      query += ` AND i.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY i.created_at DESC`;

    const invoices = db.prepare(query).all(...params);
    return NextResponse.json(invoices);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const body = await request.json();

    const maxRow = db.prepare(
      `SELECT invoice_number FROM invoices ORDER BY CAST(SUBSTR(invoice_number, 5) AS INTEGER) DESC LIMIT 1`
    ).get() as { invoice_number: string } | undefined;

    const nextNum = maxRow ? parseInt(maxRow.invoice_number.split("-")[1], 10) + 1 : 1;
    const invoice_number = `INV-${String(nextNum).padStart(3, "0")}`;
    const id = crypto.randomUUID();

    const insertInvoice = db.prepare(`
      INSERT INTO invoices (id, invoice_number, client_id, job_id, quote_id, title, status,
        subtotal, tax_rate, tax_amount, total, due_date, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertItem = db.prepare(`
      INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, total, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      insertInvoice.run(
        id, invoice_number,
        body.client_id || null, body.job_id || null, body.quote_id || null,
        body.title, body.status || "draft",
        body.subtotal || 0, body.tax_rate ?? 0.10,
        body.tax_amount || 0, body.total || 0,
        body.due_date || null, body.notes || null,
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

    const invoice = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(id);
    const items = db.prepare(`SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order`).all(id);
    return NextResponse.json({ ...(invoice as Record<string, unknown>), items }, { status: 201 });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}
