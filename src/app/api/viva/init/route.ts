import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { INITIALIZE_SCHEMA_SQL, SEED_DATA_SQL } from '@/lib/schema-sql';

export async function POST() {
  try {
    const ddlStatements = INITIALIZE_SCHEMA_SQL.split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const sql of ddlStatements) {
      await query(sql);
    }

    const seedStatements = SEED_DATA_SQL.split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const sql of seedStatements) {
      await query(sql);
    }

    return NextResponse.json({
      success: true,
      message: 'Schema tables, views, and seed data initialized successfully!',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
