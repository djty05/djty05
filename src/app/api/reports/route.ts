import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (!type) {
      return NextResponse.json({ error: "Missing required 'type' query parameter" }, { status: 400 });
    }

    switch (type) {
      case "revenue": {
        const totalInvoiced = db.prepare(
          "SELECT COALESCE(SUM(total), 0) AS amount FROM invoices"
        ).get() as { amount: number };

        const totalPaid = db.prepare(
          "SELECT COALESCE(SUM(total), 0) AS amount FROM invoices WHERE status = 'paid'"
        ).get() as { amount: number };

        const totalOutstanding = db.prepare(
          "SELECT COALESCE(SUM(total), 0) AS amount FROM invoices WHERE status IN ('sent', 'overdue')"
        ).get() as { amount: number };

        return NextResponse.json({
          total_invoiced: totalInvoiced.amount,
          total_paid: totalPaid.amount,
          total_outstanding: totalOutstanding.amount,
        });
      }

      case "jobs": {
        const statusCounts = db.prepare(
          "SELECT status, COUNT(*) AS count FROM jobs GROUP BY status"
        ).all() as { status: string; count: number }[];

        const totalJobs = db.prepare(
          "SELECT COUNT(*) AS count FROM jobs"
        ).get() as { count: number };

        const completedJobs = db.prepare(
          "SELECT COUNT(*) AS count FROM jobs WHERE status = 'completed'"
        ).get() as { count: number };

        const completionRate = totalJobs.count > 0
          ? Math.round((completedJobs.count / totalJobs.count) * 100)
          : 0;

        return NextResponse.json({
          status_counts: statusCounts,
          total_jobs: totalJobs.count,
          completed_jobs: completedJobs.count,
          completion_rate: completionRate,
        });
      }

      case "team": {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const monthStart = startOfMonth.toISOString();

        const hoursPerUser = db.prepare(`
          SELECT u.id, u.name, COALESCE(SUM(t.total_hours), 0) AS total_hours
          FROM users u
          LEFT JOIN timesheets t ON u.id = t.user_id AND t.clock_in >= ?
          WHERE u.is_active = 1
          GROUP BY u.id, u.name
          ORDER BY total_hours DESC
        `).all(monthStart);

        return NextResponse.json({ hours_per_user: hoursPerUser });
      }

      case "inventory": {
        const lowStock = db.prepare(`
          SELECT * FROM inventory_items
          WHERE quantity_on_hand <= reorder_point
          ORDER BY quantity_on_hand ASC
        `).all();

        const totalValue = db.prepare(
          "SELECT COALESCE(SUM(quantity_on_hand * unit_cost), 0) AS value FROM inventory_items"
        ).get() as { value: number };

        return NextResponse.json({
          low_stock_items: lowStock,
          total_inventory_value: totalValue.value,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown report type: '${type}'. Valid types: revenue, jobs, team, inventory` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}
