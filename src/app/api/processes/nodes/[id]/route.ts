import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();

    const fields: string[] = [];
    const values: unknown[] = [];

    for (const key of [
      "name",
      "category",
      "description",
      "position_x",
      "position_y",
    ] as const) {
      if (body[key] !== undefined) {
        fields.push(key);
        values.push(body[key]);
      }
    }

    if (fields.length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const setClauses = fields.map((f, i) => `${f} = $${i + 2}`).join(", ");
    const query = `UPDATE business_processes SET ${setClauses} WHERE id = $1 RETURNING id, name, category, description, position_x, position_y`;

    const result = await sql.query(query, [id, ...values]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Failed to update process:", error);
    return NextResponse.json(
      { error: "Failed to update process" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    await sql`DELETE FROM process_connections WHERE source_id = ${id} OR target_id = ${id}`;
    await sql`DELETE FROM business_processes WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete process:", error);
    return NextResponse.json(
      { error: "Failed to delete process" },
      { status: 500 }
    );
  }
}
