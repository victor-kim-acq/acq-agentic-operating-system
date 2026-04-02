import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; taskId: string } }
) {
  try {
    const { taskId } = params;
    const { title, owner_id, due_date, status, sort_order } = await req.json();

    const result = await sql`
      UPDATE critical_tasks
      SET title = COALESCE(${title ?? null}, title),
          owner_id = COALESCE(${owner_id ?? null}, owner_id),
          due_date = COALESCE(${due_date ?? null}, due_date),
          status = COALESCE(${status ?? null}, status),
          sort_order = COALESCE(${sort_order ?? null}, sort_order)
      WHERE id = ${taskId}
      RETURNING id, title, mit_id, owner_id, due_date, status, sort_order, created_at
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Failed to update critical task:", error);
    return NextResponse.json(
      { error: "Failed to update critical task" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; taskId: string } }
) {
  try {
    const { taskId } = params;
    await sql`DELETE FROM critical_tasks WHERE id = ${taskId}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete critical task:", error);
    return NextResponse.json(
      { error: "Failed to delete critical task" },
      { status: 500 }
    );
  }
}
