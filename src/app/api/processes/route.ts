import { sql } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const [processes, connections] = await Promise.all([
      sql`SELECT id, name, category, description, position_x, position_y, metadata FROM business_processes`,
      sql`SELECT id, source_id, target_id, label FROM process_connections`,
    ]);

    return NextResponse.json(
      { processes: processes.rows, connections: connections.rows },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Failed to fetch processes:", error);
    return NextResponse.json(
      { error: "Failed to fetch processes" },
      { status: 500 }
    );
  }
}
