import { sql } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { id, source_id, target_id, label, source_handle, target_handle } = await req.json();

    const result =
      await sql`INSERT INTO process_connections (id, source_id, target_id, label, source_handle, target_handle)
        VALUES (${id}, ${source_id}, ${target_id}, ${label}, ${source_handle ?? null}, ${target_handle ?? null})
        RETURNING id, source_id, target_id, label, source_handle, target_handle`;

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error("Failed to create connection:", error);
    return NextResponse.json(
      { error: "Failed to create connection" },
      { status: 500 }
    );
  }
}
