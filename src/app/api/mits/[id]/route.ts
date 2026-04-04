import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [mitResult, tasksResult, nodesResult] = await Promise.all([
      sql`SELECT id, title, owner_id, quarter, year, status, problem_statement, hypothesis, sort_order, created_at FROM mits WHERE id = ${id}`,
      sql`SELECT id, title, mit_id, owner_id, due_date, status, sort_order, created_at FROM critical_tasks WHERE mit_id = ${id} ORDER BY sort_order, created_at`,
      sql`SELECT id, mit_id, node_id, created_at FROM mit_node_assignments WHERE mit_id = ${id}`,
    ]);

    if (mitResult.rows.length === 0) {
      return NextResponse.json({ error: "MIT not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        ...mitResult.rows[0],
        critical_tasks: tasksResult.rows,
        node_assignments: nodesResult.rows,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Failed to fetch MIT:", error);
    return NextResponse.json(
      { error: "Failed to fetch MIT" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { title, owner_id, quarter, year, status, problem_statement, hypothesis, sort_order } =
      await req.json();

    if (title !== undefined) {
      const current = await sql`SELECT title FROM mits WHERE id = ${id}`;
      if (current.rows.length > 0 && current.rows[0].title === "Daily Operations" && title !== "Daily Operations") {
        return NextResponse.json(
          { error: "Cannot rename Daily Operations MIT" },
          { status: 403 }
        );
      }
    }

    const result = await sql`
      UPDATE mits
      SET title = COALESCE(${title ?? null}, title),
          owner_id = COALESCE(${owner_id ?? null}, owner_id),
          quarter = COALESCE(${quarter ?? null}, quarter),
          year = COALESCE(${year ?? null}, year),
          status = COALESCE(${status ?? null}, status),
          problem_statement = COALESCE(${problem_statement ?? null}, problem_statement),
          hypothesis = COALESCE(${hypothesis ?? null}, hypothesis),
          sort_order = COALESCE(${sort_order ?? null}, sort_order)
      WHERE id = ${id}
      RETURNING id, title, owner_id, quarter, year, status, problem_statement, hypothesis, sort_order, created_at
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "MIT not found" }, { status: 404 });
    }
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Failed to update MIT:", error);
    return NextResponse.json(
      { error: "Failed to update MIT" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const mit = await sql`SELECT title FROM mits WHERE id = ${id}`;
    if (mit.rows.length > 0 && mit.rows[0].title === "Daily Operations") {
      return NextResponse.json(
        { error: "Cannot delete Daily Operations MIT" },
        { status: 403 }
      );
    }

    // Cascade: delete node assignments, then CTs, then the MIT
    await sql`DELETE FROM mit_node_assignments WHERE mit_id = ${id}`;
    await sql`DELETE FROM critical_tasks WHERE mit_id = ${id}`;
    await sql`DELETE FROM mits WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete MIT:", error);
    return NextResponse.json(
      { error: "Failed to delete MIT" },
      { status: 500 }
    );
  }
}
