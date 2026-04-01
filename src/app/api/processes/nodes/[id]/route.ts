import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();

    const hasPosition = body.position_x !== undefined && body.position_y !== undefined;
    const hasNameAndMeta = body.name !== undefined && body.metadata !== undefined;
    const hasMeta = body.metadata !== undefined;
    const hasName = body.name !== undefined;

    let result;

    if (hasPosition && hasMeta) {
      result = await sql`
        UPDATE business_processes
        SET position_x = ${body.position_x},
            position_y = ${body.position_y},
            name = ${body.name},
            metadata = CAST(${JSON.stringify(body.metadata)} AS jsonb)
        WHERE id = ${id} RETURNING *`;
    } else if (hasPosition) {
      result = await sql`
        UPDATE business_processes
        SET position_x = ${body.position_x}, position_y = ${body.position_y}
        WHERE id = ${id} RETURNING *`;
    } else if (hasNameAndMeta) {
      result = await sql`
        UPDATE business_processes
        SET name = ${body.name}, metadata = CAST(${JSON.stringify(body.metadata)} AS jsonb)
        WHERE id = ${id} RETURNING *`;
    } else if (hasMeta) {
      result = await sql`
        UPDATE business_processes
        SET metadata = CAST(${JSON.stringify(body.metadata)} AS jsonb)
        WHERE id = ${id} RETURNING *`;
    } else if (hasName) {
      result = await sql`
        UPDATE business_processes SET name = ${body.name}
        WHERE id = ${id} RETURNING *`;
    } else {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

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
