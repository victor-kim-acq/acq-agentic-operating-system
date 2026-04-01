import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();

    const current = await sql`SELECT * FROM business_processes WHERE id = ${id}`;
    if (current.rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const row = current.rows[0];
    const name = body.name ?? row.name;
    const category = body.category ?? row.category;
    const description = body.description ?? row.description;
    const position_x = body.position_x ?? row.position_x;
    const position_y = body.position_y ?? row.position_y;
    const metadata = body.metadata ?? row.metadata ?? {};

    const result = await sql`
      UPDATE business_processes
      SET name = ${name},
          category = ${category},
          description = ${description},
          position_x = ${position_x},
          position_y = ${position_y},
          metadata = CAST(${JSON.stringify(metadata)} AS jsonb)
      WHERE id = ${id}
      RETURNING *
    `;

    const verify = await sql`SELECT metadata FROM business_processes WHERE id = ${id}`;
    console.log('VERIFY after update:', JSON.stringify(verify.rows[0]?.metadata));

    return NextResponse.json({ ...result.rows[0], _verify: verify.rows[0]?.metadata });
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
