import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const fetchCache = "force-no-store";
export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { label } = await req.json();

    const result = await sql`
      UPDATE process_connections
      SET label = ${label ?? null}
      WHERE id = ${id}
      RETURNING id, source_id, target_id, label
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Edge not found" }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Failed to update connection:", error);
    return NextResponse.json(
      { error: "Failed to update connection" },
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
    await sql`DELETE FROM process_connections WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete connection:", error);
    return NextResponse.json(
      { error: "Failed to delete connection" },
      { status: 500 }
    );
  }
}
