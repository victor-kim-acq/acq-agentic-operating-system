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
      SELECT id, mit_id, node_id, created_at
      FROM mit_node_assignments
      WHERE mit_id = ${id}
    `;
    return NextResponse.json(result.rows, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Failed to fetch node assignments:", error);
    return NextResponse.json(
      { error: "Failed to fetch node assignments" },
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
    const { id, node_id } = await req.json();

    const result = await sql`
      INSERT INTO mit_node_assignments (id, mit_id, node_id)
      VALUES (${id}, ${mitId}, ${node_id})
      RETURNING id, mit_id, node_id, created_at
    `;

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Failed to assign node:", error);
    return NextResponse.json(
      { error: "Failed to assign node" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const mitId = params.id;
    const { node_id } = await req.json();

    await sql`
      DELETE FROM mit_node_assignments
      WHERE mit_id = ${mitId} AND node_id = ${node_id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to unassign node:", error);
    return NextResponse.json(
      { error: "Failed to unassign node" },
      { status: 500 }
    );
  }
}
