import { sql } from "@/lib/db";

interface TableComment {
  table_name: string;
  description: string;
}

interface ColumnComment {
  table_name: string;
  column_name: string;
  data_type: string;
  description: string;
}

export async function getSchemaContext(): Promise<string> {
  const [tableRes, columnRes] = await Promise.all([
    sql`
      SELECT c.relname AS table_name, d.description
      FROM pg_class c
      JOIN pg_description d ON d.objoid = c.oid AND d.objsubid = 0
      JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
      ORDER BY c.relname
    `,
    sql`
      SELECT c.table_name, c.column_name, c.data_type, pgd.description
      FROM information_schema.columns c
      JOIN pg_catalog.pg_description pgd
        ON pgd.objsubid = c.ordinal_position
        AND pgd.objoid = (
          SELECT oid FROM pg_class
          WHERE relname = c.table_name
            AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        )
      WHERE c.table_schema = 'public'
        AND pgd.description IS NOT NULL
      ORDER BY c.table_name, c.ordinal_position
    `,
  ]);

  const tables = tableRes.rows as TableComment[];
  const columns = columnRes.rows as ColumnComment[];

  // Group columns by table
  const columnsByTable = new Map<string, ColumnComment[]>();
  for (const col of columns) {
    const list = columnsByTable.get(col.table_name) ?? [];
    list.push(col);
    columnsByTable.set(col.table_name, list);
  }

  // Build formatted block
  const lines: string[] = [];
  for (const table of tables) {
    lines.push(`TABLE: ${table.table_name} — ${table.description}`);
    const cols = columnsByTable.get(table.table_name) ?? [];
    for (const col of cols) {
      lines.push(`  ${col.column_name} (${col.data_type}): ${col.description}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
