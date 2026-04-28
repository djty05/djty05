import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const db = getDb();
    const body = await request.json();

    if (!body.user_id) {
      return NextResponse.json({ error: "user_id is required" }, { status: 400 });
    }

    const result = db.prepare(
      `UPDATE alerts SET is_read = 1 WHERE user_id = ? AND is_read = 0`
    ).run(body.user_id);

    return NextResponse.json({
      success: true,
      updated: result.changes,
    });
  } catch (error) {
    console.error("Error marking alerts as read:", error);
    return NextResponse.json({ error: "Failed to mark alerts as read" }, { status: 500 });
  }
}
