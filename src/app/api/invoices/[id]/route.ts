import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import crypto from "crypto";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const invoice = db.prepare(`
      SELECT i.*, c.company_name AS client_name, c.contact_name AS client_contact,
        c.email AS client_email, c.phone AS client_phone
      FROM invoices i
      LEFT JOIN clients c ON i.client_id = c.id
      WHERE i.id = ?
    `).get(id);

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const items = db.prepare(
      `SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY sort_order`
    ).all(id);

    return NextResponse.json({ ...(invoice as Record<string, unknown>), items });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json({ error: "Failed to fetch invoice" }, { status: 500 });
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

    const existing = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(id);
    if (!existing) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const fields = [
      "client_id", "job_id", "quote_id", "title", "status",
      "subtotal", "tax_rate", "tax_amount", "total", "due_date", "paid_date", "notes"
    ];

    const updates: string[] = [];
    const values: unknown[] = [];

    for (const field of fields) {
      if (field in body) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    const transaction = db.transaction(() => {
      if (updates.length > 0) {
        updates.push(`updated_at = datetime('now')`);
        values.push(id);
        db.prepare(`UPDATE invoices SET ${updates.join(", ")} WHERE id = ?`).run(...values);
      }

      if (Array.isArray(body.items)) {
        db.prepare(`DELETE FROM invoice_items WHERE invoice_id = ?`).run(id);
        const insertItem = db.prepare(`
          INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, total, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (let i = 0; i < body.items.length; i++) {
          const item = body.items[i];
          insertItem.run(
            item.id || crypto.randomUUID(), id,
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
    return NextResponse.json({ ...(invoice as Record<string, unknown>), items });
  } catch (error) {
    console.error("Error updating invoice:", error);
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();

    const existing = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(id);
    if (!existing) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    db.prepare(`DELETE FROM invoices WHERE id = ?`).run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting invoice:", error);
    return NextResponse.json({ error: "Failed to delete invoice" }, { status: 500 });
  }
}
