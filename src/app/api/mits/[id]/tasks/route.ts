import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const result = await sql`
      SELECT id, title, mit_id, owner_id, due_date, status, sort_order, created_at
      FROM critical_tasks
      WHERE mit_id = ${id}
      ORDER BY sort_order, created_at
    `;
    return NextResponse.json(result.rows, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Failed to fetch critical tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch critical tasks" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const mitId = params.id;
    const { id, title, owner_id, due_date, status, sort_order } = await req.json();

    const result = await sql`
      INSERT INTO critical_tasks (id, title, mit_id, owner_id, due_date, status, sort_order)
      VALUES (${id}, ${title}, ${mitId}, ${owner_id ?? null}, ${due_date ?? null}, ${status ?? null}, ${sort_order ?? null})
      RETURNING id, title, mit_id, owner_id, due_date, status, sort_order, created_at
    `;

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Failed to create critical task:", error);
    return NextResponse.json(
      { error: "Failed to create critical task" },
      { status: 500 }
    );
  }
}
